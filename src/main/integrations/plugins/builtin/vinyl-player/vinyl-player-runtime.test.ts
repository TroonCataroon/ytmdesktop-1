import { beforeEach, describe, expect, it, vi } from "vitest";

const electronHarness = vi.hoisted(() => {
  interface DisplayStub {
    id: number;
    workAreaSize: { width: number; height: number };
    workArea: { x: number; y: number; width: number; height: number };
  }

  class FakeWindow {
    readonly webContents;
    readonly eventHandlers = new Map<string, Array<() => void>>();
    readonly setMinimumSize = vi.fn();
    readonly setMaximumSize = vi.fn();
    readonly setAspectRatio = vi.fn();
    readonly setResizable = vi.fn((resizable: boolean) => {
      this.options.resizable = resizable;
    });
    readonly setMovable = vi.fn();
    readonly setOpacity = vi.fn();
    readonly setAlwaysOnTop = vi.fn();
    readonly loadFile = vi.fn();
    readonly loadURL = vi.fn();
    readonly show = vi.fn();
    readonly hide = vi.fn();
    readonly destroy = vi.fn(() => {
      this.destroyed = true;
    });
    destroyed = false;

    constructor(public options: Record<string, unknown>) {
      const webRequest = { onHeadersReceived: vi.fn() };
      this.webContents = {
        session: { webRequest },
        on: vi.fn(),
        send: vi.fn(),
        executeJavaScript: vi.fn().mockResolvedValue({}),
        isDestroyed: vi.fn(() => this.destroyed)
      };
    }

    on(event: string, callback: () => void): void {
      const handlers = this.eventHandlers.get(event) ?? [];
      handlers.push(callback);
      this.eventHandlers.set(event, handlers);
    }

    emit(event: string): void {
      for (const callback of this.eventHandlers.get(event) ?? []) callback();
    }

    getBounds(): { x: number; y: number; width: number; height: number } {
      return {
        x: Number(this.options.x ?? 0),
        y: Number(this.options.y ?? 0),
        width: Number(this.options.width),
        height: Number(this.options.height)
      };
    }

    getPosition(): [number, number] {
      const bounds = this.getBounds();
      return [bounds.x, bounds.y];
    }

    setSize(width: number, height: number): void {
      this.options.width = width;
      this.options.height = height;
      this.emit("resize");
    }

    setPosition(x: number, y: number): void {
      this.options.x = x;
      this.options.y = y;
      this.emit("move");
    }

    isDestroyed(): boolean {
      return this.destroyed;
    }
  }

  const state = {
    ready: true,
    readyPromise: Promise.resolve(),
    resolveReady: (): void => undefined,
    cursor: { x: 100, y: 100 },
    displays: [] as DisplayStub[],
    created: [] as FakeWindow[],
    defaultSessionHeaders: vi.fn(),
    ipcHandlers: new Map<string, Array<(...args: unknown[]) => void>>()
  };

  const resetReady = (ready: boolean): void => {
    state.ready = ready;
    state.readyPromise = new Promise<void>(resolve => {
      state.resolveReady = () => {
        state.ready = true;
        resolve();
      };
    });
    if (ready) state.resolveReady();
  };

  const BrowserWindow = vi.fn(function (options: Record<string, unknown>) {
    const window = new FakeWindow(options);
    state.created.push(window);
    return window;
  });

  return { BrowserWindow, FakeWindow, resetReady, state };
});

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    isReady: vi.fn(() => electronHarness.state.ready),
    whenReady: vi.fn(() => electronHarness.state.readyPromise)
  },
  BrowserWindow: Object.assign(electronHarness.BrowserWindow, {
    getAllWindows: vi.fn(() => []),
    getFocusedWindow: vi.fn(() => null)
  }),
  globalShortcut: { register: vi.fn(), unregister: vi.fn() },
  ipcMain: {
    on: vi.fn((channel: string, callback: (...args: unknown[]) => void) => {
      const handlers = electronHarness.state.ipcHandlers.get(channel) ?? [];
      handlers.push(callback);
      electronHarness.state.ipcHandlers.set(channel, handlers);
    }),
    removeAllListeners: vi.fn((channel: string) => electronHarness.state.ipcHandlers.delete(channel))
  },
  screen: {
    getAllDisplays: vi.fn(() => electronHarness.state.displays),
    getPrimaryDisplay: vi.fn(() => electronHarness.state.displays[0]),
    getCursorScreenPoint: vi.fn(() => electronHarness.state.cursor),
    getDisplayNearestPoint: vi.fn(
      (point: { x: number; y: number }) =>
        electronHarness.state.displays.find(
          display =>
            point.x >= display.workArea.x &&
            point.x < display.workArea.x + display.workArea.width &&
            point.y >= display.workArea.y &&
            point.y < display.workArea.y + display.workArea.height
        ) ?? electronHarness.state.displays[0]
    )
  },
  session: {
    defaultSession: { webRequest: { onHeadersReceived: electronHarness.state.defaultSessionHeaders } }
  }
}));

