import { BasePlugin, PluginSettings } from "../../base-plugin";
import { BrowserWindow } from "electron";
import path from "path";

interface VinylPlayerWindow {
  window: BrowserWindow;
  isVisible: boolean;
}

export class VinylPlayerPlugin extends BasePlugin {
  private vinylWindow: VinylPlayerWindow | null = null;
  private isPlaying = false;
  private currentTrack: {
    title: string;
    artist: string;
    thumbnail: string;
  } | null = null;

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
  }

  onEnable(): void {
    console.log("Vinyl Player Plugin enabled");
    this.createVinylWindow();
    this.setupPlayerStateListener();
  }

  onDisable(): void {
    console.log("Vinyl Player Plugin disabled");
    this.destroyVinylWindow();
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
    }
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
        skipTaskbar: true,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true
        }
      }),
      isVisible: false
    };

    const window = this.vinylWindow.window;

    // Load the vinyl player HTML
    window.loadFile(path.join(__dirname, "vinyl-player.html"));

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

    console.log("Vinyl player window created");
  }

  private destroyVinylWindow(): void {
    if (this.vinylWindow?.window) {
      this.vinylWindow.window.destroy();
      this.vinylWindow = null;
    }
  }

  private setupPlayerStateListener(): void {
    // This would listen to player state changes from the main app
    // For now, we'll simulate with a timer
    setInterval(() => {
      this.updatePlayerState();
    }, 1000);
  }

  private updatePlayerState(): void {
    // This would get the actual player state from the main app
    // For now, we'll use mock data
    const mockTrack = {
      title: "Bohemian Rhapsody",
      artist: "Queen",
      thumbnail: "https://via.placeholder.com/200x200/1db954/ffffff?text=Album"
    };

    if (JSON.stringify(mockTrack) !== JSON.stringify(this.currentTrack)) {
      this.currentTrack = mockTrack;
      this.updateVinylDisplay();
    }
  }

  private updateVinylDisplay(): void {
    if (!this.vinylWindow?.window) {
      return;
    }

    const window = this.vinylWindow.window;

    // Send track info to the renderer
    window.webContents.send("vinyl-player:update-track", {
      title: this.currentTrack?.title || "",
      artist: this.currentTrack?.artist || "",
      thumbnail: this.currentTrack?.thumbnail || "",
      isPlaying: this.isPlaying,
      spinSpeed: this.settings.spinSpeed
    });

    // Show window if auto-show is enabled
    if (this.settings.autoShow && !this.vinylWindow.isVisible) {
      this.showVinylWindow();
    }
  }

  private showVinylWindow(): void {
    if (!this.vinylWindow?.window) {
      return;
    }

    const window = this.vinylWindow.window;

    if (!this.vinylWindow.isVisible) {
      window.show();
      this.vinylWindow.isVisible = true;
    }
  }

  private hideVinylWindow(): void {
    if (!this.vinylWindow?.window) {
      return;
    }

    const window = this.vinylWindow.window;

    if (this.vinylWindow.isVisible) {
      window.hide();
      this.vinylWindow.isVisible = false;
    }
  }

  // Public methods for external control
  toggleWindow(): void {
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
