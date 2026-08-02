import { readFileSync } from "node:fs";
import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
  productName: string;
  author?: { name?: string };
};

/**
 * Packaging strategy (Windows): harden MakerSquirrel — do NOT add NSIS.
 * Reasons tied to this repo:
 * 1) Main already uses electron-squirrel-startup + Electron autoUpdater (Update.exe / nupkg / RELEASES).
 * 2) site/ wizard + published v2.1.0 assets already key off `*.Setup.exe`.
 * 3) build.yml / publish.yml already produce and upload squirrel.windows artifacts.
 * 4) A second NSIS maker would fork update UX and artifact contracts without benefit.
 *
 * See release-artifacts.contract.json for the filename contract the web install surface must use.
 */

// CI may set these vars to empty strings when repo vars are unset; use || not ??.
// Defaults target this fork so tag publishes land where site/ links (not upstream ytmdesktop/ytmdesktop).
const updateFeedOwner = process.env.YTMD_UPDATE_FEED_OWNER || "TroonCataroon";
const updateFeedRepository = process.env.YTMD_UPDATE_FEED_REPOSITORY || "ytmdesktop-1";

// Stable Setup.exe name used by site/wizard.js and GitHub Release download URLs.
const windowsSetupExe = `YouTube.Music.Desktop.App-${packageJson.version}.Setup.exe`;

// There is probably a better way to do this, such as fetching it directly from forge
let makerArch = null;
for (let i = 0; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--arch") {
    makerArch = process.argv[i + 1];
  }
}

const enableSquirrelRemoteReleases = Boolean(
  process.env.YTMD_UPDATE_FEED_OWNER &&
    process.env.YTMD_UPDATE_FEED_REPOSITORY &&
    process.env.GITHUB_TOKEN
);

const config: ForgeConfig = {
  packagerConfig: {
    executableName: "youtube-music-desktop-app",
    icon: "./src/assets/icons/ytmd",
    extraResource: [
      "./src/assets/icons/tray.ico",
      "./src/assets/icons/trayTemplate.png",
      "./src/assets/icons/trayTemplate@2x.png",
      "./src/assets/icons/ytmd.png",
      "./src/assets/icons/ytmd_white.png",
      "./src/assets/icons/ytmd_black.png",

      "./src/assets/icons/controls/pause-button.png",
      "./src/assets/icons/controls/play-button.png",
      "./src/assets/icons/controls/play-next-button.png",
      "./src/assets/icons/controls/play-previous-button.png",
      "./src/main/integrations/plugins/builtin/vinyl-player/vinyl-player-preload.js",
      "./src/main/integrations/plugins/builtin/vinyl-player/vinyl-player.html",
      "./src/main/integrations/plugins/builtin/vinyl-player/vinyl-remake.html",
      "./src/main/integrations/plugins/builtin/vinyl-player/vinyl-workshop.html",
      "./src/main/integrations/plugins/builtin/vinyl-player/assets"
    ],
    protocols: [
      {
        name: "YouTube Music Desktop App",
        schemes: ["ytmd"]
      }
    ],
    appCategoryType: "public.app-category.music",
    asar: true
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      // NuGet / AppId cannot contain spaces or hyphens.
      name: "youtube_music_desktop_app",
      title: packageJson.productName,
      authors: packageJson.author?.name || "YTMD",
      exe: "youtube-music-desktop-app.exe",
      setupExe: windowsSetupExe,
      noMsi: true,
      // Content-addressed URL so Control Panel icon stays valid after branch renames.
      iconUrl: "https://raw.githubusercontent.com/ytmdesktop/ytmdesktop/137c4e5c175c8c125cbcca9a5312611f80cd3bd9/src/assets/icons/ytmd.ico",
      loadingGif: "./src/assets/icons/ytmd_installer.gif",
      setupIcon: "./src/assets/icons/ytmd.ico",
      ...(enableSquirrelRemoteReleases
        ? {
            remoteReleases: `https://github.com/${process.env.YTMD_UPDATE_FEED_OWNER}/${process.env.YTMD_UPDATE_FEED_REPOSITORY}/releases`,
            remoteToken: process.env.GITHUB_TOKEN
          }
        : {})
    }),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({
      options: {
        categories: ["AudioVideo", "Audio"],
        mimeType: ["x-scheme-handler/ytmd"],
        icon: "./src/assets/icons/ytmd.png"
      }
    }),
    new MakerDeb({
      options: {
        categories: ["AudioVideo", "Audio"],
        mimeType: ["x-scheme-handler/ytmd"],
        section: "sound",
        icon: "./src/assets/icons/ytmd.png"
      }
    })
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: updateFeedOwner,
          name: updateFeedRepository
        },
        draft: false,
        prerelease: process.env.YTMD_RELEASE_PRERELEASE === "true",
        generateReleaseNotes: true
      }
    }
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main/index.ts",
          config: "viteconfig/main.ts",
          target: "main"
        },
        // TODO: Utilize a single config for preload so we can share chunks if needed
        {
          entry: "src/renderer/windows/main/preload.ts",
          config: "viteconfig/preload/main_window.ts",
          target: "preload"
        },
        {
          entry: "src/renderer/windows/settings/preload.ts",
          config: "viteconfig/preload/settings_window.ts",
          target: "preload"
        },
        {
          entry: "src/renderer/windows/authorize-companion/preload.ts",
          config: "viteconfig/preload/authorize_companion_window.ts",
          target: "preload"
        },
        {
          entry: "src/renderer/ytmview/preload.ts",
          config: "viteconfig/preload/ytmview.ts",
          target: "preload"
        }
      ],
      renderer: [
        // Instead of opting for defining each window as a separate object we bundle them all together and have a more custom output to share chunks
        {
          name: "all_windows",
          config: "viteconfig/renderer.ts"
        }
      ]
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      resetAdHocDarwinSignature: process.platform === "darwin" && makerArch == "arm64",
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ]
};

export default config;
