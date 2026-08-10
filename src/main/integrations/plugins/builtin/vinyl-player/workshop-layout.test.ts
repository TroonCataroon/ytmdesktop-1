import { describe, expect, it } from "vitest";
import {
  WORKSHOP_ASPECT,
  WORKSHOP_MIN_HEIGHT,
  WORKSHOP_MIN_WIDTH,
  fitWorkshopSize,
  hasWorkshopAspect,
  normalizeWorkshopSavedSize
} from "./workshop-layout";

describe("Workshop layout contract", () => {
  it("matches the authored 16:9 scene", () => {
    expect(WORKSHOP_ASPECT).toBeCloseTo(16 / 9, 8);
    expect(hasWorkshopAspect(1920, 1080)).toBe(true);
    expect(hasWorkshopAspect(600, 480)).toBe(false);
  });

  it("repairs persisted Workshop dimensions from the abandoned 5:4 integration", () => {
    const repaired = normalizeWorkshopSavedSize(
      {
        widgetMode: "workshop",
        savedWindowWidth: 600,
        savedWindowHeight: 480
      },
      "workshop"
    );

    expect(repaired.savedWindowHeight).toBe(480);
    expect(repaired.savedWindowWidth).toBe(Math.round(480 * (16 / 9)));
  });

  it("does not rewrite dimensions belonging to another player mode", () => {
    const settings = {
      widgetMode: "remake",
      savedWindowWidth: 922,
      savedWindowHeight: 282
    };

    expect(normalizeWorkshopSavedSize(settings, "workshop")).toEqual(settings);
  });

  it("fits a 16:9 Workshop window inside the active display", () => {
    const fitted = fitWorkshopSize(800, 1280, 720);

    expect(fitted.width).toBeLessThanOrEqual(1280);
    expect(fitted.height).toBeLessThanOrEqual(720);
    expect(fitted.width / fitted.height).toBeCloseTo(16 / 9, 2);
  });

  it("preserves the minimum usable Workshop geometry when the work area is impossibly small", () => {
    const fitted = fitWorkshopSize(300, 100, 100);

    expect(fitted.width).toBe(WORKSHOP_MIN_WIDTH);
    expect(fitted.height).toBe(WORKSHOP_MIN_HEIGHT);
    expect(fitted.width / fitted.height).toBeCloseTo(16 / 9, 2);
  });
});
