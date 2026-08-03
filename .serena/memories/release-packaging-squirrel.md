Desktop packaging (2026-08-02): Keep MakerSquirrel only on Windows (no NSIS). Reasons: electron-squirrel-startup + autoUpdater already wired; site wizard matches *.Setup.exe; CI already uploads squirrel.windows; dual installers would split update path.

Contract file: release-artifacts.contract.json
Windows primary: YouTube.Music.Desktop.App-{version}.Setup.exe (explicit setupExe in forge.config.mts)
Publisher defaults: TroonCataroon/ytmdesktop-1
verify:make checks out/make names; build.yml excludes windows-arm64; publish.yml passes GITHUB_TOKEN on dry-run for delta nupkgs.

Workshop downloadable build still needs: bump package.json version above v2.1.0 (branch may be 2.0.10), merge, push annotated tag v* to trigger publish.yml. Do not invent NSIS.