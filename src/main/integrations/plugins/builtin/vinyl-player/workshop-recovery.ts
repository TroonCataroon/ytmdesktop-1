import { app, BrowserWindow, screen } from "electron";
import { VinylPlayerPlugin as LegacyVinylPlayerPlugin } from "./index";
import {
  WORKSHOP_ASPECT,
  WORKSHOP_SCENE_HEIGHT,
  WORKSHOP_SCENE_WIDTH,
  fitWorkshopSize,
  hasWorkshopAspect,
  normalizeWorkshopSavedSize
} from "./workshop-layout";

type MutableWorkshopGeometry = {
  WORKSHOP_DEFAULT_WIDTH: number;
  WORKSHOP_DEFAULT_HEIGHT: number;
  WORKSHOP_ASPECT: number;
};

/**
 * Compatibility recovery layer for the Workshop player.
 *
 * The Workshop renderer is authored as a fixed 1920x1080 scene, while the
 * legacy Electron integration still described it as 600x480. Keeping this
 * adapter separate lets us restore the visual contract without replacing the
 * newer playback, IPC, persistence, 6K Labs, and packaging work in index.ts.
 */
export class VinylPlayerPlugin extends LegacyVinylPlayerPlugin {
  private workshopRecoveryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();

    // The legacy class uses these runtime statics when it computes Workshop
    // window sizes. TypeScript `private readonly` is compile-time only here,
    // so correcting the values once preserves the existing implementation.
    const geometry = LegacyVinylPlayerPlugin as unknown as MutableWorkshopGeometry;
    geometry.WORKSHOP_DEFAULT_WIDTH = WORKSHOP_SCENE_WIDTH;
    geometry.WORKSHOP_DEFAULT_HEIGHT = WORKSHOP_SCENE_HEIGHT;
    geometry.WORKSHOP_ASPECT = WORKSHOP_ASPECT;
  }

  override updateSettings(newSettings: Record<string, unknown>): void {
    const currentMode = typeof this.settings.widgetMode === "string" ? this.settings.widgetMode : "workshop";
    super.updateSettings(normalizeWorkshopSavedSize(newSettings, currentMode));
  }

  override onEnable(): void {
    super.onEnable();
    this.scheduleWorkshopGeometryRecovery();
  }

  override onDisable(): void {
    if (this.workshopRecoveryTimer) {
      clearTimeout(this.workshopRecoveryTimer);
      this.workshopRecoveryTimer = null;
    }
    super.onDisable();
  }

  override onSettingsChanged(newSettings: Record<string, unknown>, previousSettings: Record<string, unknown>): void {
    super.onSettingsChanged(newSettings, previousSettings);
    this.scheduleWorkshopGeometryRecovery();
  }

  private scheduleWorkshopGeometryRecovery(): void {
    if (this.workshopRecoveryTimer) {
      clearTimeout(this.workshopRecoveryTimer);
      this.workshopRecoveryTimer = null;
    }

    void app.whenReady().then(() => {
      this.workshopRecoveryTimer = setTimeout(() => {
        this.workshopRecoveryTimer = null;
        this.enforceWorkshopGeometry();
      }, 0);
    });
  }

  private enforceWorkshopGeometry(): void {
    if (this.settings.widgetMode !== "workshop" || this.settings.wallpaperMode) return;

    const workshopWindow = BrowserWindow.getAllWindows().find(window => !window.isDestroyed() && window.getTitle() === "Workshop Widget");
    if (!workshopWindow) return;

    // Lock interactive resizing to the same aspect ratio as the authored art.
    workshopWindow.setAspectRatio(WORKSHOP_ASPECT);

    const [currentWidth, currentHeight] = workshopWindow.getSize();
    if (hasWorkshopAspect(currentWidth, currentHeight)) return;

    const display = screen.getDisplayMatching(workshopWindow.getBounds());
    const nextSize = fitWorkshopSize(currentHeight, display.workArea.width, display.workArea.height);
    workshopWindow.setSize(nextSize.width, nextSize.height, false);
  }
}
