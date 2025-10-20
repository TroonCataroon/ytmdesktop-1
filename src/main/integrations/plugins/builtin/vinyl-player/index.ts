import { BasePlugin, PluginSettings } from "../../base-plugin";
import { BrowserWindow, ipcMain, globalShortcut, app } from "electron";
import path from "path";
import playerStateStore, { PlayerState, VideoState } from "../../../../player-state-store";

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
}

export class VinylPlayerPlugin extends BasePlugin {
  private vinylWindow: VinylPlayerWindow | null = null;
  private isPlaying = false;
  private currentTrack: TrackInfo | null = null;

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
        opacity: 0.9
      }
    });

    // Initialize with default track
    this.currentTrack = {
      title: "No track playing",
      artist: "Unknown Artist",
      thumbnail: "",
      isPlaying: false,
      spinSpeed: 1
    };
  }

  onEnable(): void {
    console.log("Vinyl Player Plugin enabled");
    this.createVinylWindow();
    this.setupPlayerStateListener();
    this.setupIpcHandlers();
  }

  onDisable(): void {
    console.log("Vinyl Player Plugin disabled");
    this.destroyVinylWindow();
    this.cleanupIpcHandlers();
  }

  onSettingsChanged(newSettings: Record<string, unknown>): void {
    console.log("Vinyl Player settings changed:", newSettings);

    if (this.vinylWindow?.window) {
      const window = this.vinylWindow.window;

      if (newSettings.alwaysOnTop !== this.settings.alwaysOnTop) {
        window.setAlwaysOnTop(newSettings.alwaysOnTop as boolean);
      }

      if (newSettings.opacity !== this.settings.opacity) {
        window.setOpacity(newSettings.opacity as number);
      }

      if (newSettings.windowSize !== this.settings.windowSize) {
        const size = newSettings.windowSize as number;
        window.setSize(size, size);
        window.setMinimumSize(size, size);
        window.setMaximumSize(size, size);
      }

      // Send updated settings to the vinyl player window
      window.webContents.send("vinyl-player:update-settings", {
        showControls: newSettings.showControls !== undefined ? newSettings.showControls : this.settings.showControls
      });
    }
  }

  private setupIpcHandlers(): void {
    // Handle toggle window request from player bar
    ipcMain.on("vinyl-player:toggle-window", () => {
      this.toggleWindow();
    });

    // Handle play/pause from vinyl player window
    ipcMain.on("vinyl-player:play-pause", () => {
      // Send play/pause command to main window
      const mainWindow = BrowserWindow.getAllWindows().find(w => w.getTitle().includes("YouTube Music"));
      if (mainWindow) {
        mainWindow.webContents.send("remoteControl:execute", "playPause");
      }
    });

    // Handle close from vinyl player window
    ipcMain.on("vinyl-player:close", () => {
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

    console.log("Vinyl player keyboard shortcuts registered");
  }

  private unregisterKeyboardShortcuts(): void {
    globalShortcut.unregister("Alt+V");
    globalShortcut.unregister("Alt+Shift+V");

    console.log("Vinyl player keyboard shortcuts unregistered");
  }

  private createVinylWindow(): void {
    if (this.vinylWindow) {
      return;
    }

    const size = this.settings.windowSize as number;
    // const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    this.vinylWindow = {
      window: new BrowserWindow({
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        maxWidth: size,
        maxHeight: size,
        frame: false,
        transparent: true,
        alwaysOnTop: this.settings.alwaysOnTop as boolean,
        resizable: false,
        skipTaskbar: false, // Changed to false so it appears in Alt+Tab
        show: false,
        title: "Vinyl Player", // Add a title for Alt+Tab
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: app.isPackaged
            ? path.join(__dirname, "vinyl-player-preload.js")
            : path.join(process.cwd(), "src/main/integrations/plugins/builtin/vinyl-player/vinyl-player-preload.js")
        }
      }),
      isVisible: false
    };

    const window = this.vinylWindow.window;

    // Set CSP to allow YouTube thumbnails
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

    // Load the vinyl player HTML
    const htmlPath = app.isPackaged
      ? path.join(__dirname, "vinyl-player.html")
      : path.join(process.cwd(), "src/main/integrations/plugins/builtin/vinyl-player/vinyl-player.html");
    window.loadFile(htmlPath);

    // Handle window events
    window.on("closed", () => {
      this.vinylWindow = null;
    });

    window.on("blur", () => {
      if (!this.settings.alwaysOnTop) {
        window.hide();
      }
    });

    // Make window draggable
    window.setMovable(true);

    // Set initial window opacity
    window.setOpacity(this.settings.opacity as number);

    // Send initial settings to the vinyl player window once it's ready
    window.webContents.on("did-finish-load", () => {
      window.webContents.send("vinyl-player:update-settings", {
        showControls: this.settings.showControls as boolean
      });

      // Get current player state and update vinyl display
      const currentState = playerStateStore.getState();
      if (currentState && currentState.videoDetails) {
        this.updatePlayerState(currentState);
      } else {
        // Send default/empty state
        this.updateVinylDisplay();
      }
    });

    console.log("Vinyl player window created");
  }

  private destroyVinylWindow(): void {
    if (this.vinylWindow?.window) {
      this.vinylWindow.window.destroy();
      this.vinylWindow = null;
    }
  }

  // Public methods for external control
  public showVinylWindow(): boolean {
    if (!this.vinylWindow) {
      this.createVinylWindow();
    }

    if (this.vinylWindow?.window) {
      if (!this.vinylWindow.isVisible) {
        this.vinylWindow.window.show();
        this.vinylWindow.isVisible = true;
      }
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
    // Listen to actual player state changes
    playerStateStore.addEventListener((state: PlayerState) => {
      this.updatePlayerState(state);
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
        spinSpeed: Number(this.settings.spinSpeed ?? 1)
      };

      // Only update if track info has changed
      if (JSON.stringify(track) !== JSON.stringify(this.currentTrack)) {
        this.currentTrack = track;
        this.updateVinylDisplay();
      }
    } else {
      // No video playing
      this.currentTrack = {
        title: "No track playing",
        artist: "",
        thumbnail: "",
        isPlaying: false,
        spinSpeed: Number(this.settings.spinSpeed ?? 1)
      };
      this.updateVinylDisplay();
    }

    // Update playing state
    if (this.isPlaying !== isPlaying) {
      this.isPlaying = isPlaying;
      this.updateVinylDisplay();
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

  private updateVinylDisplay(): void {
    if (!this.vinylWindow?.window) {
      return;
    }

    const window = this.vinylWindow.window;

    try {
      const trackData = {
        title: this.currentTrack?.title || "No track playing",
        artist: this.currentTrack?.artist || "Unknown Artist",
        thumbnail: this.currentTrack?.thumbnail || "",
        isPlaying: this.isPlaying,
        spinSpeed: Number(this.settings.spinSpeed ?? 1)
      };

      console.log("Sending track update to vinyl player:", trackData);

      // Send track info to the renderer
      window.webContents.send("vinyl-player:update-track", trackData);

      // Send settings to the renderer
      window.webContents.send("vinyl-player:update-settings", {
        showControls: Boolean(this.settings.showControls)
      });

      // Show window if auto-show is enabled and a track is playing
      if (Boolean(this.settings.autoShow) && this.isPlaying && !this.vinylWindow.isVisible) {
        this.showVinylWindow();
      }
    } catch (error) {
      console.error("Error updating vinyl display:", error);
    }
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

  static getSettingsSchema(): PluginSettings {
    return {
      windowSize: {
        type: "number",
        label: "Window Size",
        description: "Size of the vinyl player window in pixels",
        default: 200
      },
      alwaysOnTop: {
        type: "boolean",
        label: "Always On Top",
        description: "Keep the vinyl player window above other windows",
        default: true
      },
      autoShow: {
        type: "boolean",
        label: "Auto Show",
        description: "Automatically show the vinyl player when a song starts",
        default: false
      },
      spinSpeed: {
        type: "number",
        label: "Spin Speed",
        description: "Speed of the vinyl record rotation (1-5)",
        default: 2
      },
      showControls: {
        type: "boolean",
        label: "Show Controls",
        description: "Show play/pause controls on the vinyl player",
        default: true
      },
      opacity: {
        type: "number",
        label: "Opacity",
        description: "Transparency of the vinyl player window (0.1-1.0)",
        default: 0.9
      }
    };
  }
}
