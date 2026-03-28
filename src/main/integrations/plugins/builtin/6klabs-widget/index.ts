import { BasePlugin, PluginSettings } from "../../base-plugin";
import log from "electron-log";

export class SixKLabsWidgetPlugin extends BasePlugin {
  private static readonly TOKEN_RE = /[a-f0-9]{64}/i;

  /**
   * Accepts either:
   * - a bare token (64 hex chars), or
   * - a full 6K Labs widget URL (even the "double-prefixed" form some shares produce),
   * and returns a normalized token.
   */
  private static extractToken(input: unknown): string | null {
    const raw = String(input ?? "").trim();
    if (!raw) return null;

    // Fast path: token anywhere in the string.
    const direct = raw.match(SixKLabsWidgetPlugin.TOKEN_RE);
    if (direct) return direct[0];

    // Some shares embed the full URL inside the path (double-prefix). Strip repeated prefixes.
    const prefixes = [
      "https://6klabs.com/widget/youtube/",
      "http://6klabs.com/widget/youtube/",
      "https://www.6klabs.com/widget/youtube/",
      "http://www.6klabs.com/widget/youtube/"
    ];
    let cleaned = raw;
    for (const p of prefixes) {
      while (cleaned.startsWith(p)) cleaned = cleaned.slice(p.length);
    }

    // If after stripping we now contain a token, return it.
    const stripped = cleaned.match(SixKLabsWidgetPlugin.TOKEN_RE);
    if (stripped) return stripped[0];

    // Try URL parse (supports full links).
    try {
      const u = new URL(raw);
      const qp = u.searchParams.get("token");
      if (qp) {
        const m = qp.match(SixKLabsWidgetPlugin.TOKEN_RE);
        return m ? m[0] : qp.trim() || null;
      }

      const pathToken = u.pathname.match(SixKLabsWidgetPlugin.TOKEN_RE);
      if (pathToken) return pathToken[0];

      const last = u.pathname.split("/").filter(Boolean).pop();
      if (last) {
        const m = last.match(SixKLabsWidgetPlugin.TOKEN_RE);
        return m ? m[0] : last.trim() || null;
      }
    } catch {
      // ignore
    }

    // Last resort: treat the cleaned string as a token-ish value.
    return cleaned.trim() || null;
  }

  constructor() {
    super({
      id: "6klabs-widget",
      name: "6K Labs Widget",
      description: "Configure 6K Labs Amuse widget for OBS streaming. Get your widget token from 6klabs.com/dashboard",
      version: "1.0.0",
      author: "YTMD Team",
      enabled: false,
      settings: {
        widgetToken: "",
        coverStyle: 1, // 0=Square, 1=Circle, 2=Vinyl, 3=CD
        coverBlur: false,
        coverGlow: true,
        hideOnPause: false,
        hideDelay: 10,
        visibleDuration: 5,
        songChangeOnly: false,
        hideEqualizer: false,
        playerStyle: 0, // 0=Minimal, 1=Modern, 2=Classic
        playerColors: true,
        theme: 0, // 0=Dark, 1=Light, 2=Auto, 3=Gradient, 4=Glass
        tintColor: "#1DB954"
      }
    });
  }

