/**
 * Install wizard for YouTube Music Desktop.
 * Fetches GitHub Release assets and guides OS-specific install steps.
 * This site does not run the Electron app — it only links real Forge installers.
 */

const RELEASE = {
  owner: "TroonCataroon",
  repo: "ytmdesktop-1",
  /** Fallback when the Releases API is rate-limited or unavailable */
  fallbackTag: "v2.2.0",
  fallbackAssets: [
    "YouTube.Music.Desktop.App-2.2.0.Setup.exe",
    "YouTube.Music.Desktop.App-darwin-arm64-2.2.0.zip",
    "YouTube.Music.Desktop.App-darwin-x64-2.2.0.zip",
    "youtube-music-desktop-app_2.2.0_amd64.deb",
    "youtube-music-desktop-app_2.2.0_arm64.deb",
    "youtube-music-desktop-app-2.2.0-1.x86_64.rpm",
    "youtube-music-desktop-app-2.2.0-1.arm64.rpm",
  ],
};

const panels = ["detect", "download", "run", "done"];
let step = 0;
let platform = "unknown";
let arch = "x64";
let releaseMeta = null;
let selectedAsset = null;

const $ = (id) => document.getElementById(id);

function detectPlatform() {
  const ua = navigator.userAgent || "";
  const platformStr = navigator.userAgentData?.platform || navigator.platform || "";
  const hay = `${ua} ${platformStr}`.toLowerCase();

  if (/windows|win32|win64/.test(hay)) return "windows";
  if (/mac os|macintosh|darwin/.test(hay)) return "macos";
  if (/linux|ubuntu|fedora|debian|x11/.test(hay)) return "linux";
  return "unknown";
}

async function detectArch() {
  try {
    if (navigator.userAgentData?.getHighEntropyValues) {
      const { architecture } = await navigator.userAgentData.getHighEntropyValues([
        "architecture",
      ]);
      if (architecture === "arm" || architecture === "arm64") return "arm64";
      if (architecture === "x86") return "x64";
    }
  } catch {
    /* ignore */
  }

  const ua = navigator.userAgent.toLowerCase();
  if (/aarch64|arm64|apple silicon/.test(ua)) return "arm64";
  // Safari on Apple Silicon often still reports Intel in UA; prefer arm64 for modern Macs.
  if (platform === "macos" && !/intel/.test(ua)) return "arm64";
  return "x64";
}

function assetUrl(name) {
  const tag = releaseMeta?.tag || RELEASE.fallbackTag;
  return `https://github.com/${RELEASE.owner}/${RELEASE.repo}/releases/download/${tag}/${encodeURIComponent(name)}`;
}

function releasePageUrl() {
  const tag = releaseMeta?.tag || RELEASE.fallbackTag;
  return `https://github.com/${RELEASE.owner}/${RELEASE.repo}/releases/tag/${tag}`;
}

function pickAsset(assets) {
  const names = assets.map((a) => (typeof a === "string" ? a : a.name));

  if (platform === "windows") {
    return names.find((n) => /\.Setup\.exe$/i.test(n)) || null;
  }

  if (platform === "macos") {
    const arm = names.find((n) => /darwin-arm64/i.test(n) && /\.zip$/i.test(n));
    const x64 = names.find((n) => /darwin-x64/i.test(n) && /\.zip$/i.test(n));
    return arch === "arm64" ? arm || x64 : x64 || arm;
  }

  if (platform === "linux") {
    const debArch = arch === "arm64" ? "arm64" : "amd64";
    const rpmArch = arch === "arm64" ? "arm64" : "x86_64";
    return (
      names.find((n) => n.endsWith(`_${debArch}.deb`)) ||
      names.find((n) => n.includes(`.${rpmArch}.rpm`)) ||
      names.find((n) => n.endsWith(".deb")) ||
      null
    );
  }

  return null;
}

function otherAssets(assets) {
  const names = assets.map((a) => (typeof a === "string" ? a : a.name));
  const skip = new Set([
    "RELEASES",
    selectedAsset,
    ...names.filter((n) => /\.nupkg$/i.test(n)),
  ]);
  return names.filter((n) => n && !skip.has(n));
}

