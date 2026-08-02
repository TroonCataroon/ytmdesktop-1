import { app, BrowserWindow, globalShortcut, ipcMain, screen } from "electron";
import path from "path";
import playerStateStore, { PlayerState, VideoState } from "../../../../player-state-store";
import { attachToDesktop } from "../../../../windows/wallpaper";
import { BasePlugin, PluginSettings } from "../../base-plugin";
import { pluginManager } from "../../index";

interface VinylPlayerWindow {
  window: BrowserWindow;
  isVisible: boolean;
}

interface TrackInfo {
  title: string;
  artist: string;
  thumbnail: string;
  isPlaying: boolean;
  spinSpeed: number;
  durationSeconds?: number;
  progressSeconds?: number;
}

export class VinylPlayerPlugin extends BasePlugin {
  private static readonly REMAKE_DEFAULT_WIDTH = 922;
  private static readonly REMAKE_DEFAULT_HEIGHT = 282;
  private static readonly REMAKE_ASPECT = VinylPlayerPlugin.REMAKE_DEFAULT_WIDTH / VinylPlayerPlugin.REMAKE_DEFAULT_HEIGHT;

  private static readonly WORKSHOP_DEFAULT_WIDTH = 600;
  private static readonly WORKSHOP_DEFAULT_HEIGHT = 480;
  private static readonly WORKSHOP_ASPECT = VinylPlayerPlugin.WORKSHOP_DEFAULT_WIDTH / VinylPlayerPlugin.WORKSHOP_DEFAULT_HEIGHT;

  private vinylWindow: VinylPlayerWindow | null = null;
  private isPlaying = false;
  private currentTrack: TrackInfo | null = null;
  private initialized = false;
  private playerStateListener: ((state: PlayerState) => void) | null = null;
  private showOnStartupTimeout: ReturnType<typeof setTimeout> | null = null;
  private vinylCspSession: Electron.Session | null = null;
  private last6KOverlayState = { enabled: false, playing: false };

  constructor() {
    super({
      id: "vinyl-player",
      name: "Vinyl Player",
      description: "Mini pop-out player with spinning vinyl record",
      version: "1.0.0",
      author: "YTMDesktop Team",
      enabled: false,
      settings: {
        windowSize: 200,
        alwaysOnTop: true,
        autoShow: false,
        spinSpeed: 2,
        showControls: true,
        opacity: 0.9,
        widgetMode: "workshop", // 'custom' | 'remake' | 'workshop' | '6klabs'
        use6KLabsWidget: false, // Legacy toggle (kept for backward compatibility); prefer widgetMode
        enableBoundaryCollision: true, // Prevent window from going off-screen
        enableBoundaryMagnetism: true, // Snap to screen edges
        magnetismThreshold: 20, // Pixels from edge to trigger magnetism
        enableResizing: true, // Allow window resizing
        showOnStartup: false, // Show window when app starts (if plugin is enabled)
        enableButtonFeature: true, // Click vinyl / overlay to control playback
        wallpaperMode: false, // Fullscreen desktop mode
        // Persistent window state (saved automatically)
        savedWindowX: undefined,
        savedWindowY: undefined,
        savedWindowWidth: undefined,
        savedWindowHeight: undefined,
        wasVisibleOnClose: false
      }
    });

    // Initialize with default track
    this.currentTrack = {
      title: "No track playing",
      artist: "Unknown Artist",
      thumbnail: "",
      isPlaying: false,
      spinSpeed: 1,
      durationSeconds: 0,
      progressSeconds: 0
    };
  }

  onEnable(): void {
    // Guard: PluginManager can enable plugins before Electron is ready in dev.
    // `screen` (used by createVinylWindow) cannot be accessed before `app.ready`.
    if (this.initialized) return;
    this.initialized = true;

    void app.whenReady().then(() => {
      this.createVinylWindow();
      this.setupPlayerStateListener();
      this.setupIpcHandlers();

      // Show window on startup if configured or if it was visible when app closed
      const showOnStartup = this.settings.showOnStartup as boolean;
      const wasVisible = this.settings.wasVisibleOnClose as boolean;

      if (showOnStartup || wasVisible) {
        // Small delay to ensure player state is loaded
        if (this.showOnStartupTimeout) {
          clearTimeout(this.showOnStartupTimeout);
        }
        this.showOnStartupTimeout = setTimeout(() => {
          this.showOnStartupTimeout = null;
          this.showVinylWindow();
        }, 1000);
      }
    });
  }

  onDisable(): void {
    if (this.showOnStartupTimeout) {
      clearTimeout(this.showOnStartupTimeout);
      this.showOnStartupTimeout = null;
    }
    if (this.playerStateListener) {
      playerStateStore.removeEventListener(this.playerStateListener);
      this.playerStateListener = null;
    }
    this.unregisterKeyboardShortcuts();
    // Save window state before destroying
    this.saveWindowState();
    this.destroyVinylWindow();
    this.cleanupIpcHandlers();
    this.initialized = false;
  }

  updateSettings(newSettings: Record<string, unknown>): void {
    const requestedMode = newSettings.widgetMode;
    const normalizedSettings =
      requestedMode === undefined || requestedMode === "custom" || requestedMode === "remake" || requestedMode === "workshop" || requestedMode === "6klabs"
        ? newSettings
        : { ...newSettings, widgetMode: "workshop" };
    super.updateSettings(normalizedSettings);
  }