  // Get settings schema for UI
  static getSettingsSchema(): PluginSettings {
    return {
      widgetToken: {
        type: "string",
        label: "Widget Token / Link",
        description: "Paste your 6K Labs widget token or the full widget link (we'll extract the token).",
        default: ""
        // Note: the renderer has custom UI for this plugin; this schema remains the contract for other callers.
        // placeholder: "58673b945983fcf8130a5110b7b487e45f670466e181ef6d67af3c393135dbf5"
      },
      coverStyle: {
        type: "select",
        label: "Cover Style",
        description: "Album cover display style",
        default: 1,
        options: [
          { label: "Square", value: 0 },
          { label: "Circle", value: 1 },
          { label: "Vinyl", value: 2 },
          { label: "CD", value: 3 }
        ]
      },
      coverBlur: {
        type: "boolean",
        label: "Cover Blur",
        description: "Apply blur effect to album cover background",
        default: false
      },
      coverGlow: {
        type: "boolean",
        label: "Cover Glow",
        description: "Add glow effect to album cover",
        default: true
      },
      hideOnPause: {
        type: "boolean",
        label: "Hide on Pause",
        description: "Hide widget when music is paused",
        default: false
      },
      hideDelay: {
        type: "number",
        label: "Hide Delay (seconds)",
        description: "Delay before hiding widget",
        default: 10
      },
      visibleDuration: {
        type: "number",
        label: "Visible Duration (seconds)",
        description: "How long to show widget",
        default: 5
      },
      songChangeOnly: {
        type: "boolean",
        label: "Song Change Only",
        description: "Only show widget when song changes",
        default: false
      },
      hideEqualizer: {
        type: "boolean",
        label: "Hide Equalizer",
        description: "Hide equalizer visualization",
        default: false
      },
      playerStyle: {
        type: "select",
        label: "Player Style",
        description: "Player UI style",
        default: 0,
        options: [
          { label: "Minimal", value: 0 },
          { label: "Modern", value: 1 },
          { label: "Classic", value: 2 }
        ]
      },
      playerColors: {
        type: "boolean",
        label: "Player Colors",
        description: "Use dynamic colors from album art",
        default: true
      },
      theme: {
        type: "select",
        label: "Theme",
        description: "Widget theme",
        default: 0,
        options: [
          { label: "Dark", value: 0 },
          { label: "Light", value: 1 },
          { label: "Auto", value: 2 },
          { label: "Gradient", value: 3 },
          { label: "Glass", value: 4 }
        ]
      },
      tintColor: {
        type: "string",
        label: "Tint Color",
        description: "Custom tint color for widget (hex)",
        default: "#1DB954"
      }
    };
  }

  onEnable(): void {
    log.debug("[6K Labs Widget] Plugin enabled");
  }

  onDisable(): void {
    log.debug("[6K Labs Widget] Plugin disabled");
  }

  getWidgetUrl(): string {
    const token = SixKLabsWidgetPlugin.extractToken(this.currentSettings.widgetToken);
    if (!token) {
      return "⚠️ Enter your widget token above to get the URL";
    }

    // Always build a canonical URL from the extracted token to avoid "double-prefix" outputs.
    const url = new URL(`https://6klabs.com/widget/youtube/${encodeURIComponent(token)}`);

    // Best-effort: include configured options as query params.
    // (If the 6K Labs widget ignores unknown params, this is harmless; if it supports them, this makes settings effective.)
    const getNum = (k: string, fallback: number): number => {
      const n = Number(this.currentSettings[k]);
      return Number.isFinite(n) ? n : fallback;
    };
    const getBool = (k: string, fallback: boolean): string => {
      const raw = this.currentSettings[k];
      const b = typeof raw === "boolean" ? raw : fallback;
      return String(b ? 1 : 0);
    };

    url.searchParams.set("coverStyle", String(getNum("coverStyle", 1)));
    url.searchParams.set("coverBlur", getBool("coverBlur", false));
    url.searchParams.set("coverGlow", getBool("coverGlow", true));
    url.searchParams.set("hideOnPause", getBool("hideOnPause", false));
    url.searchParams.set("hideDelay", String(getNum("hideDelay", 10)));
    url.searchParams.set("visibleDuration", String(getNum("visibleDuration", 5)));
    url.searchParams.set("songChangeOnly", getBool("songChangeOnly", false));
    url.searchParams.set("hideEqualizer", getBool("hideEqualizer", false));
    url.searchParams.set("playerStyle", String(getNum("playerStyle", 0)));
    url.searchParams.set("playerColors", getBool("playerColors", true));
    url.searchParams.set("theme", String(getNum("theme", 0)));
    url.searchParams.set("tintColor", String(this.currentSettings.tintColor ?? "#1DB954"));

    return url.toString();
  }
}
