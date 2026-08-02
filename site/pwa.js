/**
 * PWA install UX for the install-guide companion site.
 * Captures beforeinstallprompt and labels the shortcut honestly:
 * this installs the wizard/companion, not the Electron desktop player.
 */

const INSTALL_DISMISS_KEY = "ytmd-pwa-install-dismissed";

/** @type {BeforeInstallPromptEvent | null} */
let deferredPrompt = null;

function $(id) {
  return document.getElementById(id);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(window.navigator.standalone)
  );
}

function wasDismissed() {
  try {
    return sessionStorage.getItem(INSTALL_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    sessionStorage.setItem(INSTALL_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

function showBanner(visible) {
  const banner = $("pwa-install");
  if (!banner) return;
  banner.hidden = !visible;
  banner.classList.toggle("is-visible", visible);
  banner.setAttribute("aria-hidden", visible ? "false" : "true");
}

function updateStandaloneChrome() {
  if (!isStandalone()) return;
  document.documentElement.classList.add("is-pwa-standalone");
  const badge = $("companion-badge");
  if (badge) {
    badge.textContent = "Install guide (installed shortcut)";
  }
  showBanner(false);
}

async function promptInstall() {
  if (!deferredPrompt) return;
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  showBanner(false);
  await promptEvent.prompt();
  try {
    await promptEvent.userChoice;
  } catch {
    /* ignore */
  }
}

function wireUi() {
  const installBtn = $("btn-pwa-install");
  const dismissBtn = $("btn-pwa-dismiss");

  installBtn?.addEventListener("click", () => {
    void promptInstall();
  });

  dismissBtn?.addEventListener("click", () => {
    setDismissed();
    showBanner(false);
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* SW optional for non-secure localhost quirks */
    });
  });
}

function bootPwa() {
  updateStandaloneChrome();
  wireUi();
  registerServiceWorker();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = /** @type {BeforeInstallPromptEvent} */ (event);
    if (!isStandalone() && !wasDismissed()) {
      showBanner(true);
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    showBanner(false);
    const badge = $("companion-badge");
    if (badge) {
      badge.textContent = "Install guide shortcut added";
    }
  });
}

bootPwa();