  onSettingsChanged(newSettings: Record<string, unknown>, previousSettings: Record<string, unknown>): void {
    if (!this.initialized) return;

    // If switching between 6K Labs widget and custom vinyl player, or resizing setting changed, recreate window
    if (
      newSettings.widgetMode !== previousSettings.widgetMode ||
      newSettings.use6KLabsWidget !== previousSettings.use6KLabsWidget ||
      newSettings.enableResizing !== previousSettings.enableResizing ||
      newSettings.wallpaperMode !== previousSettings.wallpaperMode
    ) {
      const wasVisible = this.vinylWindow?.isVisible ?? false;

      this.destroyVinylWindow();
      this.createVinylWindow();

      if (wasVisible) {
        this.showVinylWindow();
      }
      return;
    }

    if (this.vinylWindow?.window) {
      const window = this.vinylWindow.window;
      const nextWidgetMode =
        typeof newSettings.widgetMode === "string"
          ? String(newSettings.widgetMode)
          : typeof this.settings.widgetMode === "string"
            ? String(this.settings.widgetMode)
            : this.settings.use6KLabsWidget
              ? "6klabs"
              : "workshop";

      const isRemake = nextWidgetMode === "remake";
      const isWorkshop = nextWidgetMode === "workshop";
      const nextUse6KLabs = nextWidgetMode === "6klabs";

      if (newSettings.alwaysOnTop !== previousSettings.alwaysOnTop) {
        window.setAlwaysOnTop(newSettings.alwaysOnTop as boolean);
      }

      if (newSettings.opacity !== previousSettings.opacity) {
        window.setOpacity(newSettings.opacity as number);
      }

      if (newSettings.windowSize !== previousSettings.windowSize && (nextWidgetMode === "custom" || isRemake || isWorkshop)) {
        const size = Number(newSettings.windowSize as number);
        const enableResizing = newSettings.enableResizing as boolean;
        if (isRemake) {
          // Reuse the existing slider but apply it as the REMAKE HEIGHT, keeping the screenshot aspect ratio.
          // This makes the remake widget scale nicely without inventing new UI controls.
          const height = Math.max(160, Math.min(size, 800));
          const width = Math.round(height * VinylPlayerPlugin.REMAKE_ASPECT);
          window.setSize(width, height);
        } else if (isWorkshop) {
          const height = Math.max(240, Math.min(size * 1.5, 800));
          const width = Math.round(height * VinylPlayerPlugin.WORKSHOP_ASPECT);
          window.setSize(width, height);
        } else {
          window.setSize(size, size);
        }
        if (enableResizing) {
          window.setMinimumSize(160, 160);
          window.setMaximumSize(0, 0); // 0,0 means no max
        } else {
          if (isRemake) {
            const height = Math.max(160, Math.min(size, 800));
            const width = Math.round(height * VinylPlayerPlugin.REMAKE_ASPECT);
            window.setMinimumSize(width, height);
            window.setMaximumSize(width, height);
          } else if (isWorkshop) {
            const height = Math.max(240, Math.min(size * 1.5, 800));
            const width = Math.round(height * VinylPlayerPlugin.WORKSHOP_ASPECT);
            window.setMinimumSize(width, height);
            window.setMaximumSize(width, height);
          } else {
            window.setMinimumSize(size, size);
            window.setMaximumSize(size, size);
          }
        }
      }

      // Send updated settings to the local vinyl player modes.
      if (nextWidgetMode === "custom" || nextWidgetMode === "remake" || nextWidgetMode === "workshop") {
        if (!nextUse6KLabs) {
          window.webContents.send("vinyl-player:update-settings", {
            showControls: newSettings.showControls !== undefined ? newSettings.showControls : this.settings.showControls,
            enableButtonFeature: newSettings.enableButtonFeature !== undefined ? newSettings.enableButtonFeature : this.settings.enableButtonFeature,
            scale:
              newSettings.windowSize !== undefined
                ? Number(newSettings.windowSize) / 200
                : this.settings.windowSize
                  ? Number(this.settings.windowSize) / 200
                  : 1
          });
        } else if (newSettings.enableButtonFeature !== undefined) {
          this.sync6KOverlayState(true);
        }
      }
    }
  }

  private getYtmViewWebContents(): Electron.WebContents | null {
    const all = BrowserWindow.getAllWindows();
    for (const win of all) {
      const getViews = (win as unknown as { getBrowserViews?: () => Array<{ webContents: Electron.WebContents }> }).getBrowserViews;
      if (typeof getViews !== "function") continue;
      const views = getViews.call(win) || [];
      for (const view of views) {
        try {
          const url = view.webContents.getURL();
          if (url && url.startsWith("https://music.youtube.com/")) {
            return view.webContents;
          }
        } catch {
          // ignore
        }
      }
    }
    return null;
  }

  private getMainWindowWebContentsFallback(): Electron.WebContents | null {
    const all = BrowserWindow.getAllWindows();
    const mainWindow =
      all.find(w => w.getTitle().includes("YouTube Music")) ??
      all.find(w => w.getTitle().toLowerCase().includes("youtube")) ??
      BrowserWindow.getFocusedWindow();
    return mainWindow?.webContents ?? null;
  }

  private isTrustedVinylSender(event: Electron.IpcMainEvent): boolean {
    const sender = event.sender;
    const vinylSender = this.vinylWindow?.window.webContents;
    return sender === vinylSender || sender === this.getYtmViewWebContents();
  }

  private async refreshFromYtmViewSnapshot(): Promise<void> {
    const wc = this.getYtmViewWebContents();
    if (!wc || wc.isDestroyed()) return;

    try {
      const snapshot = (await wc.executeJavaScript(
        `
        (function() {
          try {
            const bar = document.querySelector('ytmusic-app-layout>ytmusic-player-bar');
            const api = bar && bar.playerApi ? bar.playerApi : null;
            const playing = Boolean(bar && bar.playing);

            let details = null;
            try {
              details = api && typeof api.getPlayerResponse === 'function'
                ? (api.getPlayerResponse() && api.getPlayerResponse().videoDetails ? api.getPlayerResponse().videoDetails : null)
                : null;
            } catch {}

            // Fallback: use document title if details are unavailable
            const docTitle = String(document.title || '');

            return {
              playing,
              title: details && details.title ? String(details.title) : '',
              author: details && details.author ? String(details.author) : '',
              thumbnails: details && details.thumbnail && details.thumbnail.thumbnails ? details.thumbnail.thumbnails : [],
              docTitle
            };
          } catch (e) {
            return { playing: false, title: '', author: '', thumbnails: [], docTitle: String(document.title || ''), error: String(e) };
          }
        })()
      `
      )) as {
        playing?: boolean;
        title?: string;
        author?: string;
        thumbnails?: unknown[];
        docTitle?: string;
      };

      const title = (snapshot.title || "").trim();
      const author = (snapshot.author || "").trim();
      const thumbnails = Array.isArray(snapshot.thumbnails) ? snapshot.thumbnails : [];
      const playing = Boolean(snapshot.playing);

      // Only apply snapshot if it looks like real data (avoid clobbering with empties)
      if (title || author || thumbnails.length > 0) {
        this.currentTrack = {
          title: title || this.currentTrack?.title || "No track playing",
          artist: author || this.currentTrack?.artist || "",
          thumbnail: this.getBestThumbnail(thumbnails),
          isPlaying: playing,
          spinSpeed: Number(this.settings.spinSpeed ?? 1)
        };
        this.isPlaying = playing;
        this.updateVinylDisplay();
      }
    } catch {
      // ignore snapshot failures
    }
  }

