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
    .replaceAll("{arch}", process.env.VERIFY_MAKE_ARCH || process.arch);
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

const platform = process.platform;
const arch = process.env.VERIFY_MAKE_ARCH || process.arch;
const errors = [];

if (platform === "win32") {
  const expected = expand(contract.windows.primaryAsset);
  const outputDir = path.join(makeRoot, "squirrel.windows", arch);
  const madeFiles = listFilesRecursive(outputDir).map(f => path.basename(f));
  const expectedFiles = [
    expected,
    "RELEASES",
    `youtube_music_desktop_app-${version}-full.nupkg`
  ];
  for (const expectedFile of expectedFiles) {
    if (!madeFiles.includes(expectedFile)) {
      errors.push(`Missing Windows ${arch} artifact "${expectedFile}" in ${outputDir}`);
    }
  }
} else if (platform === "darwin") {
  const expected = expand(
    arch === "arm64"
      ? contract.macos.primaryAssets.find(a => a.includes("arm64"))
      : contract.macos.primaryAssets.find(a => a.includes("x64"))
  );
  const outputDir = path.join(makeRoot, "zip", "darwin", arch);
  const madeFiles = listFilesRecursive(outputDir).map(f => path.basename(f));
  if (!expected || !madeFiles.includes(expected)) {
    errors.push(`Missing macOS ${arch} ZIP "${expected}" in ${outputDir}`);
  }
} else if (platform === "linux") {
  const debArch = arch === "x64" ? "amd64" : arch;
  const rpmArch = arch === "x64" ? "x86_64" : "arm64";
  const expectedDeb = `youtube-music-desktop-app_${version}_${debArch}.deb`;
  const expectedRpm = `youtube-music-desktop-app-${version}-1.${rpmArch}.rpm`;
  const debDir = path.join(makeRoot, "deb", arch);
  const rpmDir = path.join(makeRoot, "rpm", arch);
  if (!listFilesRecursive(debDir).some(f => path.basename(f) === expectedDeb)) {
    errors.push(`Missing Linux ${arch} DEB "${expectedDeb}" in ${debDir}`);
  }
  if (!listFilesRecursive(rpmDir).some(f => path.basename(f) === expectedRpm)) {
    errors.push(`Missing Linux ${arch} RPM "${expectedRpm}" in ${rpmDir}`);
  }
}

if (errors.length > 0) {
  throw new Error(`Make artifact verification failed:\n- ${errors.join("\n- ")}`);
}

console.log(`Verified exact make artifacts for ${platform}/${arch} against release-artifacts.contract.json (version ${version}).`);
