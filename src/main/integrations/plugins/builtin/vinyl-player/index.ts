import { BasePlugin, PluginSettings } from "../../base-plugin";
import { BrowserWindow, ipcMain, globalShortcut, app, screen } from "electron";
import path from "path";
import playerStateStore, { PlayerState, VideoState } from "../../../../player-state-store";
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
        opacity: 0.9,
        use6KLabsWidget: true, // Toggle between custom vinyl player and 6K Labs widget
        enableBoundaryCollision: true, // Prevent window from going off-screen
        enableBoundaryMagnetism: true, // Snap to screen edges
        magnetismThreshold: 20 // Pixels from edge to trigger magnetism
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

    // If switching between 6K Labs widget and custom vinyl player, recreate window
    if (newSettings.use6KLabsWidget !== this.settings.use6KLabsWidget) {
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

      if (newSettings.alwaysOnTop !== this.settings.alwaysOnTop) {
        window.setAlwaysOnTop(newSettings.alwaysOnTop as boolean);
      }

      if (newSettings.opacity !== this.settings.opacity) {
        window.setOpacity(newSettings.opacity as number);
      }

      if (newSettings.windowSize !== this.settings.windowSize && !newSettings.use6KLabsWidget) {
        const size = newSettings.windowSize as number;
        window.setSize(size, size);
        window.setMinimumSize(size, size);
        window.setMaximumSize(size, size);
      }

      // Send updated settings to the vinyl player window (only for custom player)
      if (!newSettings.use6KLabsWidget) {
        window.webContents.send("vinyl-player:update-settings", {
          showControls: newSettings.showControls !== undefined ? newSettings.showControls : this.settings.showControls
        });
      }
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

    const use6KLabs = this.settings.use6KLabsWidget as boolean;
    const size = use6KLabs ? 800 : (this.settings.windowSize as number); // Larger size for 6K Labs widget

    this.vinylWindow = {
      window: new BrowserWindow({
        width: size,
        height: use6KLabs ? 200 : size, // 6K Labs widget is wider
        minWidth: use6KLabs ? 400 : size,
        minHeight: use6KLabs ? 100 : size,
        maxWidth: use6KLabs ? undefined : size, // Allow resizing for 6K Labs
        maxHeight: use6KLabs ? undefined : size,
        frame: false,
        transparent: true,
        alwaysOnTop: this.settings.alwaysOnTop as boolean,
        resizable: use6KLabs, // Allow resizing for 6K Labs widget
        skipTaskbar: false,
        show: false,
        title: use6KLabs ? "6K Labs Widget" : "Vinyl Player",
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

    if (use6KLabs) {
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
          console.log(`Loading 6K Labs widget: ${widgetUrl}`);
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

      // Load the custom vinyl player HTML
      const htmlPath = app.isPackaged
        ? path.join(__dirname, "vinyl-player.html")
        : path.join(process.cwd(), "src/main/integrations/plugins/builtin/vinyl-player/vinyl-player.html");
      window.loadFile(htmlPath);
    }

    // Handle window events
    window.on("closed", () => {
      this.vinylWindow = null;
    });

    window.on("blur", () => {
      if (!this.settings.alwaysOnTop) {
        window.hide();
      }
    });

    // Make window draggable anywhere (not just title bar)
    window.setMovable(true);

    // Enable dragging from anywhere on the window using CSS
    // The window can be dragged by clicking and dragging anywhere
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let lastMousePos = { x: 0, y: 0 };

    // Track mouse position
    const updateMousePosition = setInterval(() => {
      if (isDragging && window && !window.isDestroyed()) {
        const cursor = screen.getCursorScreenPoint();
        // Only update if mouse actually moved
        if (cursor.x !== lastMousePos.x || cursor.y !== lastMousePos.y) {
          lastMousePos = cursor;
          handleWindowMove(cursor);
        }
      }
    }, 16); // ~60fps

    // Listen for drag start/end from renderer
    ipcMain.on("vinyl-player:drag-start", () => {
      const [x, y] = window.getPosition();
      const cursor = screen.getCursorScreenPoint();
      dragOffset = {
        x: cursor.x - x,
        y: cursor.y - y
      };
      isDragging = true;
    });

    ipcMain.on("vinyl-player:drag-end", () => {
      isDragging = false;
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
      clearInterval(updateMousePosition);
      ipcMain.removeAllListeners("vinyl-player:drag-start");
      ipcMain.removeAllListeners("vinyl-player:drag-end");
    });

    // Set initial window opacity
    window.setOpacity(this.settings.opacity as number);

    // Send initial settings to the vinyl player window once it's ready (custom player only)
    window.webContents.on("did-finish-load", () => {
      if (!use6KLabs) {
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
      } else {
        // Inject dragging script for 6K Labs widget
        window.webContents.executeJavaScript(`
          (function() {
            let isDragging = false;
            
            document.addEventListener('mousedown', (e) => {
              isDragging = true;
              window.ipcRenderer?.send?.('vinyl-player:drag-start');
            });
            
            document.addEventListener('mouseup', (e) => {
              if (isDragging) {
                isDragging = false;
                window.ipcRenderer?.send?.('vinyl-player:drag-end');
              }
            });
            
            document.addEventListener('mouseleave', (e) => {
              if (isDragging) {
                isDragging = false;
                window.ipcRenderer?.send?.('vinyl-player:drag-end');
              }
            });
            
            // Make body draggable
            document.body.style.webkitAppRegion = 'drag';
            document.body.style.userSelect = 'none';
          })();
        `);
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
      use6KLabsWidget: {
        type: "boolean",
        label: "Use 6K Labs Widget",
        description: "Load 6K Labs widget instead of custom vinyl player (requires 6K Labs Widget plugin token)",
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
      }
    };
  }
}
