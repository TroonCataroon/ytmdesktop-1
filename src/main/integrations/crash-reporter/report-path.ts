import path from "path";

const CRASH_REPORT_FILENAME = /^crash-[a-z0-9_-]+\.json$/i;

export function resolveCrashReportPath(crashReportsDir: string, filename: unknown): string | null {
  if (typeof filename !== "string" || !CRASH_REPORT_FILENAME.test(filename) || path.basename(filename) !== filename) {
    return null;
  }

  const reportsRoot = path.resolve(crashReportsDir);
  const candidate = path.resolve(reportsRoot, filename);
  return path.dirname(candidate) === reportsRoot ? candidate : null;
}