  private setupIpcHandlers(): void {
    // Handle toggle window request from player bar
    ipcMain.on("vinyl-player:toggle-window", event => {
      if (!this.isTrustedVinylSender(event)) return;
      this.toggleWindow();
    });

    // Handle play/pause from vinyl player window
    ipcMain.on("vinyl-player:play-pause", event => {
      if (!this.isTrustedVinylSender(event)) return;
      const target = this.getYtmViewWebContents() ?? this.getMainWindowWebContentsFallback();

      if (target) {
        try {
          target.send("remoteControl:execute", "playPause");
        } catch {
          // ignore
        }
      }
    });

    ipcMain.on("vinyl-player:next", event => {
      if (!this.isTrustedVinylSender(event)) return;
      const target = this.getYtmViewWebContents() ?? this.getMainWindowWebContentsFallback();
      if (target) {
        try {
          target.send("remoteControl:execute", "next");
        } catch {
          // ignore
        }
      }
    });

    ipcMain.on("vinyl-player:previous", event => {
      if (!this.isTrustedVinylSender(event)) return;
      const target = this.getYtmViewWebContents() ?? this.getMainWindowWebContentsFallback();
      if (target) {
        try {
          target.send("remoteControl:execute", "previous");
        } catch {
          // ignore
        }
      }
    });

    ipcMain.on("vinyl-player:seek", (event, time) => {
      if (!this.isTrustedVinylSender(event)) return;
      const normalizedTime = Number(time);
      if (!Number.isFinite(normalizedTime) || normalizedTime < 0) return;
      const target = this.getYtmViewWebContents() ?? this.getMainWindowWebContentsFallback();
      if (target) {
        try {
          target.send("remoteControl:execute", "seekTo", normalizedTime);
        } catch {
          // ignore
        }
      }
    });

    ipcMain.on("vinyl-player:set-volume", (event, volume) => {
      if (!this.isTrustedVinylSender(event)) return;
      const normalizedVolume = Number(volume);
      if (!Number.isFinite(normalizedVolume)) return;
      const target = this.getYtmViewWebContents() ?? this.getMainWindowWebContentsFallback();
      if (target) {
        try {
          target.send("remoteControl:execute", "setVolume", Math.max(0, Math.min(100, normalizedVolume)));
        } catch {
          // ignore
        }
      }
    });

    // Handle close from vinyl player window
    ipcMain.on("vinyl-player:close", event => {
      if (!this.isTrustedVinylSender(event)) return;
      this.hideVinylWindow();
    });

    // Handle keyboard shortcuts
    ipcMain.on("vinyl-player:register-shortcuts", () => {
      this.registerKeyboardShortcuts();
    });

    ipcMain.on("vinyl-player:unregister-shortcuts", () => {
      this.unregisterKeyboardShortcuts();
    });
  }

  private cleanupIpcHandlers(): void {
    ipcMain.removeAllListeners("vinyl-player:toggle-window");
    ipcMain.removeAllListeners("vinyl-player:play-pause");
    ipcMain.removeAllListeners("vinyl-player:next");
    ipcMain.removeAllListeners("vinyl-player:previous");
    ipcMain.removeAllListeners("vinyl-player:seek");
    ipcMain.removeAllListeners("vinyl-player:set-volume");
    ipcMain.removeAllListeners("vinyl-player:close");
    ipcMain.removeAllListeners("vinyl-player:register-shortcuts");
    ipcMain.removeAllListeners("vinyl-player:unregister-shortcuts");
  }

  private registerKeyboardShortcuts(): void {
    // Register global shortcuts for vinyl player
    globalShortcut.register("Alt+V", () => {
      this.toggleWindow();
    });

    globalShortcut.register("Alt+Shift+V", () => {
      this.showVinylWindow();
    });
  }

  private unregisterKeyboardShortcuts(): void {
    globalShortcut.unregister("Alt+V");
    globalShortcut.unregister("Alt+Shift+V");
  }

  private createVinylWindow(): void {
    if (this.vinylWindow) {
      return;
    }

    const use6KLabs = this.settings.use6KLabsWidget as boolean;
    const enableResizing = this.settings.enableResizing as boolean;
    const wallpaperMode = this.settings.wallpaperMode as boolean;
    const rawWidgetMode = this.settings.widgetMode;
    const widgetMode =
      rawWidgetMode === "custom" || rawWidgetMode === "remake" || rawWidgetMode === "workshop" || rawWidgetMode === "6klabs"
        ? rawWidgetMode
        : use6KLabs
          ? "6klabs"
          : "workshop";
    const use6K = widgetMode === "6klabs";
    const useRemake = widgetMode === "remake";
    const useWorkshop = widgetMode === "workshop";

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;

    const size = use6K ? 800 : (this.settings.windowSize as number); // Larger size for 6K Labs widget

    // Restore saved window position and size if available
    const savedX = this.settings.savedWindowX as number | undefined;
    const savedY = this.settings.savedWindowY as number | undefined;
    const savedWidth = this.settings.savedWindowWidth as number | undefined;
    const savedHeight = this.settings.savedWindowHeight as number | undefined;

    const desiredSquareSize = Number(this.settings.windowSize as number);
    const remakeHeight = Math.max(160, Math.min(desiredSquareSize || VinylPlayerPlugin.REMAKE_DEFAULT_HEIGHT, 800));
    const remakeWidth = Math.round(remakeHeight * VinylPlayerPlugin.REMAKE_ASPECT);

    const workshopHeight = Math.max(240, Math.min((desiredSquareSize || 300) * 1.5, 800));
    const workshopWidth = Math.round(workshopHeight * VinylPlayerPlugin.WORKSHOP_ASPECT);

    let width = savedWidth || (useRemake ? remakeWidth : useWorkshop ? workshopWidth : size);
    let height = savedHeight || (use6K ? 200 : useRemake ? remakeHeight : useWorkshop ? workshopHeight : size);
    let x = savedX;
    let y = savedY;

    if (wallpaperMode) {
      width = screenW;
      height = screenH;
      x = 0;
      y = 0;
    }

    const browserWindowOptions: Electron.BrowserWindowConstructorOptions = {
      width,
      height,
      x,
      y,
      minWidth: use6K ? 400 : enableResizing ? 160 : size,
      minHeight: use6K ? 100 : enableResizing ? 160 : size,
      maxWidth: use6K || enableResizing || useRemake || useWorkshop || wallpaperMode ? undefined : size, // Allow resizing if enabled
      maxHeight: use6K || enableResizing || useRemake || useWorkshop || wallpaperMode ? undefined : size,
      frame: false,
      transparent: true,
      alwaysOnTop: wallpaperMode ? false : (this.settings.alwaysOnTop as boolean),
      resizable: !wallpaperMode && (use6K || useRemake || useWorkshop || enableResizing), // Allow resizing based on setting
      skipTaskbar: wallpaperMode,
      show: false,
      title: use6K ? "6K Labs Widget" : useRemake ? "Remake Widget" : useWorkshop ? "Workshop Widget" : "Vinyl Player",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: app.isPackaged
          ? path.join(process.resourcesPath, "vinyl-player-preload.js")
          : path.join(process.cwd(), "src/main/integrations/plugins/builtin/vinyl-player/vinyl-player-preload.js")
      }
    };

