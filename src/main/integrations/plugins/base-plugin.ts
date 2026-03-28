export interface PluginConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
}

export interface PluginSettings {
  [key: string]: {
    type: "boolean" | "string" | "number" | "select";
    label: string;
    description?: string;
    default: unknown;
    options?: { value: unknown; label: string }[];
  };
}

export abstract class BasePlugin {
  protected config: PluginConfig;
  protected settings: Record<string, unknown>;

  constructor(config: PluginConfig) {
    this.config = config;
    this.settings = config.settings || {};
  }

  // Plugin lifecycle methods
  abstract onEnable(): Promise<void> | void;
  abstract onDisable(): Promise<void> | void;

  // Optional lifecycle methods
  onSettingsChanged?(newSettings: Record<string, unknown>): void;
  onAppReady?(): Promise<void> | void;
  onAppClose?(): Promise<void> | void;

  // Getters
  get id(): string {
    return this.config.id;
  }
  get name(): string {
    return this.config.name;
  }
  get description(): string {
    return this.config.description;
  }
  get version(): string {
    return this.config.version;
  }
  get author(): string {
    return this.config.author;
  }
  get enabled(): boolean {
    return this.config.enabled;
  }
  get currentSettings(): Record<string, unknown> {
    return this.settings;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  // Settings management
  updateSettings(newSettings: Record<string, unknown>): void {
    const prevSettings = this.settings;
    const nextSettings = { ...this.settings, ...newSettings };

    // #region agent log (debug instrumentation)
    try {
      fetch("http://127.0.0.1:7244/ingest/0a7fc512-60ca-4a36-8768-23f664c122af", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "wallpaper-stuck-2",
          hypothesisId: "S1",
          location: "base-plugin.ts:updateSettings",
          message: "updateSettings called",
          data: {
            pluginId: this.config?.id ?? null,
            changedKeys: Object.keys(newSettings ?? {}),
            prevWallpaperMode: Boolean((prevSettings as Record<string, unknown>)?.wallpaperMode),
            nextWallpaperMode: Boolean((nextSettings as Record<string, unknown>)?.wallpaperMode),
            newWallpaperMode: Boolean((newSettings as Record<string, unknown>)?.wallpaperMode),
            prevWidgetMode: (prevSettings as Record<string, unknown>)?.widgetMode ?? null,
            nextWidgetMode: (nextSettings as Record<string, unknown>)?.widgetMode ?? null,
            newWidgetMode: (newSettings as Record<string, unknown>)?.widgetMode ?? null
          },
          timestamp: Date.now()
        })
      }).catch((): void => undefined);
    } catch {
      // ignore
    }
    // #endregion agent log (debug instrumentation)

    this.settings = nextSettings;
    this.onSettingsChanged?.(this.settings);
  }

  // Plugin metadata
  static getSettingsSchema(): PluginSettings | null {
    return null;
  }
}