vi.mock("../../../../player-state-store", () => ({
  VideoState: { Paused: 0, Playing: 1 },
  default: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getState: vi.fn(() => null)
  }
}));

vi.mock("../../../../windows/wallpaper", () => ({ attachToDesktop: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../index", () => ({ pluginManager: { getPlugin: vi.fn(() => null), updatePluginSettings: vi.fn(() => true) } }));

import { VinylPlayerPlugin } from "./index";
import { pluginManager } from "../../index";
import { PlayerState, VideoState } from "../../../../player-state-store";

type PluginInternals = {
  initialized: boolean;
  vinylWindow: { window: InstanceType<typeof electronHarness.FakeWindow>; isVisible: boolean } | null;
  createVinylWindow(): void;
  destroyVinylWindow(): void;
  fitWorkshopWindowToCurrentDisplay(window: InstanceType<typeof electronHarness.FakeWindow>): void;
  getYtmViewWebContents(): unknown;
  refreshFromYtmViewSnapshot(): Promise<void>;
  updateVinylDisplay(): void;
  updatePlayerState(state: PlayerState): void;
};

const primary = { id: 1, workAreaSize: { width: 1280, height: 720 }, workArea: { x: 0, y: 0, width: 1280, height: 720 } };
const secondary = { id: 2, workAreaSize: { width: 800, height: 600 }, workArea: { x: 1280, y: 0, width: 800, height: 600 } };

function internals(plugin: VinylPlayerPlugin): PluginInternals {
  return plugin as unknown as PluginInternals;
}

function createPlugin(settings: Record<string, unknown> = {}): { plugin: VinylPlayerPlugin; window: InstanceType<typeof electronHarness.FakeWindow> } {
  const plugin = new VinylPlayerPlugin();
  plugin.updateSettings(settings);
  internals(plugin).createVinylWindow();
  const window = internals(plugin).vinylWindow?.window;
  if (!window) throw new Error("Vinyl window was not created");
  return { plugin, window };
}

describe("VinylPlayerPlugin runtime regressions", () => {
  it("persists automatic geometry through the existing plugin manager", () => {
    vi.useFakeTimers();
    const { window } = createPlugin();
    window.setSize(800, 450);
    window.setPosition(100, 100);
    expect(pluginManager.updatePluginSettings).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(pluginManager.updatePluginSettings).toHaveBeenLastCalledWith("vinyl-player", {
      savedWindowX: window.getBounds().x,
      savedWindowY: window.getBounds().y,
      savedWindowWidth: window.getBounds().width,
      savedWindowHeight: window.getBounds().height,
      wasVisibleOnClose: false
    });
    vi.useRealTimers();
  });

  it("sends volume changes even without a track or progress change", () => {
    const { plugin, window } = createPlugin();
    const state = {
      videoDetails: { title: "Track", author: "Artist", thumbnails: [], durationSeconds: 120 },
      videoProgress: 5,
      trackState: VideoState.Paused,
      volume: 42
    } as unknown as PlayerState;
    internals(plugin).updatePlayerState(state);
    expect(window.webContents.send).toHaveBeenLastCalledWith("vinyl-player:update-track", expect.objectContaining({ volume: 42 }));
    internals(plugin).updatePlayerState({ ...state, volume: 0 });
    expect(window.webContents.send).toHaveBeenLastCalledWith("vinyl-player:update-track", expect.objectContaining({ volume: 0 }));
    internals(plugin).updatePlayerState({ ...state, videoDetails: null, volume: 17 });
    expect(window.webContents.send).toHaveBeenLastCalledWith("vinyl-player:update-track", expect.objectContaining({ volume: 17, durationSeconds: 0 }));
  });

  it("persists settings-driven Workshop geometry without native completion events", () => {
    const { plugin, window } = createPlugin();
    internals(plugin).initialized = true;
    plugin.updateSettings({ windowSize: 500 });
    expect(pluginManager.updatePluginSettings).toHaveBeenLastCalledWith(
      "vinyl-player",
      expect.objectContaining({
        savedWindowWidth: window.getBounds().width,
        savedWindowHeight: window.getBounds().height
      })
    );
  });

  it.each(["custom", "remake", "workshop"])("recreates %s resize limits while keeping wallpaper fixed", widgetMode => {
    const { plugin } = createPlugin({ widgetMode, enableResizing: false, wallpaperMode: widgetMode === "workshop" });
    internals(plugin).initialized = true;
    plugin.updateSettings({ enableResizing: true, windowSize: 420 });
    const window = internals(plugin).vinylWindow!.window;
    expect(window.options.resizable).toBe(widgetMode !== "workshop");
    expect(window.options.maxWidth).toBeUndefined();
    expect(window.options.minWidth).toBe(widgetMode === "workshop" ? undefined : 160);
  });
  beforeEach(() => {
    vi.clearAllMocks();
    electronHarness.state.created.length = 0;
    electronHarness.state.ipcHandlers.clear();
    electronHarness.state.displays = [primary, secondary];
    electronHarness.state.cursor = { x: 100, y: 100 };
    electronHarness.resetReady(true);
  });

  it("uses a named in-memory session for vinyl CSP and removes only that listener", () => {
    const { plugin, window } = createPlugin();
    const webPreferences = window.options.webPreferences as Record<string, unknown>;

    expect(webPreferences.partition).toBe("vinyl-player-dev");
    expect(String(webPreferences.partition)).not.toMatch(/^persist:/);
    expect(window.webContents.session.webRequest.onHeadersReceived).toHaveBeenCalledOnce();
    expect(electronHarness.state.defaultSessionHeaders).not.toHaveBeenCalled();

    internals(plugin).destroyVinylWindow();

    expect(window.webContents.session.webRequest.onHeadersReceived).toHaveBeenLastCalledWith(null);
  });

  it("fits oversized offscreen restored geometry into the cursor display", () => {
    const { window } = createPlugin({ savedWindowWidth: 1920, savedWindowHeight: 1080, savedWindowX: 3000, savedWindowY: 2000 });

    expect(window.getBounds()).toEqual({ x: 0, y: 0, width: 1280, height: 720 });
  });

  it("selects a visible secondary display and fits both restore and settings resize through 16:9", () => {
    const { plugin, window } = createPlugin({ windowSize: 500, savedWindowX: 1400, savedWindowY: 20 });

    expect(window.getBounds()).toEqual({ x: 1280, y: 20, width: 800, height: 450 });

    internals(plugin).initialized = true;
    plugin.updateSettings({ windowSize: 600 });

    expect(window.getBounds()).toEqual({ x: 1280, y: 20, width: 800, height: 450 });
    expect(window.setMaximumSize).toHaveBeenLastCalledWith(800, 450);
  });

  it("refreshes resize limits when an already-fitting window moves to a smaller display", () => {
    const { plugin, window } = createPlugin({ savedWindowWidth: 640, savedWindowHeight: 360, savedWindowX: 100, savedWindowY: 100 });
    window.options.x = 1300;
    window.options.y = 100;

    internals(plugin).fitWorkshopWindowToCurrentDisplay(window);

    expect(window.getBounds()).toEqual({ x: 1300, y: 100, width: 640, height: 360 });
    expect(window.setMaximumSize).toHaveBeenLastCalledWith(800, 450);
    const maximumCalls = window.setMaximumSize.mock.calls.length;

    internals(plugin).fitWorkshopWindowToCurrentDisplay(window);

    expect(window.setMaximumSize).toHaveBeenCalledTimes(maximumCalls);
  });

  it("cancels stale enable and show continuations after disable", async () => {
    electronHarness.resetReady(false);
    const plugin = new VinylPlayerPlugin();

    plugin.onEnable();
    expect(plugin.showVinylWindow()).toBe(false);
    plugin.updateSettings({ widgetMode: "remake" });
    expect(electronHarness.state.created).toHaveLength(0);
    plugin.onDisable();
    electronHarness.state.resolveReady();
    await electronHarness.state.readyPromise;
    await Promise.resolve();

    expect(electronHarness.state.created).toHaveLength(0);
    expect(electronHarness.state.ipcHandlers.size).toBe(0);
  });

  it("allows only the newest enable generation to create the window", async () => {
    electronHarness.resetReady(false);
    const plugin = new VinylPlayerPlugin();

    plugin.onEnable();
    plugin.onDisable();
    plugin.onEnable();
    electronHarness.state.resolveReady();
    await electronHarness.state.readyPromise;
    await Promise.resolve();

    expect(electronHarness.state.created).toHaveLength(1);
  });

  it.each(["disable", "recreate"] as const)("drops a late player snapshot after %s", async transition => {
    const { plugin } = createPlugin();
    const pluginInternals = internals(plugin);
    pluginInternals.initialized = true;
    let resolveSnapshot: (snapshot: Record<string, unknown>) => void = () => undefined;
    const snapshotPromise = new Promise<Record<string, unknown>>(resolve => {
      resolveSnapshot = resolve;
    });
    const ytmView = {
      executeJavaScript: vi.fn(() => snapshotPromise),
      isDestroyed: vi.fn(() => false)
    };
    pluginInternals.getYtmViewWebContents = () => ytmView;
    pluginInternals.updateVinylDisplay = vi.fn();

    const pendingRefresh = pluginInternals.refreshFromYtmViewSnapshot();
    if (transition === "disable") {
      plugin.onDisable();
    } else {
      pluginInternals.destroyVinylWindow();
      pluginInternals.createVinylWindow();
    }
    resolveSnapshot({ playing: true, title: "Late track", author: "Late artist", thumbnails: [] });
    await pendingRefresh;

    expect(pluginInternals.updateVinylDisplay).not.toHaveBeenCalled();
  });

  it("honors fixed Workshop sizing and releases limits when resizing is enabled", () => {
    const { plugin, window } = createPlugin({ enableResizing: false, savedWindowWidth: 640, savedWindowHeight: 360, savedWindowX: 1300, savedWindowY: 50 });

    expect(window.options.resizable).toBe(false);
    expect(window.options.minWidth).toBe(640);
    expect(window.options.minHeight).toBe(360);
    expect(window.options.maxWidth).toBe(640);
    expect(window.options.maxHeight).toBe(360);

    internals(plugin).initialized = true;
    plugin.updateSettings({ enableResizing: true });

    expect(window.setResizable).toHaveBeenLastCalledWith(true);
    expect(window.setMinimumSize).toHaveBeenCalledWith(0, 0);
    expect(window.setMaximumSize).toHaveBeenCalledWith(0, 0);
    expect(window.setMinimumSize).toHaveBeenLastCalledWith(427, 240);
    expect(window.setMaximumSize).toHaveBeenLastCalledWith(800, 450);
  });

  it("keeps Workshop wallpaper geometry unconstrained on a non-16:9 display", () => {
    electronHarness.state.displays = [{ id: 1, workAreaSize: { width: 1280, height: 1024 }, workArea: { x: 0, y: 0, width: 1280, height: 1024 } }];

    const { window } = createPlugin({ wallpaperMode: true });

    expect(window.getBounds()).toEqual({ x: 0, y: 0, width: 1280, height: 1024 });
    expect(window.options.maxWidth).toBeUndefined();
    expect(window.options.maxHeight).toBeUndefined();
    expect(window.options.resizable).toBe(false);
    expect(window.setAspectRatio).not.toHaveBeenCalled();
  });
});
