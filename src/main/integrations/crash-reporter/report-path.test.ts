import path from "path";
import { describe, expect, it } from "vitest";
import { resolveCrashReportPath } from "./report-path";

describe("resolveCrashReportPath", () => {
  const reportsDir = path.resolve("tmp", "crash-reports");

  it("accepts generated crash report filenames", () => {
    expect(resolveCrashReportPath(reportsDir, "crash-error-2026-07-10T12-00-00-000Z.json")).toBe(
      path.join(reportsDir, "crash-error-2026-07-10T12-00-00-000Z.json")
    );
  });

  it.each(["../settings.json", "..\\settings.json", "crash-error.json/../../settings.json", "settings.json", "crash-error.txt", ""])(
    "rejects unsafe or unrelated filename %s",
    filename => {
      expect(resolveCrashReportPath(reportsDir, filename)).toBeNull();
    }
  );
});
