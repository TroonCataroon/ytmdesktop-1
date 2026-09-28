export interface UpdateSettingsInput {
  checkIntervalMinutes?: number;
  checkOnStartup?: boolean;
  autoInstall?: boolean;
  betaChannel?: boolean;
}

export function normalizeUpdateSettings(value: unknown): UpdateSettingsInput | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  const result: UpdateSettingsInput = {};
  if (typeof input.checkIntervalMinutes === "number" && Number.isFinite(input.checkIntervalMinutes)) {
    result.checkIntervalMinutes = Math.max(15, input.checkIntervalMinutes);
  }
  if (typeof input.checkOnStartup === "boolean") result.checkOnStartup = input.checkOnStartup;
  if (typeof input.autoInstall === "boolean") result.autoInstall = input.autoInstall;
  if (typeof input.betaChannel === "boolean") result.betaChannel = input.betaChannel;
  return result;
}
