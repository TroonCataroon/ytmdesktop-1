import { BasePlugin, PluginSettings } from "../../base-plugin";

export class CustomThemesPlugin extends BasePlugin {
  private currentTheme: string | null = null;

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

  onEnable(): void {
    console.log("Custom Themes Plugin enabled");
    this.applyTheme(this.settings.selectedTheme);
  }

  onDisable(): void {
    console.log("Custom Themes Plugin disabled");
    this.removeTheme();
  }

  onSettingsChanged(newSettings: Record<string, unknown>): void {
    console.log("Custom Themes settings changed:", newSettings);

    if (newSettings.selectedTheme !== this.settings.selectedTheme) {
      this.applyTheme(newSettings.selectedTheme);
    }

    if (newSettings.customCSS !== this.settings.customCSS) {
      this.applyCustomCSS(newSettings.customCSS);
    }
  }

  private applyTheme(themeName: string): void {
    this.removeTheme(); // Remove previous theme

    if (themeName === "default") {
      return;
    }

    const theme = this.getTheme(themeName);
    if (theme) {
      this.injectThemeCSS(theme);
      this.currentTheme = themeName;
      console.log(`Applied theme: ${themeName}`);
    }
  }

  private removeTheme(): void {
    if (this.currentTheme) {
      // Remove theme CSS
      const themeStyle = document.getElementById("custom-theme-style");
      if (themeStyle) {
        themeStyle.remove();
      }
      this.currentTheme = null;
    }
  }

  private applyCustomCSS(css: string): void {
    let customStyle = document.getElementById("custom-css-style");
    if (!customStyle) {
      customStyle = document.createElement("style");
      customStyle.id = "custom-css-style";
      document.head.appendChild(customStyle);
    }
    customStyle.textContent = css;
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

  private injectThemeCSS(css: string): void {
    const style = document.createElement("style");
    style.id = "custom-theme-style";
    style.textContent = css;
    document.head.appendChild(style);
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
