export const WORKSHOP_SCENE_WIDTH = 1920;
export const WORKSHOP_SCENE_HEIGHT = 1080;
export const WORKSHOP_ASPECT = WORKSHOP_SCENE_WIDTH / WORKSHOP_SCENE_HEIGHT;
export const WORKSHOP_MIN_HEIGHT = 240;
export const WORKSHOP_MIN_WIDTH = Math.ceil(WORKSHOP_MIN_HEIGHT * WORKSHOP_ASPECT);

const ASPECT_TOLERANCE = 0.015;

function positiveNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function hasWorkshopAspect(width: unknown, height: unknown): boolean {
  const normalizedWidth = positiveNumber(width);
  const normalizedHeight = positiveNumber(height);
  if (normalizedWidth === null || normalizedHeight === null) return false;

  return Math.abs(normalizedWidth / normalizedHeight - WORKSHOP_ASPECT) <= ASPECT_TOLERANCE;
}

export function normalizeWorkshopSavedSize(
  settings: Record<string, unknown>,
  currentMode: unknown
): Record<string, unknown> {
  const nextSettings = { ...settings };
  const requestedMode = typeof nextSettings.widgetMode === "string" ? nextSettings.widgetMode : currentMode;
  if (requestedMode !== "workshop") return nextSettings;

  const savedWidth = positiveNumber(nextSettings.savedWindowWidth);
  const savedHeight = positiveNumber(nextSettings.savedWindowHeight);

  if (savedHeight !== null) {
    nextSettings.savedWindowHeight = Math.round(savedHeight);
    nextSettings.savedWindowWidth = Math.round(savedHeight * WORKSHOP_ASPECT);
  } else if (savedWidth !== null) {
    nextSettings.savedWindowWidth = Math.round(savedWidth);
    nextSettings.savedWindowHeight = Math.round(savedWidth / WORKSHOP_ASPECT);
  }

  return nextSettings;
}

export function fitWorkshopSize(
  currentHeight: unknown,
  maximumWidth: number,
  maximumHeight: number
): { width: number; height: number } {
  // A display can theoretically report a work area smaller than the Workshop's
  // minimum usable geometry. When "fit on display" and "stay usable" conflict,
  // preserve the minimum geometry and let the existing boundary logic place it.
  const safeMaxWidth = Math.max(WORKSHOP_MIN_WIDTH, Math.floor(maximumWidth));
  const safeMaxHeight = Math.max(WORKSHOP_MIN_HEIGHT, Math.floor(maximumHeight));
  const requestedHeight = Math.max(WORKSHOP_MIN_HEIGHT, positiveNumber(currentHeight) ?? 300);

  let height = Math.max(WORKSHOP_MIN_HEIGHT, Math.min(Math.round(requestedHeight), safeMaxHeight));
  let width = Math.round(height * WORKSHOP_ASPECT);

  if (width > safeMaxWidth) {
    width = safeMaxWidth;
    height = Math.max(WORKSHOP_MIN_HEIGHT, Math.round(width / WORKSHOP_ASPECT));
  }

  if (height > safeMaxHeight) {
    height = safeMaxHeight;
    width = Math.max(WORKSHOP_MIN_WIDTH, Math.round(height * WORKSHOP_ASPECT));
  }

  return { width, height };
}
