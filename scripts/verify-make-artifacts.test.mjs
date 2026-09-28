import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url));
const verifier = new URL("./verify-make-artifacts.mjs", import.meta.url).href;
const packageJson = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8"));
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "ytmd-mac-artifacts-"));
try {
  for (const name of ["package.json", "release-artifacts.contract.json"]) {
    fs.copyFileSync(path.join(repo, name), path.join(fixture, name));
  }
  for (const arch of ["x64", "arm64"]) {
    const output = path.join(fixture, "out", "make", "zip", "darwin", arch);
    fs.mkdirSync(output, { recursive: true });
    const localName = `${packageJson.productName}-darwin-${arch}-${packageJson.version}.zip`;
    const verify = () =>
      spawnSync(
        process.execPath,
        ["--input-type=module", "-e", `Object.defineProperty(process, 'platform', { value: 'darwin' }); await import(${JSON.stringify(verifier)});`],
        { cwd: fixture, env: { ...process.env, VERIFY_MAKE_ARCH: arch }, encoding: "utf8" }
      );
    for (const wrongName of [
      localName.replaceAll(" ", "."),
      localName.replace(packageJson.version, "0.0.0"),
      localName.replace(arch, arch === "x64" ? "arm64" : "x64")
    ]) {
      fs.writeFileSync(path.join(output, wrongName), "fixture");
      const result = verify();
      assert.notEqual(result.status, 0, `${arch} must reject ${wrongName}`);
      assert.match(result.stderr, /Missing macOS/);
      fs.unlinkSync(path.join(output, wrongName));
    }
    fs.writeFileSync(path.join(output, localName), "fixture");
    const result = verify();
    assert.equal(result.status, 0, result.stderr);
  }
  console.log("Verified local macOS ZIP naming for x64/arm64; rejected published, stale and wrong-architecture filenames.");
} finally {
  assert.equal(path.dirname(fixture), path.resolve(os.tmpdir()));
  assert.ok(path.basename(fixture).startsWith("ytmd-mac-artifacts-"));
  fs.rmSync(fixture, { recursive: true, force: true });
}
