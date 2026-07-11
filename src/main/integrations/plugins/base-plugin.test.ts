import { describe, expect, it, vi } from "vitest";
import { BasePlugin } from "./base-plugin";

class TestPlugin extends BasePlugin {
  readonly changed = vi.fn();

  constructor() {
    super({
      id: "test",
      name: "Test",
      description: "Test plugin",
      version: "1.0.0",
      author: "YTMD",
      enabled: false,
      settings: { mode: "original", size: 100 }
    });
  }

  onEnable(): void {}
  onDisable(): void {}

  onSettingsChanged(next: Record<string, unknown>, previous: Record<string, unknown>): void {
    this.changed(next, previous);
  }
}

describe("BasePlugin settings lifecycle", () => {
  it("reports both merged next settings and the previous snapshot", () => {
    const plugin = new TestPlugin();

    plugin.updateSettings({ mode: "remake" });

    expect(plugin.currentSettings).toEqual({ mode: "remake", size: 100 });
    expect(plugin.changed).toHaveBeenCalledWith({ mode: "remake", size: 100 }, { mode: "original", size: 100 });
  });
});
