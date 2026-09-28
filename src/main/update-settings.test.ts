import { describe, expect, it } from "vitest";
import { normalizeUpdateSettings } from "./update-settings";

describe("normalizeUpdateSettings", () => {
  it.each([null, [], "settings", 1])("rejects non-record input: %j", input => {
    expect(normalizeUpdateSettings(input)).toBeNull();
  });

  it("clamps the interval and retains only typed update settings", () => {
    expect(
      normalizeUpdateSettings({
        checkIntervalMinutes: 1,
        checkOnStartup: true,
        autoInstall: false,
        betaChannel: true,
        ignored: "value"
      })
    ).toEqual({ checkIntervalMinutes: 15, checkOnStartup: true, autoInstall: false, betaChannel: true });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("drops a non-finite interval: %s", interval => {
    expect(normalizeUpdateSettings({ checkIntervalMinutes: interval })).toEqual({});
  });
});