    // Set position if saved (validate it's on-screen) - SKIP if wallpaper mode
    if (!wallpaperMode && savedX !== undefined && savedY !== undefined) {
      const display = screen.getDisplayNearestPoint({ x: savedX, y: savedY });
      if (display) {
        browserWindowOptions.x = savedX;
        browserWindowOptions.y = savedY;
      }
    }

    this.vinylWindow = {
      window: new BrowserWindow(browserWindowOptions),
      isVisible: false
    };

    const window = this.vinylWindow.window;

    if (wallpaperMode && process.platform === "win32") {
      // Attach to desktop on Windows

      attachToDesktop(window).catch(err => {
        console.error("Failed to attach vinyl player to desktop:", err);
      });
    }

    this.vinylCspSession = window.webContents.session;

    if (use6K) {
      // For 6K Labs widget, load external URL with permissive CSP
      window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              "default-src *; " +
                "script-src * 'unsafe-inline' 'unsafe-eval'; " +
                "style-src * 'unsafe-inline'; " +
                "img-src * data: blob: http: https:; " +
                "font-src * data:; " +
                "connect-src * ws: wss:; " +
                "frame-src *; " +
                "media-src *;"
            ]
          }
        });
      });

      // Get 6K Labs widget URL from the plugin
      const sixKLabsPlugin = pluginManager.getPlugin("6klabs-widget");
      if (sixKLabsPlugin && "getWidgetUrl" in sixKLabsPlugin) {
        const widgetUrl = (sixKLabsPlugin as { getWidgetUrl: () => string }).getWidgetUrl();

        if (widgetUrl && !widgetUrl.includes("⚠️")) {
          window.loadURL(widgetUrl);
        } else {
          console.warn("6K Labs widget token not set. Please configure in plugin settings.");
          // Load a blank page with instructions
          window.loadURL(
            "data:text/html," +
              encodeURIComponent(`
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body {
                    margin: 0;
                    padding: 20px;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    font-family: system-ui;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    text-align: center;
                  }
                  .message {
                    max-width: 400px;
                  }
                  h2 {
                    color: #4caf50;
                  }
                </style>
              </head>
              <body>
                <div class="message">
                  <h2>⚠️ Configuration Required</h2>
                  <p>Please enter your 6K Labs widget token in the plugin settings.</p>
                  <p>Go to Settings → Plugins → 6K Labs Widget</p>
                </div>
              </body>
            </html>
          `)
          );
        }
      }
    } else {
      // Original vinyl player CSP
      window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: blob: http://localhost:* https://*.ytimg.com https://*.youtube.com https://*.googleusercontent.com; " +
                "font-src 'self' data:; " +
                "connect-src 'self';"
            ]
          }
        });
      });

      // Load the local HTML (custom, remake, or workshop with user-provided assets)
      const localHtmlFile = useWorkshop ? "vinyl-workshop.html" : useRemake ? "vinyl-remake.html" : "vinyl-player.html";
      const htmlPath = app.isPackaged
        ? path.join(process.resourcesPath, localHtmlFile)
        : path.join(process.cwd(), `src/main/integrations/plugins/builtin/vinyl-player/${localHtmlFile}`);
      window.loadFile(htmlPath);
    }

    // Handle window events
    window.on("closed", () => {
      this.saveWindowState();
      this.vinylWindow = null;
    });

    window.on("blur", () => {
      if (!this.settings.alwaysOnTop) {
        window.hide();
      }
    });

    // Save window position when moved
    window.on("moved", () => {
      this.saveWindowState();
    });

    // Save window size when resized and constrain to screen bounds
    window.on("resized", () => {
      this.constrainWindowToScreen(window);
      this.saveWindowState();
    });

    // Make window draggable anywhere (not just title bar)
    window.setMovable(true);

    // Enable dragging from anywhere on the window using CSS
    // The window can be dragged by clicking and dragging anywhere
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let lastMousePos = { x: 0, y: 0 };
    let dragInterval: ReturnType<typeof setInterval> | null = null;

    const stopDragTracking = (): void => {
      if (dragInterval) {
        clearInterval(dragInterval);
        dragInterval = null;
      }
    };

    const startDragTracking = (): void => {
      if (dragInterval) return;
      lastMousePos = screen.getCursorScreenPoint();
      dragInterval = setInterval(() => {
        if (isDragging && window && !window.isDestroyed()) {
          const cursor = screen.getCursorScreenPoint();
          if (cursor.x !== lastMousePos.x || cursor.y !== lastMousePos.y) {
            lastMousePos = cursor;
            handleWindowMove(cursor);
          }
        }
      }, 16);
    };

    // Listen for drag start/end from renderer
    ipcMain.on("vinyl-player:drag-start", () => {
      const [x, y] = window.getPosition();
      const cursor = screen.getCursorScreenPoint();
      dragOffset = {
        x: cursor.x - x,
        y: cursor.y - y
      };
      isDragging = true;
      startDragTracking();
    });

    ipcMain.on("vinyl-player:drag-end", () => {
      isDragging = false;
      stopDragTracking();
    });

    // Handle window movement with magnetism and collision
    const handleWindowMove = (cursor: { x: number; y: number }) => {
      if (!isDragging || !this.vinylWindow?.window) return;

      let newX = cursor.x - dragOffset.x;
      let newY = cursor.y - dragOffset.y;

      const bounds = window.getBounds();
      const display = screen.getDisplayNearestPoint({ x: newX, y: newY });
      const workArea = display.workArea;

      const enableBoundaryCollision = this.settings.enableBoundaryCollision as boolean;
      const enableBoundaryMagnetism = this.settings.enableBoundaryMagnetism as boolean;
      const magnetismThreshold = (this.settings.magnetismThreshold as number) || 20;

      // Apply boundary magnetism (snap to edges)
      if (enableBoundaryMagnetism) {
        // Left edge
        if (Math.abs(newX - workArea.x) < magnetismThreshold) {
          newX = workArea.x;
        }
        // Right edge
        if (Math.abs(newX + bounds.width - (workArea.x + workArea.width)) < magnetismThreshold) {
          newX = workArea.x + workArea.width - bounds.width;
        }
        // Top edge
        if (Math.abs(newY - workArea.y) < magnetismThreshold) {
          newY = workArea.y;
        }
        // Bottom edge
        if (Math.abs(newY + bounds.height - (workArea.y + workArea.height)) < magnetismThreshold) {
          newY = workArea.y + workArea.height - bounds.height;
        }
      }

      // Apply boundary collision (prevent going off-screen)
      if (enableBoundaryCollision) {
        newX = Math.max(workArea.x, Math.min(newX, workArea.x + workArea.width - bounds.width));
        newY = Math.max(workArea.y, Math.min(newY, workArea.y + workArea.height - bounds.height));
      }

      window.setPosition(Math.floor(newX), Math.floor(newY), false);
    };

    // Clean up intervals when window is closed
    window.on("closed", () => {
      stopDragTracking();
      ipcMain.removeAllListeners("vinyl-player:drag-start");
      ipcMain.removeAllListeners("vinyl-player:drag-end");
    });

    // Set initial window opacity
    window.setOpacity(this.settings.opacity as number);

    // Send initial settings to the vinyl player window once it's ready (custom player only)
    window.webContents.on("did-finish-load", () => {
      if (!use6K) {
        this.sendVinylSettingsToWindow();

        // Get current player state and update vinyl display
        const currentState = playerStateStore.getState();
        if (currentState && currentState.videoDetails) {
          this.updatePlayerState(currentState);
        } else {
          // Fill from the ytmview (it often has last-loaded track before store metadata arrives)
          void this.refreshFromYtmViewSnapshot();
          this.updateVinylDisplay();
        }
      } else {
        // Inject window dragging + click-to-toggle overlay + blur clamp for 6K Labs widget
        /* eslint-disable no-useless-escape */
        window.webContents
          .executeJavaScript(
            `
          (function() {
            const ipc = window.electron && window.electron.ipcRenderer ? window.electron.ipcRenderer : null;

            // Use Electron drag regions for stable window movement; overlay is no-drag.
            try {
              document.body.style.webkitAppRegion = 'drag';
              document.body.style.userSelect = 'none';
            } catch {}

            // Click overlay CSS (kept minimal to avoid affecting widget styles)
            try {
              const styleId = 'ytmd-vinyl-click-overlay-style';
              if (!document.getElementById(styleId)) {
                const st = document.createElement('style');
                st.id = styleId;
                st.textContent = \`
                  #ytmd-vinyl-click-overlay {
                    position: fixed;
                    border-radius: 50%;
                    z-index: 2147483647;
                    background: rgba(255, 255, 255, 0);
                    transition: background 120ms ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    -webkit-app-region: no-drag;
                  }
                  #ytmd-vinyl-click-overlay.enabled { cursor: pointer; }
                  #ytmd-vinyl-click-overlay.enabled:hover { background: rgba(255, 255, 255, 0.06); }
                  #ytmd-vinyl-click-overlay .ytmd-icon {
                    width: 54px;
                    height: 54px;
                    border-radius: 999px;
                    background: rgba(0, 0, 0, 0.55);
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 6px 20px rgba(0,0,0,0.45);
                    opacity: 0;
                    transform: scale(0.98);
                    transition: opacity 120ms ease, transform 120ms ease;
                    pointer-events: none;
                  }
                  #ytmd-vinyl-click-overlay .ytmd-icon svg {
                    width: 22px;
                    height: 22px;
                    fill: rgba(255, 255, 255, 0.92);
                  }
                  #ytmd-vinyl-click-overlay.enabled:hover .ytmd-icon { opacity: 1; transform: scale(1); }
                  #ytmd-vinyl-click-overlay.active .ytmd-icon { opacity: 1; transform: scale(0.98); }
                \`;
                document.head.appendChild(st);
              }
            } catch {}

            var state = (window.__YTMD_VINYL_OVERLAY__ = window.__YTMD_VINYL_OVERLAY__ || {});
            let enabled = ${this.settings.enableButtonFeature !== false};
            let playing = ${Boolean(this.isPlaying)};
            let overlay = null;
            let icon = null;
            let lastTarget = null;
            let lastTargetRect = null;
            let overlayInterval = null;
            const MULTI_CLICK_WINDOW_MS = 350;
            let clickCount = 0;
            let clickTimer = null;

            const flushClicks = () => {
              const n = clickCount;
              clickCount = 0;
              if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
              }
              if (!enabled) return;
              if (!ipc || !ipc.send) return;

              if (n === 1) ipc.send('vinyl-player:play-pause');
              else if (n === 2) ipc.send('vinyl-player:next');
              else if (n >= 3) ipc.send('vinyl-player:previous');
            };

            const clamp01 = (n) => Math.max(0, Math.min(1, n));
            const isVisible = (el) => {
              if (!el) return false;
              const rect = el.getBoundingClientRect();
              if (rect.width < 40 || rect.height < 40) return false;
              if (rect.bottom < 0 || rect.right < 0) return false;
              if (rect.top > window.innerHeight || rect.left > window.innerWidth) return false;
              const cs = window.getComputedStyle(el);
              if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || '1') === 0) return false;
              return true;
            };

            const approxCircleScore = (el) => {
              const rect = el.getBoundingClientRect();
              const w = rect.width;
              const h = rect.height;
              if (w < 80 || h < 80) return -1;
              const aspect = Math.min(w, h) / Math.max(w, h);
              if (aspect < 0.85) return -1;

              const cs = window.getComputedStyle(el);
              const br = cs.borderRadius || '';
              let circleish = 0;

              // Accept 50% radii or very large pixel radii
              if (br.includes('%')) {
                const pct = parseFloat(br);
                if (!Number.isNaN(pct)) circleish = clamp01(1 - Math.abs(pct - 50) / 50);
              } else {
                const px = parseFloat(br);
                const minDim = Math.min(w, h);
                if (!Number.isNaN(px) && minDim > 0) circleish = clamp01(px / (minDim / 2));
              }

              // Favor large, near-center elements
              const area = w * h;
              const cx = rect.left + w / 2;
              const cy = rect.top + h / 2;
              const dx = Math.abs(cx - window.innerWidth / 2) / (window.innerWidth / 2);
              const dy = Math.abs(cy - window.innerHeight / 2) / (window.innerHeight / 2);
              const centerScore = clamp01(1 - (dx + dy) / 2);

              return area * aspect * (0.25 + 0.75 * circleish) * (0.4 + 0.6 * centerScore);
            };

            const findCircleTarget = () => {
              const selectors = 'img,canvas,svg,div';
              const els = Array.from(document.querySelectorAll(selectors));
              let best = null;
              let bestScore = -1;
              for (const el of els) {
                // Never target our own overlay (prevents self-referential drift)
                try {
                  if (el && el.id === 'ytmd-vinyl-click-overlay') continue;
                  if (el && el.closest && el.closest('#ytmd-vinyl-click-overlay')) continue;
                } catch {}
                if (!isVisible(el)) continue;
                // Ignore partially-offscreen candidates (common during initial render)
                try {
                  const r = el.getBoundingClientRect();
                  if (r.top < 0 || r.left < 0) continue;
                  if (r.bottom > window.innerHeight || r.right > window.innerWidth) continue;
                } catch {}
                const score = approxCircleScore(el);
                if (score > bestScore) {
                  bestScore = score;
                  best = el;
                }
              }
              return best;
            };

            const ensureOverlay = () => {
              if (overlay && document.body.contains(overlay)) return;
              overlay = document.createElement('div');
              overlay.id = 'ytmd-vinyl-click-overlay';
              overlay.innerHTML = '<div class=\"ytmd-icon\" aria-hidden=\"true\"></div>';
              icon = overlay.querySelector('.ytmd-icon');

              // Prevent window drag handlers from starting when clicking overlay
              overlay.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
              }, true);

              overlay.addEventListener('click', (e) => {
                if (!enabled) return;
                e.preventDefault();
                e.stopPropagation();
                clickCount += 1;
                if (clickTimer) clearTimeout(clickTimer);
                clickTimer = setTimeout(flushClicks, MULTI_CLICK_WINDOW_MS);
              }, true);

              overlay.addEventListener('pointerdown', (e) => {
                if (!enabled) return;
                e.preventDefault();
                e.stopPropagation();
                overlay.classList.add('active');
              }, true);

              const clearActive = () => overlay && overlay.classList.remove('active');
              overlay.addEventListener('pointerup', clearActive, true);
              overlay.addEventListener('pointercancel', clearActive, true);
              overlay.addEventListener('pointerleave', clearActive, true);

              document.body.appendChild(overlay);
            };

            const updateIcon = () => {
              const playSvg = '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M8 5v14l11-7z\"/></svg>';
              const pauseSvg = '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M6 19h4V5H6v14zm8-14v14h4V5h-4z\"/></svg>';
              if (icon) icon.innerHTML = playing ? pauseSvg : playSvg;
              if (overlay) {
                overlay.classList.toggle('enabled', Boolean(enabled));
                overlay.style.display = enabled ? 'flex' : 'none';
              }
            };

            const rectsEqual = (a, b) =>
              a && b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;

            const stopOverlayInterval = () => {
              if (!overlayInterval) return;
              clearInterval(overlayInterval);
              overlayInterval = null;
            };

            const startOverlayInterval = () => {
              if (overlayInterval || !enabled) return;
              overlayInterval = setInterval(() => positionOverlay(), 2000);
            };

            const positionOverlay = () => {
              ensureOverlay();
              if (!overlay) return;
              if (!enabled) {
                overlay.style.display = 'none';
                stopOverlayInterval();
                return;
              }

              let target = null;
              if (lastTarget && isVisible(lastTarget)) {
                target = lastTarget;
              } else {
                target = findCircleTarget();
                lastTarget = target;
                lastTargetRect = null;
              }

              if (!target) {
                overlay.style.display = 'none';
                return;
              }

              const rect = target.getBoundingClientRect();
              const rectKey = {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              };

              if (lastTargetRect && rectsEqual(lastTargetRect, rectKey)) {
                return;
              }

              lastTargetRect = rectKey;
              overlay.style.display = 'flex';
              overlay.style.left = rectKey.left + 'px';
              overlay.style.top = rectKey.top + 'px';
              overlay.style.width = rectKey.width + 'px';
              overlay.style.height = rectKey.height + 'px';
            };

            // Drag start/end - ignore overlay clicks
            let isDragging = false;
            document.addEventListener('mousedown', (e) => {
              if (e && e.target && e.target.closest && e.target.closest('#ytmd-vinyl-click-overlay')) return;
              isDragging = true;
              ipc && ipc.send && ipc.send('vinyl-player:drag-start');
            }, true);

            document.addEventListener('mouseup', () => {
              if (!isDragging) return;
              isDragging = false;
              ipc && ipc.send && ipc.send('vinyl-player:drag-end');
            }, true);

            document.addEventListener('mouseleave', () => {
              if (!isDragging) return;
              isDragging = false;
              ipc && ipc.send && ipc.send('vinyl-player:drag-end');
            }, true);

            // Clamp negative blur() in Web Animations API keyframes to avoid warnings
            try {
              const originalAnimate = Element.prototype.animate;
              Element.prototype.animate = function(keyframes, options) {
                const clamp = (frames) => {
                  if (Array.isArray(frames)) {
                    return frames.map(f => {
                      if (f && typeof f === 'object' && typeof f.filter === 'string') {
                        f.filter = f.filter.replace(/blur\\(([-\\d\\.]+)(px|rem)\\)/g, (_m, val, unit) => {
                          const n = parseFloat(val);
                          return 'blur(' + (isNaN(n) || n < 0 ? 0 : n) + unit + ')';
                        });
                      }
                      return f;
                    });
                  }
                  return frames;
                };
                try { return originalAnimate.call(this, clamp(keyframes), options); }
                catch { return originalAnimate.call(this, keyframes, options); }
              };
            } catch {}

            state.setPlaying = (v) => { playing = Boolean(v); updateIcon(); };
            state.setEnabled = (v) => {
              enabled = Boolean(v);
              updateIcon();
              if (enabled) {
                lastTarget = null;
                lastTargetRect = null;
                positionOverlay();
                startOverlayInterval();
              } else {
                stopOverlayInterval();
                positionOverlay();
              }
            };
            state.refresh = () => {
              lastTarget = null;
              lastTargetRect = null;
              positionOverlay();
            };

            updateIcon();
            if (enabled) {
              positionOverlay();
              startOverlayInterval();
            }
            window.addEventListener('resize', () => {
              lastTargetRect = null;
              positionOverlay();
            }, { passive: true });
          })();
        `
          )
          .catch((): void => undefined);
        /* eslint-enable no-useless-escape */
      }
    });
  }

  private destroyVinylWindow(): void {
    if (this.vinylCspSession) {
      try {
        this.vinylCspSession.webRequest.onHeadersReceived(null);
      } catch {
        // ignore
      }
      this.vinylCspSession = null;
    }
    if (this.vinylWindow?.window) {
      this.vinylWindow.window.destroy();
      this.vinylWindow = null;
    }
    this.last6KOverlayState = { enabled: false, playing: false };
  }

  // Public methods for external control
  public showVinylWindow(): boolean {
    if (!app.isReady()) {
      void app.whenReady().then(() => this.showVinylWindow());
      return false;
    }

    if (!this.vinylWindow) {
      this.createVinylWindow();
    }

    if (this.vinylWindow?.window) {
      if (!this.vinylWindow.isVisible) {
        this.vinylWindow.window.show();
        this.vinylWindow.isVisible = true;
      }
      // Best-effort refresh so the vinyl window matches the current/last-loaded track immediately
      void this.refreshFromYtmViewSnapshot();
      return true;
    }
    return false;
  }

  public hideVinylWindow(): boolean {
    if (this.vinylWindow?.window) {
      if (this.vinylWindow.isVisible) {
        this.vinylWindow.window.hide();
        this.vinylWindow.isVisible = false;
      }
      return true;
    }
    return false;
  }

  private setupPlayerStateListener(): void {
    if (this.playerStateListener) {
      playerStateStore.removeEventListener(this.playerStateListener);
    }
    this.playerStateListener = (state: PlayerState) => {
      this.updatePlayerState(state);
    };
    playerStateStore.addEventListener(this.playerStateListener);
  }

  private trackDisplayKey(track: TrackInfo, playing: boolean): string {
    return JSON.stringify({
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      isPlaying: playing,
      spinSpeed: track.spinSpeed,
      durationSeconds: track.durationSeconds
    });
  }

  private updatePlayerState(state: PlayerState): void {
    const hasVideo = !!state.videoDetails;
    const isPlaying = state.trackState === VideoState.Playing;

    if (hasVideo && state.videoDetails) {
      const track: TrackInfo = {
        title: state.videoDetails.title || "Unknown Title",
        artist: state.videoDetails.author || "Unknown Artist",
        thumbnail: this.getBestThumbnail(state.videoDetails.thumbnails),
        isPlaying,
        spinSpeed: Number(this.settings.spinSpeed ?? 1),
        durationSeconds: Number(state.videoDetails.durationSeconds ?? 0),
        progressSeconds: Number(state.videoProgress ?? 0)
      };

      const prevTrack = this.currentTrack;
      const prevPlaying = this.isPlaying;
      const displayChanged = !prevTrack || this.trackDisplayKey(track, isPlaying) !== this.trackDisplayKey(prevTrack, prevPlaying);
      const progressChanged = track.progressSeconds !== prevTrack?.progressSeconds;

      this.currentTrack = track;
      this.isPlaying = isPlaying;

      if (displayChanged) {
        this.updateVinylDisplay();
      } else if (progressChanged) {
        this.sendVinylProgressOnly();
      }
    } else {
      const idleTrack: TrackInfo = {
        title: "No track playing",
        artist: "",
        thumbnail: "",
        isPlaying: false,
        spinSpeed: Number(this.settings.spinSpeed ?? 1),
        durationSeconds: 0,
        progressSeconds: 0
      };
      const displayChanged = !this.currentTrack || this.trackDisplayKey(idleTrack, false) !== this.trackDisplayKey(this.currentTrack, this.isPlaying);

      this.currentTrack = idleTrack;
      this.isPlaying = false;

      if (displayChanged) {
        this.updateVinylDisplay();
      }
    }
  }

  private getBestThumbnail(thumbnails: unknown[]): string {
    if (!thumbnails || thumbnails.length === 0) {
      return "";
    }

    // Try to get the highest quality thumbnail
    const sortedThumbnails = (thumbnails as Array<{ width?: number; url?: string }>).sort((a, b) => (b.width || 0) - (a.width || 0));
    return sortedThumbnails[0]?.url || "";
  }

  private sendVinylProgressOnly(): void {
    if (!this.vinylWindow?.window || this.vinylWindow.window.isDestroyed()) {
      return;
    }

    const use6KLabs = typeof this.settings.widgetMode === "string" ? String(this.settings.widgetMode) === "6klabs" : Boolean(this.settings.use6KLabsWidget);
    if (use6KLabs) {
      return;
    }

    try {
      this.vinylWindow.window.webContents.send("vinyl-player:update-track", {
        progressSeconds: Number(this.currentTrack?.progressSeconds ?? 0)
      });
    } catch (error) {
      console.error("Error updating vinyl progress:", error);
    }
  }

  private sync6KOverlayState(force = false): void {
    if (!this.vinylWindow?.window || this.vinylWindow.window.isDestroyed()) {
      return;
    }

    const use6KLabs = typeof this.settings.widgetMode === "string" ? String(this.settings.widgetMode) === "6klabs" : Boolean(this.settings.use6KLabsWidget);
    if (!use6KLabs) {
      return;
    }

    const enabled = this.settings.enableButtonFeature !== false;
    const playing = Boolean(this.isPlaying);
    if (!force && this.last6KOverlayState.enabled === enabled && this.last6KOverlayState.playing === playing) {
      return;
    }

    this.last6KOverlayState = { enabled, playing };
    this.vinylWindow.window.webContents
      .executeJavaScript(`window.__YTMD_VINYL_OVERLAY__?.setEnabled?.(${enabled}); window.__YTMD_VINYL_OVERLAY__?.setPlaying?.(${playing});`)
      .catch((): void => undefined);
  }

  private updateVinylDisplay(): void {
    if (!this.vinylWindow?.window) {
      return;
    }

    const window = this.vinylWindow.window;
    const use6KLabs = typeof this.settings.widgetMode === "string" ? String(this.settings.widgetMode) === "6klabs" : Boolean(this.settings.use6KLabsWidget);

    try {
      const trackData = {
        title: this.currentTrack?.title || "No track playing",
        artist: this.currentTrack?.artist || "Unknown Artist",
        thumbnail: this.currentTrack?.thumbnail || "",
        isPlaying: this.isPlaying,
        spinSpeed: Number(this.settings.spinSpeed ?? 1),
        durationSeconds: Number(this.currentTrack?.durationSeconds ?? 0),
        progressSeconds: Number(this.currentTrack?.progressSeconds ?? 0)
      };

      if (!use6KLabs) {
        window.webContents.send("vinyl-player:update-track", trackData);
      }

      this.sync6KOverlayState();

      // Show window if auto-show is enabled and a track is playing
      if (Boolean(this.settings.autoShow) && this.isPlaying && !this.vinylWindow.isVisible) {
        this.showVinylWindow();
      }
    } catch (error) {
      console.error("Error updating vinyl display:", error);
    }
  }

  private sendVinylSettingsToWindow(): void {
    if (!this.vinylWindow?.window || this.vinylWindow.window.isDestroyed()) {
      return;
    }

    const use6KLabs = typeof this.settings.widgetMode === "string" ? String(this.settings.widgetMode) === "6klabs" : Boolean(this.settings.use6KLabsWidget);
    if (use6KLabs) {
      this.sync6KOverlayState();
      return;
    }

    this.vinylWindow.window.webContents.send("vinyl-player:update-settings", {
      showControls: this.settings.showControls !== false,
      enableButtonFeature: this.settings.enableButtonFeature !== false,
      scale: this.settings.windowSize ? Number(this.settings.windowSize) / 200 : 1
    });
  }

  // Public methods for external control
  public toggleWindow(): void {
    if (this.vinylWindow?.isVisible) {
      this.hideVinylWindow();
    } else {
      this.showVinylWindow();
    }
  }

  setPlayingState(isPlaying: boolean): void {
    this.isPlaying = isPlaying;
    this.updateVinylDisplay();
  }

  private saveWindowState(): void {
    if (!this.vinylWindow?.window || this.vinylWindow.window.isDestroyed()) {
      return;
    }

    const window = this.vinylWindow.window;
    const bounds = window.getBounds();

    // Update settings with current window state
    this.updateSettings({
      savedWindowX: bounds.x,
      savedWindowY: bounds.y,
      savedWindowWidth: bounds.width,
      savedWindowHeight: bounds.height,
      wasVisibleOnClose: this.vinylWindow.isVisible
    });
  }

  private constrainWindowToScreen(window: BrowserWindow): void {
    if (!window || window.isDestroyed()) return;

    // Don't constrain in wallpaper mode
    if (this.settings.wallpaperMode) return;

    const enableBoundaryCollision = this.settings.enableBoundaryCollision as boolean;
    if (!enableBoundaryCollision) return;

    const bounds = window.getBounds();
    const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
    const workArea = display.workArea;

    let newX = bounds.x;
    let newY = bounds.y;
    let needsUpdate = false;

    // Constrain X position
    if (bounds.x + bounds.width > workArea.x + workArea.width) {
      newX = workArea.x + workArea.width - bounds.width;
      needsUpdate = true;
    }
    if (bounds.x < workArea.x) {
      newX = workArea.x;
      needsUpdate = true;
    }

    // Constrain Y position
    if (bounds.y + bounds.height > workArea.y + workArea.height) {
      newY = workArea.y + workArea.height - bounds.height;
      needsUpdate = true;
    }
    if (bounds.y < workArea.y) {
      newY = workArea.y;
      needsUpdate = true;
    }

    if (needsUpdate) {
      window.setPosition(Math.floor(newX), Math.floor(newY), false);
    }
  }

  static getSettingsSchema(): PluginSettings {
    return {
      widgetMode: {
        type: "select",
        label: "Widget Mode",
        description: "Choose what the pop-out window displays.",
        default: "workshop",
        options: [
          { value: "workshop", label: "Workshop (cozy turntable, local assets)" },
          { value: "custom", label: "Custom Vinyl Player (built-in)" },
          { value: "remake", label: "Remake Widget (local, customizable)" },
          { value: "6klabs", label: "6K Labs Widget (external URL)" }
        ]
      },
      use6KLabsWidget: {
        type: "boolean",
        label: "Use 6K Labs Widget (Legacy)",
        description: "Legacy toggle (kept for compatibility). Prefer using Widget Mode above.",
        default: false
      },
      windowSize: {
        type: "number",
        label: "Window Size",
        description: "Size of the custom vinyl player window in pixels (not used for 6K Labs widget)",
        default: 200
      },
      alwaysOnTop: {
        type: "boolean",
        label: "Always On Top",
        description: "Keep the player window above other windows",
        default: true
      },
      autoShow: {
        type: "boolean",
        label: "Auto Show",
        description: "Automatically show the player when a song starts",
        default: false
      },
      spinSpeed: {
        type: "number",
        label: "Spin Speed",
        description: "Speed of the vinyl record rotation (1-5, custom player only)",
        default: 2
      },
      showControls: {
        type: "boolean",
        label: "Show Controls",
        description: "Show play/pause controls on the custom vinyl player",
        default: true
      },
      opacity: {
        type: "number",
        label: "Opacity",
        description: "Transparency of the player window (0.1-1.0)",
        default: 0.9
      },
      enableBoundaryCollision: {
        type: "boolean",
        label: "Enable Boundary Collision",
        description: "Prevent window from moving off-screen",
        default: true
      },
      enableBoundaryMagnetism: {
        type: "boolean",
        label: "Enable Boundary Magnetism",
        description: "Snap window to screen edges when dragging near them",
        default: true
      },
      magnetismThreshold: {
        type: "number",
        label: "Magnetism Threshold (pixels)",
        description: "Distance from edge (in pixels) to trigger snap",
        default: 20
      },
      enableResizing: {
        type: "boolean",
        label: "Enable Resizing",
        description: "Allow window to be resized by dragging edges/corners",
        default: true
      },
      showOnStartup: {
        type: "boolean",
        label: "Show on Startup",
        description: "Automatically show the vinyl player when the app starts",
        default: false
      },
      enableButtonFeature: {
        type: "boolean",
        label: "Enable Button Feature",
        description: "Allow clicking the vinyl record to play/pause music",
        default: true
      },
      wallpaperMode: {
        type: "boolean",
        label: "Wallpaper Mode",
        description: "Make the player act as a desktop wallpaper (fullscreen, bottom layer)",
        default: false
      }
      // Note: savedWindow* and wasVisibleOnClose settings are hidden - they're managed automatically
    };
  }
}
