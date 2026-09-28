export const WORKSHOP_SCENE_WIDTH = 1920;
export const WORKSHOP_SCENE_HEIGHT = 1080;
export const WORKSHOP_ASPECT = WORKSHOP_SCENE_WIDTH / WORKSHOP_SCENE_HEIGHT;
export const WORKSHOP_MIN_HEIGHT = 240;
export const WORKSHOP_MIN_WIDTH = Math.ceil(WORKSHOP_MIN_HEIGHT * WORKSHOP_ASPECT);

export interface WorkAreaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

export function workshopFitsDisplay(width: unknown, height: unknown, maximumWidth: unknown, maximumHeight: unknown): boolean {
  const normalizedWidth = positiveNumber(width);
  const normalizedHeight = positiveNumber(height);
  const normalizedMaximumWidth = positiveNumber(maximumWidth);
  const normalizedMaximumHeight = positiveNumber(maximumHeight);
  if (normalizedWidth === null || normalizedHeight === null || normalizedMaximumWidth === null || normalizedMaximumHeight === null) return false;
  return hasWorkshopAspect(normalizedWidth, normalizedHeight) && normalizedWidth <= normalizedMaximumWidth && normalizedHeight <= normalizedMaximumHeight;
}

export function normalizeWorkshopSavedSize(settings: Record<string, unknown>, currentMode: unknown): Record<string, unknown> {
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

export function fitWorkshopSize(currentHeight: unknown, maximumWidth: number, maximumHeight: number): { width: number; height: number } {
  const safeMaxWidth = Math.max(1, Math.floor(maximumWidth));
  const safeMaxHeight = Math.max(1, Math.floor(maximumHeight));
  const maximumAspectHeight = Math.max(1, Math.floor(safeMaxWidth / WORKSHOP_ASPECT));
  const usableMaximumHeight = Math.min(safeMaxHeight, maximumAspectHeight);
  const requestedHeight = Math.max(WORKSHOP_MIN_HEIGHT, positiveNumber(currentHeight) ?? 300);
  const minimumHeight = Math.min(WORKSHOP_MIN_HEIGHT, usableMaximumHeight);
  const height = Math.max(minimumHeight, Math.min(Math.round(requestedHeight), usableMaximumHeight));
  const width = Math.min(safeMaxWidth, Math.max(1, Math.round(height * WORKSHOP_ASPECT)));
  return { width, height };
}

export function clampWorkshopPosition(currentX: unknown, currentY: unknown, width: number, height: number, workArea: WorkAreaBounds): { x: number; y: number } {
  const maximumX = workArea.x + Math.max(0, workArea.width - width);
  const maximumY = workArea.y + Math.max(0, workArea.height - height);
  const requestedX = Number(currentX);
  const requestedY = Number(currentY);
  const fallbackX = workArea.x + Math.max(0, Math.floor((workArea.width - width) / 2));
  const fallbackY = workArea.y + Math.max(0, Math.floor((workArea.height - height) / 2));

  return {
    x: Math.floor(Math.max(workArea.x, Math.min(Number.isFinite(requestedX) ? requestedX : fallbackX, maximumX))),
    y: Math.floor(Math.max(workArea.y, Math.min(Number.isFinite(requestedY) ? requestedY : fallbackY, maximumY)))
  };
}

export function rectangleIntersectionArea(first: WorkAreaBounds, second: WorkAreaBounds): number {
  const width = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
  const height = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
  return width * height;
}
