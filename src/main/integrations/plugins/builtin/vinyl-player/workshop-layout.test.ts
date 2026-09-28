import { describe, expect, it } from "vitest";
import {
  WORKSHOP_ASPECT,
  clampWorkshopPosition,
  fitWorkshopSize,
  hasWorkshopAspect,
  normalizeWorkshopSavedSize,
  rectangleIntersectionArea,
  workshopFitsDisplay
} from "./workshop-layout";

describe("Workshop layout contract", () => {
  it("matches the authored 16:9 scene", () => {
    expect(WORKSHOP_ASPECT).toBeCloseTo(16 / 9, 8);
    expect(hasWorkshopAspect(1920, 1080)).toBe(true);
    expect(hasWorkshopAspect(600, 480)).toBe(false);
  });

  it("repairs persisted dimensions from the abandoned 5:4 integration", () => {
    expect(normalizeWorkshopSavedSize({ widgetMode: "workshop", savedWindowWidth: 600, savedWindowHeight: 480 }, "workshop")).toMatchObject({
      savedWindowHeight: 480,
      savedWindowWidth: Math.round(480 * (16 / 9))
    });
  });

  it("does not rewrite dimensions belonging to another mode", () => {
    const settings = { widgetMode: "remake", savedWindowWidth: 922, savedWindowHeight: 282 };
    expect(normalizeWorkshopSavedSize(settings, "workshop")).toEqual(settings);
  });

  it("fits the window inside the display at 16:9", () => {
    const fitted = fitWorkshopSize(800, 1280, 720);
    expect(fitted.width).toBeLessThanOrEqual(1280);
    expect(fitted.height).toBeLessThanOrEqual(720);
    expect(fitted.width / fitted.height).toBeCloseTo(16 / 9, 2);
  });

  it("keeps the entire scene visible when a display is smaller than the normal minimum", () => {
    const fitted = fitWorkshopSize(300, 100, 100);
    expect(fitted).toEqual({ width: 100, height: 56 });
    expect(hasWorkshopAspect(fitted.width, fitted.height)).toBe(true);
  });

  it("requires valid geometry to fit the display", () => {
    expect(workshopFitsDisplay(1280, 720, 1280, 720)).toBe(true);
    expect(workshopFitsDisplay(1920, 1080, 1280, 720)).toBe(false);
  });

  it("clamps restored coordinates into the selected work area", () => {
    expect(clampWorkshopPosition(3000, 2000, 800, 450, { x: 0, y: 0, width: 1280, height: 720 })).toEqual({ x: 480, y: 270 });
    expect(clampWorkshopPosition(undefined, undefined, 800, 450, { x: 1280, y: 0, width: 800, height: 600 })).toEqual({ x: 1280, y: 75 });
  });

  it("measures display overlap without treating merely-near bounds as visible", () => {
    const primary = { x: 0, y: 0, width: 1280, height: 720 };
    expect(rectangleIntersectionArea({ x: 1200, y: 0, width: 200, height: 200 }, primary)).toBe(16000);
    expect(rectangleIntersectionArea({ x: 3000, y: 2000, width: 200, height: 200 }, primary)).toBe(0);
  });
});
