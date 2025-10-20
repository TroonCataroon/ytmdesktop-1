import Fastify, { FastifyInstance } from "fastify";
import FastifyIO from "fastify-socket";
import CompanionServerAPIv1 from "./api/v1";
import { MemoryStoreSchema, StoreSchema } from "~shared/store/schema";
import Conf from "conf";
import { BrowserView, safeStorage } from "electron";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { AuthToken } from "~shared/integrations/companion-server/types";
import { RemoteSocket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import cors from "@fastify/cors";
import MemoryStore from "../../memory-store";
import log from "electron-log";
import { isDefinedAPIError, getStandardizedError, InternalServerError } from "./api-shared/errors";
import BaseIntegration from "../base-integration";

export default class CompanionServer extends BaseIntegration {
  private listenIp = "0.0.0.0";
  private listenPort = 9863;
  private fastifyServer: FastifyInstance;
  private store: Conf<StoreSchema>;
  private memoryStore: MemoryStore<MemoryStoreSchema>;
  private ytmView: BrowserView;
  private storeListener: () => void | null = null;

  private createServer() {
    this.fastifyServer = Fastify().withTypeProvider<TypeBoxTypeProvider>();
    this.fastifyServer.register(cors, {
      origin: this.store.get<"integrations.companionServerCORSWildcardEnabled", boolean>("integrations.companionServerCORSWildcardEnabled", false) ? "*" : false
    });
    this.fastifyServer.register(FastifyIO, {
      transports: ["websocket"],
      allowUpgrades: false,
      // While this is websocket only we still apply cors just in case
      cors: {
        origin: this.store.get<"integrations.companionServerCORSWildcardEnabled", boolean>("integrations.companionServerCORSWildcardEnabled", false)
          ? "*"
          : false
      }
    });
    this.fastifyServer.register(CompanionServerAPIv1, {
      prefix: "/api/v1",
      getYtmView: () => {
        return this.ytmView;
      },
      getStore: () => {
        return this.store;
      },
      getMemoryStore: () => {
        return this.memoryStore;
      }
    });

    // Enhanced error handler with better categorization and logging
    this.fastifyServer.setErrorHandler((error, request, reply) => {
      try {
        if (isDefinedAPIError(error)) {
          // Already a known API error, just pass it through
          log.debug(`API error occurred: ${error.code} - ${error.message}`);
          reply.status(error.statusCode).send(error);
          return;
        }

        // Handle common system-level errors
        if (error.code === "EADDRINUSE") {
          log.error(`Server address in use (port ${this.listenPort}):`, error);
          reply.status(503).send(new InternalServerError(`Server cannot bind to port ${this.listenPort}`));
          return;
        }

        // Get a standardized error for unknown error types
        const standardizedError = getStandardizedError(error);

        // Only log detailed errors for server errors
        if (standardizedError.statusCode >= 500) {
          log.error(`Server error in companion server:`, error);
        } else {
          log.debug(`Client error in companion server: ${standardizedError.code} - ${standardizedError.message}`);
        }

        reply.status(standardizedError.statusCode).send(standardizedError);
      } catch (handlerError) {
        // If error handling itself fails, return a generic error
        log.error("Error in error handler:", handlerError);
        reply.status(500).send(new InternalServerError("An unexpected error occurred"));
      }
    });

    this.fastifyServer.get("/metadata", (request, reply) => {
      reply.send({
        apiVersions: ["v1"]
      });
    });

    // Setup compatibility namespaces for third-party widgets (e.g., 6K Labs)
    this.fastifyServer.ready().then(() => {
      this.setupCompatibilityNamespaces();
    });
  }

  public provide(store: Conf<StoreSchema>, memoryStore: MemoryStore<MemoryStoreSchema>, ytmView: BrowserView): void {
    this.store = store;
    this.memoryStore = memoryStore;
    this.ytmView = ytmView;
  }

  public async enable() {
    if (this.isEnabled) {
      return;
    }

    this.isEnabled = true;

    if (!this.memoryStore.get("safeStorageAvailable")) {
      log.info("Safe Storage not available for Companion Server Integration, using insecure storage instead");
      this.memoryStore.set("companionServerUsingInsecureStorage", true);
    } else {
      this.memoryStore.set("companionServerUsingInsecureStorage", false);
    }

    if (!this.fastifyServer || (this.fastifyServer && !this.fastifyServer.server.listening)) {
      try {
        this.createServer();
        await this.fastifyServer.listen({
          host: this.listenIp,
          port: this.listenPort
        });

        // Register store listener using our base class helper for automatic cleanup
        this.registerStoreListener();

        log.info(`Companion server listening on ${this.listenIp}:${this.listenPort}`);
      } catch (error) {
        log.error("Failed to start companion server:", error);
        this.isEnabled = false;
      }
    }
  }

  private registerStoreListener() {
    this.storeListener = this.store.onDidChange("integrations", async newState => {
      try {
        let validTokenIds: string[] = [];

        if (newState.companionServerAuthTokens) {
          try {
            if (this.memoryStore.get("safeStorageAvailable")) {
              validTokenIds = JSON.parse(safeStorage.decryptString(Buffer.from(newState.companionServerAuthTokens, "hex"))).map(
                (authToken: AuthToken) => authToken.id
              );
            } else {
              // Use the tokens directly without decryption
              validTokenIds = JSON.parse(newState.companionServerAuthTokens).map((authToken: AuthToken) => authToken.id);
            }
          } catch (error) {
            log.error(`Failed to parse companion server auth tokens: ${error.message || "Unknown error"}`);
          }
        }

        if (this.fastifyServer?.server.listening) {
          const namespaces = this.fastifyServer.io._nsps.keys();
          let sockets: RemoteSocket<DefaultEventsMap, { tokenId: string }>[] = [];

          for (const namespace of namespaces) {
            const namespacedSockets = await this.fastifyServer.io.of(namespace).fetchSockets();
            sockets = sockets.concat(namespacedSockets);
          }

          for (const socket of sockets) {
            if (!validTokenIds.includes(socket.data.tokenId)) {
              socket.disconnect(true);
            }
          }
        }
      } catch (error) {
        log.error("Error in store listener:", error);
      }
    });
  }

  public override async disable() {
    if (!this.isEnabled) {
      return;
    }

    if (this.fastifyServer) {
      try {
        await this.fastifyServer.close();
        log.info("Companion server stopped");
      } catch (error) {
        log.error("Error closing companion server:", error);
      }
    }

    if (this.storeListener) {
      this.storeListener();
      this.storeListener = null;
    }

    // Call the base class implementation to handle common cleanup
    super.disable();
  }

  public getYTMScripts(): { name: string; script: string }[] {
    return [];
  }

  /**
   * Compatibility Namespaces
   * Adds minimal Socket.IO endpoints expected by some external widgets.
   * We implement a simple joinRoom protocol and broadcast player updates.
   */
  private setupCompatibilityNamespaces(): void {
    try {
      const io = this.fastifyServer.io;

      // Generic helper to attach a namespace with joinRoom handling
      const attachNamespace = (ns: string) => {
        const nsp = io.of(ns);
        nsp.on("connection", socket => {
          // Simple room join based on provided room/token id
          socket.on("joinRoom", (roomId: string) => {
            try {
              socket.data.tokenId = roomId;
              socket.join(roomId);
              // Immediately push a settings update event if listeners expect it
              // (Observed from 6K Labs widget code: "update user widget settings in database")
              nsp.to(roomId).emit("update user widget settings in database", { joined: true, namespace: ns });
            } catch {
              // ignore malformatted join
            }
          });
        });
      };

      // Observed path in bundled assets for Spotify was '/spotify/socket.io';
      // We mirror both youtube and spotify namespaces for compatibility.
      attachNamespace("/youtube");
      attachNamespace("/spotify");

      // Forward lightweight player state as a generic event many widgets can consume
      // We avoid heavy/spam by throttling via memoryStore (optional future improvement)
      try {
        const forwardUpdate = (state: unknown) => {
          const s = state as
            | {
                videoDetails?: { title?: string; author?: string; durationSeconds?: number; thumbnails?: Array<{ url?: string }> };
                videoProgress?: number;
                trackState?: number;
              }
            | undefined;
          if (!s || !s.videoDetails) return;
          const payload: { title?: string; artist?: string; duration: number; progress: number; cover_url: string | null; is_playing: boolean } = {
            title: s.videoDetails?.title,
            artist: s.videoDetails?.author,
            duration: s.videoDetails?.durationSeconds ?? 0,
            progress: s.videoProgress ?? 0,
            cover_url:
              Array.isArray(s.videoDetails?.thumbnails) && (s.videoDetails?.thumbnails?.length ?? 0) > 0
                ? (s.videoDetails!.thumbnails![s.videoDetails!.thumbnails!.length - 1]!.url ?? null)
                : null,
            is_playing: s.trackState === 1 // VideoState.Playing
          };
          this.fastifyServer.io.of("/youtube").emit("player:update", payload);
        };
        // Defer dynamic import to avoid cyclic deps
        import("../../player-state-store/index.js")
          .then(mod => {
            const store = mod as unknown as {
              default?: { addEventListener?: (cb: (s: unknown) => void) => void };
              addEventListener?: (cb: (s: unknown) => void) => void;
            };
            const api = (store && (store.default ?? store)) as { addEventListener?: (cb: (s: unknown) => void) => void };
            if (api && typeof api.addEventListener === "function") {
              api.addEventListener(forwardUpdate);
            }
          })
          .catch((): void => {
            /* noop */
          });
      } catch {
        // best-effort only
      }
    } catch {
      // Ignore setup failures; server remains functional without compatibility layer
    }
  }
}
