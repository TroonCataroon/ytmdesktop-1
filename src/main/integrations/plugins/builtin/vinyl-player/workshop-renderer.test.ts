import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

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
    }
  >();
  const handlers = new Map<string, (patch: Record<string, unknown>) => void>();
  const send = vi.fn();
  runInNewContext(script, {
    window: { electron: { ipcRenderer: { send, on: (channel: string, handler: (patch: Record<string, unknown>) => void) => handlers.set(channel, handler) } } },
    document: {
      getElementById(id: string) {
        const element = { textContent: "", value: "100", style: { setProperty: vi.fn() }, classList: { toggle: vi.fn() }, setAttribute: vi.fn() };
        elements.set(id, element);
        return element;
      }
    },
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: vi.fn()
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
});
