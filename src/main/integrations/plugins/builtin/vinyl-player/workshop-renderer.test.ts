import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

interface PointerFixture {
  clientX: number;
  clientY: number;
  pointerId: number;
  preventDefault(): void;
}

class MatrixFixture {
  a: number;
  b: number;
  c: number;
  d: number;
  constructor(value: string | number[]) {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const angle = radians(value === "deck" ? -38 : typeof value === "string" ? Number(value.match(/[-\d.]+/)?.[0] ?? 18) : 0);
    const squash = value === "deck" ? Math.cos(radians(58)) : 1;
    [this.a, this.b, this.c, this.d] = Array.isArray(value) ? value : [Math.cos(angle), Math.sin(angle) * squash, -Math.sin(angle), Math.cos(angle) * squash];
  }
  inverse(): MatrixFixture {
    const determinant = this.a * this.d - this.b * this.c;
    return new MatrixFixture([this.d / determinant, -this.b / determinant, -this.c / determinant, this.a / determinant]);
  }
  transformPoint(point: { x: number; y: number }): { x: number; y: number } {
    return { x: this.a * point.x + this.c * point.y, y: this.b * point.x + this.d * point.y };
  }
}

it("merges real Workshop track deltas, reflects volume without feedback, and accepts idle resets", () => {
  const html = readFileSync("src/main/integrations/plugins/builtin/vinyl-player/vinyl-workshop.html", "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (!script) throw new Error("Workshop script missing");
  const elements = new Map<
    string,
    {
      textContent: string;
      value: string;
      style: Record<string, unknown>;
      classList: { toggle: ReturnType<typeof vi.fn> };
      setAttribute: ReturnType<typeof vi.fn>;
      getAttribute(name: string): string | undefined;
      getBoundingClientRect(): { x: number; y: number; left: number; width: number };
      onpointerdown?: (event: PointerFixture) => void;
      onpointermove?: (event: PointerFixture) => void;
      onpointerup?: (event: PointerFixture) => void;
      onpointercancel?: () => void;
    }
  >();
  const handlers = new Map<string, (patch: Record<string, unknown>) => void>();
  const send = vi.fn();
  const events = new Map<string, (event: { key: string; target: unknown; preventDefault(): void }) => void>();
  runInNewContext(script, {
    window: { electron: { ipcRenderer: { send, on: (channel: string, handler: (patch: Record<string, unknown>) => void) => handlers.set(channel, handler) } } },
    document: {
      getElementById(id: string) {
        const attributes = new Map<string, string>();
        const element = {
          textContent: "",
          value: "100",
          style: { setProperty: vi.fn() },
          classList: { toggle: vi.fn() },
          setAttribute: vi.fn((name: string, value: string) => attributes.set(name, value)),
          getAttribute: (name: string) => attributes.get(name),
          getBoundingClientRect: () => ({ x: 900, y: 500, left: 900, width: 200 }),
          closest: () => "deck",
          setPointerCapture: vi.fn(),
          releasePointerCapture: vi.fn()
        };
        elements.set(id, element);
        return element;
      }
    },
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: (name: string, handler: (event: { key: string; target: unknown; preventDefault(): void }) => void) => events.set(name, handler),
    DOMMatrix: MatrixFixture,
    getComputedStyle: (element: unknown) => ({
      transform: element === "deck" ? "deck" : (elements.get("tonearm")?.style.transform ?? "rotate(18deg)"),
      transformOrigin: "77.5px 36px"
    })
  });
  const update = handlers.get("vinyl-player:update-track");
  if (!update) throw new Error("Track handler missing");
  update({
    title: "Track",
    artist: "Artist",
    thumbnail: "https://example.com/art.jpg",
    isPlaying: true,
    durationSeconds: 120,
    progressSeconds: 60,
    volume: 42
  });
  const artwork = elements.get("albumArt")?.style.backgroundImage;
  update({ progressSeconds: 62 });
  expect(elements.get("trackTitle")?.textContent).toBe("Track");
  expect(elements.get("trackArtist")?.textContent).toBe("Artist");
  expect(elements.get("albumArt")?.style.backgroundImage).toBe(artwork);
  expect(elements.get("playPauseBtn")?.textContent).toBe("Ⅱ");
  expect(elements.get("currTime")?.textContent).toBe("1:02");
  expect(elements.get("totalTime")?.textContent).toBe("2:00");
  expect(elements.get("volumeRange")?.value).toBe("42");
  expect(elements.get("volumeValue")?.value).toBe("42%");
  elements.get("volumeRange")!.value = "50";
  update({ progressSeconds: 63 });
  expect(elements.get("volumeRange")?.value).toBe("50");
  update({ volume: 0, isPlaying: false });
  expect(elements.get("volumeRange")?.value).toBe("0");
  expect(elements.get("volumeValue")?.value).toBe("0%");
  expect(elements.get("playPauseBtn")?.textContent).toBe("▶");
  expect(elements.get("totalTime")?.textContent).toBe("2:00");
  update({ title: "", artist: "", thumbnail: "", durationSeconds: 0, progressSeconds: 0 });
  expect(elements.get("trackTitle")?.textContent).toBe("");
  expect(elements.get("trackArtist")?.textContent).toBe("");
  expect(elements.get("albumArt")?.style.backgroundImage).toBe("");
  expect(elements.get("currTime")?.textContent).toBe("0:00");
  expect(elements.get("totalTime")?.textContent).toBe("0:00");
  expect(send).not.toHaveBeenCalled();

  update({ isPlaying: true, durationSeconds: 120, progressSeconds: 60 });
  const tonearm = elements.get("tonearm")!;
  const projected = new MatrixFixture("deck");
  for (const scale of [0.5, 1.2]) {
    const pointer = (angle: number): PointerFixture => {
      const radians = (angle * Math.PI) / 180;
      const local = projected.transformPoint({ x: -Math.sin(radians) * 240, y: Math.cos(radians) * 240 });
      return { clientX: 900 + local.x * scale, clientY: 500 + local.y * scale, pointerId: 1, preventDefault: vi.fn() };
    };
    update({ progressSeconds: 60 });
    // Grab off the arm's centerline, then follow its projected arc. No click jump.
    tonearm.onpointerdown!(pointer(23));
    tonearm.onpointermove!(pointer(23));
    expect(Number(tonearm.getAttribute("aria-valuenow"))).toBe(50);
    tonearm.onpointermove!(pointer(36));
    expect(Number(tonearm.getAttribute("aria-valuenow"))).toBe(100);
    const calls = send.mock.calls.length;
    tonearm.onpointerup!(pointer(36));
    expect(send).toHaveBeenLastCalledWith("vinyl-player:seek", 120);
    expect(send).toHaveBeenCalledTimes(calls + 1);
    expect(tonearm.style.transition).toBe("");
    tonearm.onpointerdown!(pointer(36));
    tonearm.onpointercancel!();
    tonearm.onpointermove!(pointer(23));
    expect(send).toHaveBeenCalledTimes(calls + 1);
  }
  update({ progressSeconds: 60 });
  events.get("keydown")!({ key: "ArrowRight", target: tonearm, preventDefault: vi.fn() });
  expect(send).toHaveBeenLastCalledWith("vinyl-player:seek", 65);
  elements.get("progressBar")!.onpointerdown!({ clientX: 950, clientY: 500, pointerId: 1, preventDefault: vi.fn() });
  expect(send).toHaveBeenLastCalledWith("vinyl-player:seek", 30);
});
