/**
 * Verifies `yarn make` outputs match release-artifacts.contract.json naming.
 * Run after `yarn make` on the current platform (CI: after matrix make step).
 */
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const contractPath = path.join(repoRoot, "release-artifacts.contract.json");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const version = packageJson.version;

function expand(template) {
  return template
    .replaceAll("{version}", version)
    .replaceAll("{arch}", process.env.VERIFY_MAKE_ARCH || "x64");
}

function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

const makeRoot = path.join(repoRoot, "out", "make");
if (!fs.existsSync(makeRoot)) {
  throw new Error("No out/make directory. Run `yarn make` first.");
}

const madeFiles = listFilesRecursive(makeRoot).map(f => path.basename(f));
const platform = process.platform;
const errors = [];

if (platform === "win32") {
  const expected = expand(contract.windows.primaryAsset);
  if (!madeFiles.includes(expected)) {
    errors.push(`Missing Windows Setup.exe: expected "${expected}", found: ${madeFiles.filter(f => f.endsWith(".exe")).join(", ") || "(none)"}`);
  }
  const setupMatches = madeFiles.filter(f => new RegExp(contract.windows.match, "i").test(f));
  if (setupMatches.length === 0) {
    errors.push(`No artifact matched Windows pattern ${contract.windows.match}`);
  }
} else if (platform === "darwin") {
  const arch = process.env.VERIFY_MAKE_ARCH || process.arch;
  const expected = expand(
    arch === "arm64"
      ? contract.macos.primaryAssets.find(a => a.includes("arm64"))
      : contract.macos.primaryAssets.find(a => a.includes("x64"))
  );
  if (expected && !madeFiles.includes(expected)) {
    // Forge ZIP naming can vary slightly; accept regex match as fallback.
    const anyZip = madeFiles.some(f => new RegExp(contract.macos.match, "i").test(f));
    if (!anyZip) {
      errors.push(`Missing macOS ZIP (expected ~"${expected}"): found ${madeFiles.filter(f => f.endsWith(".zip")).join(", ") || "(none)"}`);
    }
  }
} else if (platform === "linux") {
  const hasDeb = madeFiles.some(f => new RegExp(contract.linux.matchDeb, "i").test(f));
  const hasRpm = madeFiles.some(f => new RegExp(contract.linux.matchRpm, "i").test(f));
  if (!hasDeb && !hasRpm) {
    errors.push(`Missing Linux .deb/.rpm artifacts under out/make. Found: ${madeFiles.join(", ") || "(none)"}`);
  }
}

if (errors.length > 0) {
  throw new Error(`Make artifact verification failed:\n- ${errors.join("\n- ")}`);
}

console.log(`Verified make artifacts for ${platform} against release-artifacts.contract.json (version ${version}).`);
console.log(`Files: ${madeFiles.join(", ")}`);
