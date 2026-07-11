import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("out");
const packageDirs = fs.existsSync(outDir)
  ? fs
      .readdirSync(outDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.includes("-win32-"))
      .map(entry => path.join(outDir, entry.name))
  : [];

if (packageDirs.length === 0) {
  throw new Error("No packaged Windows application found under out/. Run `yarn package` or `yarn make` first.");
}

const requiredAssets = ["vinyl-player-preload.js", "vinyl-player.html", "vinyl-remake.html"];

for (const packageDir of packageDirs) {
  const assetRoot = path.join(packageDir, "resources");
  const missing = requiredAssets.filter(relativePath => !fs.existsSync(path.join(assetRoot, relativePath)));
  if (missing.length > 0) {
    throw new Error(`Packaged vinyl player assets are missing from ${packageDir}: ${missing.join(", ")}`);
  }
}

console.log(`Verified packaged vinyl player assets in ${packageDirs.length} Windows package${packageDirs.length === 1 ? "" : "s"}.`);
