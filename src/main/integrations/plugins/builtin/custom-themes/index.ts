import { BrowserView } from "electron";
import log from "electron-log";
import { BasePlugin, PluginSettings } from "../../base-plugin";

export class CustomThemesPlugin extends BasePlugin {
  private currentTheme: string | null = null;
  private ytmView: BrowserView | null = null;
  private themeCssKey: string | null = null;
  private customCssKey: string | null = null;

  constructor() {
    super({
      id: "custom-themes",
      name: "Custom Themes",
      description: "Apply custom visual themes to the application",
      version: "1.0.0",
      author: "YTMDesktop Team",
      enabled: false,
      settings: {
        selectedTheme: "default",
        autoSwitch: false,
        darkModeOnly: true,
        customCSS: ""
      }
    });
  }

  provide(ytmView: BrowserView): void {
    this.ytmView = ytmView;
    if (this.enabled) {
      void this.syncStylesToYtmView();
    }
  }

  onEnable(): void {
    log.debug("Custom Themes Plugin enabled");
    void this.syncStylesToYtmView();
  }

  onDisable(): void {
    log.debug("Custom Themes Plugin disabled");
    void this.removeAllStyles();
  }

  onAppReady(): void {
    if (this.enabled) {
      void this.syncStylesToYtmView();
    }
  }

  onSettingsChanged(_settings: Record<string, unknown>): void {
    void _settings;
    if (!this.enabled) {
      return;
    }

    log.debug("Custom Themes settings changed");
    void this.syncStylesToYtmView();
  }

  private canInject(): boolean {
    return Boolean(this.ytmView && !this.ytmView.webContents.isDestroyed());
  }

  private async syncStylesToYtmView(): Promise<void> {
    if (!this.canInject()) {
      return;
    }

    const themeName = typeof this.settings.selectedTheme === "string" ? this.settings.selectedTheme : "default";
    await this.applyTheme(themeName);

    const cssValue = typeof this.settings.customCSS === "string" ? this.settings.customCSS : String(this.settings.customCSS ?? "");
    await this.applyCustomCSS(cssValue);
  }

  private async applyTheme(themeName: string): Promise<void> {
    await this.removeThemeCSS();

    if (themeName === "default") {
      this.currentTheme = null;
      return;
    }

    const theme = this.getTheme(themeName);
    if (theme && this.canInject()) {
      this.themeCssKey = await this.ytmView!.webContents.insertCSS(theme);
      this.currentTheme = themeName;
      log.debug(`Applied theme: ${themeName}`);
    }
  }

  private async removeThemeCSS(): Promise<void> {
    if (this.themeCssKey && this.canInject()) {
      await this.ytmView!.webContents.removeInsertedCSS(this.themeCssKey);
    }
    this.themeCssKey = null;
    this.currentTheme = null;
  }

  private async applyCustomCSS(css: string): Promise<void> {
    if (!this.canInject()) {
      return;
    }

    if (this.customCssKey) {
      await this.ytmView!.webContents.removeInsertedCSS(this.customCssKey);
      this.customCssKey = null;
    }

    if (css.trim()) {
      this.customCssKey = await this.ytmView!.webContents.insertCSS(css);
    }
  }

  private async removeAllStyles(): Promise<void> {
    await this.removeThemeCSS();

    if (this.customCssKey && this.canInject()) {
      await this.ytmView!.webContents.removeInsertedCSS(this.customCssKey);
    }
    this.customCssKey = null;
  }

  private getTheme(themeName: string): string | null {
    const themes: Record<string, string> = {
      "dark-blue": `
        :root {
          --background-color: #1a1a2e;
          --surface-color: #16213e;
          --primary-color: #0f3460;
          --accent-color: #e94560;
        }
      `,
      "green-nature": `
        :root {
          --background-color: #1b4332;
          --surface-color: #2d6a4f;
          --primary-color: #40916c;
          --accent-color: #95d5b2;
        }
      `,
      "purple-dream": `
        :root {
          --background-color: #2d1b69;
          --surface-color: #4c1d95;
          --primary-color: #7c3aed;
          --accent-color: #a855f7;
        }
      `
    };

    return themes[themeName] || null;
  }

  static getSettingsSchema(): PluginSettings {
    return {
      selectedTheme: {
        type: "select",
        label: "Selected Theme",
        description: "Choose a theme to apply",
        default: "default",
        options: [
          { value: "default", label: "Default" },
          { value: "dark-blue", label: "Dark Blue" },
          { value: "green-nature", label: "Green Nature" },
          { value: "purple-dream", label: "Purple Dream" }
        ]
      },
      autoSwitch: {
        type: "boolean",
        label: "Auto Switch Themes",
        description: "Automatically switch themes based on time of day",
        default: false
      },
      darkModeOnly: {
        type: "boolean",
        label: "Dark Mode Only",
        description: "Only apply themes in dark mode",
        default: true
      },
      customCSS: {
        type: "string",
        label: "Custom CSS",
        description: "Add your own custom CSS rules",
        default: ""
      }
    };
  }
}