async function loadRelease() {
  const api = `https://api.github.com/repos/${RELEASE.owner}/${RELEASE.repo}/releases/latest`;
  try {
    const res = await fetch(api, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    releaseMeta = {
      tag: data.tag_name,
      name: data.name || data.tag_name,
      assets: (data.assets || []).map((a) => a.name),
      htmlUrl: data.html_url,
    };
  } catch {
    releaseMeta = {
      tag: RELEASE.fallbackTag,
      name: RELEASE.fallbackTag,
      assets: RELEASE.fallbackAssets,
      htmlUrl: releasePageUrl(),
    };
  }
}

function setStep(next) {
  step = next;
  panels.forEach((name, i) => {
    $(`panel-${name}`).classList.toggle("is-hidden", i !== step);
  });
  document.querySelectorAll(".step-dot").forEach((el) => {
    const i = Number(el.dataset.step);
    el.classList.toggle("is-active", i === step);
    el.classList.toggle("is-done", i < step);
  });
}

function platformLabel() {
  switch (platform) {
    case "windows":
      return "Windows";
    case "macos":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return "Unknown";
  }
}

function runInstructions() {
  if (platform === "windows") {
    return [
      `Open <strong>${selectedAsset}</strong> (Electron Forge <strong>Squirrel</strong> setup wizard).`,
      "Allow the installer if Windows SmartScreen prompts you.",
      "Finish the wizard — the app installs under your user profile and launches when ready.",
      "Find <strong>YouTube Music Desktop App</strong> in the Start menu next time.",
    ];
  }
  if (platform === "macos") {
    return [
      `Open the downloaded <strong>${selectedAsset}</strong> zip and extract the app.`,
      "Drag the app into <strong>Applications</strong> (optional but recommended).",
      "First launch: right-click → Open if Gatekeeper blocks an unsigned build.",
      "Grant any media / accessibility prompts the app requests.",
    ];
  }
  if (platform === "linux") {
    const isDeb = selectedAsset?.endsWith(".deb");
    return [
      isDeb
        ? `Install with <strong>sudo apt install ./` +
          selectedAsset +
          `</strong> (or your preferred .deb tool).`
        : `Install with <strong>sudo rpm -i ./` + selectedAsset + `</strong> (or dnf/yum).`,
      "Launch <strong>youtube-music-desktop-app</strong> from your app menu.",
      "If the desktop entry is missing, run the binary from the package contents.",
    ];
  }
  return [
    "Pick an installer from the release page that matches your OS.",
    "Run the installer using your platform’s usual package flow.",
  ];
}

function renderAlts() {
  const alts = otherAssets(releaseMeta.assets);
  const box = $("alt-downloads");
  const list = $("alt-download-list");
  list.innerHTML = "";
  if (!alts.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  for (const name of alts) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = assetUrl(name);
    a.textContent = name;
    a.rel = "noopener";
    li.appendChild(a);
    list.appendChild(li);
  }
}

function fillRunSteps() {
  const ol = $("run-steps");
  ol.innerHTML = runInstructions()
    .map((html) => `<li>${html}</li>`)
    .join("");
}

async function boot() {
  platform = detectPlatform();
  arch = await detectArch();
  await loadRelease();

  selectedAsset = pickAsset(releaseMeta.assets);

  $("detect-os").textContent = platformLabel();
  $("detect-arch").textContent = arch;
  $("detect-release").textContent = releaseMeta.tag;
  $("detect-asset").textContent = selectedAsset || "Choose manually on the next step";

  const lede = $("wizard-lede");
  const hint = $("detect-hint");
  const cont = $("btn-continue");

  if (selectedAsset) {
    lede.textContent = `We detected ${platformLabel()} (${arch}). Continue to download the matching installer.`;
    hint.textContent =
      "Windows uses the Squirrel Setup.exe wizard built by Electron Forge. macOS uses a ZIP; Linux uses .deb/.rpm.";
    cont.disabled = false;
  } else {
    lede.textContent =
      "We couldn’t auto-select an installer for this browser. You can still browse release assets.";
    hint.textContent = "Continue to see every available download from the latest GitHub Release.";
    cont.disabled = false;
  }

  const dl = $("btn-download");
  const rel = $("release-link");
  rel.href = releaseMeta.htmlUrl || releasePageUrl();

  if (selectedAsset) {
    dl.href = assetUrl(selectedAsset);
    dl.removeAttribute("aria-disabled");
    dl.textContent = `Download ${selectedAsset}`;
  } else {
    dl.href = rel.href;
    dl.textContent = "Open GitHub Releases";
  }

  renderAlts();
  fillRunSteps();
  setStep(0);
}

$("btn-continue").addEventListener("click", () => setStep(1));
$("btn-downloaded").addEventListener("click", () => {
  fillRunSteps();
  setStep(2);
});
$("btn-back-download").addEventListener("click", () => setStep(1));
$("btn-installed").addEventListener("click", () => setStep(3));
$("btn-restart").addEventListener("click", () => setStep(0));
$("btn-download").addEventListener("click", () => {
  // Soft-advance after a short delay so the download can start.
  window.setTimeout(() => {
    if (step === 1) {
      /* stay; user confirms with “I’ve downloaded it” */
    }
  }, 400);
});

boot();
