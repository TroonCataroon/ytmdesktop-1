<script setup lang="ts">
import { onMounted, ref } from "vue";
import TitleBar from "../../components/TitleBar.vue";
import YTMViewLoading from "../../components/YTMViewLoading.vue";
import UpdateNotification from "../../components/UpdateNotification.vue";
import logo from "~assets/icons/ytmd_white.png";

const keyboardFocus = ref<HTMLElement>(null);
const keyboardFocusZero = ref<HTMLElement>(null);

// Update notification state
const showUpdateNotification = ref(false);
const updateType = ref("available");
const updateVersion = ref("");
const updateProgress = ref(0);
const updateError = ref("");

onMounted(() => {
  window.onfocus = () => {
    if (document.activeElement != keyboardFocusZero.value) {
      // This resets the focus of keyboard navigation
      keyboardFocusZero.value.focus();
      keyboardFocusZero.value.blur();
    }
  };

  keyboardFocus.value.onfocus = () => {
    window.ytmd.switchFocus("ytm");
  };

  window.ytmd.requestWindowState();
  
  // Set up update notification listeners
  window.ipcRenderer.on("app:updateAvailable", (_event, info) => {
    updateType.value = "available";
    updateVersion.value = info?.version || "";
    updateProgress.value = 0;
    showUpdateNotification.value = true;
  });
  
  window.ipcRenderer.on("app:updateDownloadProgress", (_event, progressObj) => {
    if (showUpdateNotification.value && updateType.value === "available") {
      updateProgress.value = progressObj.percent || 0;
    }
  });
  
  window.ipcRenderer.on("app:updateDownloaded", (_event, info) => {
    updateType.value = "downloaded";
    updateVersion.value = info?.version || "";
    showUpdateNotification.value = true;
  });
  
  window.ipcRenderer.on("app:updateError", (_event, error) => {
    updateType.value = "error";
    updateError.value = error?.message || "Unknown error";
    showUpdateNotification.value = true;
  });
  
  // Check if there's already an update downloaded
  checkUpdateStatus();
});

async function checkUpdateStatus() {
  try {
    const status = await window.ipcRenderer.invoke("app:getUpdateStatus");
    
    if (status.isDownloaded) {
      updateType.value = "downloaded";
      updateVersion.value = status.info?.version || "";
      showUpdateNotification.value = true;
    } else if (status.status === "downloading") {
      updateType.value = "available";
      updateVersion.value = status.info?.version || "";
      updateProgress.value = status.progress || 0;
      showUpdateNotification.value = true;
    }
  } catch (error) {
    console.error("Failed to check update status:", error);
  }
}

function closeUpdateNotification() {
  showUpdateNotification.value = false;
}

function installUpdate() {
  window.ytmd.restartApplicationForUpdate();
}

function checkForUpdates() {
  window.ytmd.checkForUpdates();
}
</script>

<template>
  <div ref="keyboardFocusZero" tabindex="0"></div>
  <Suspense>
    <TitleBar is-main-window has-home-button has-settings-button has-minimize-button has-maximize-button title="YouTube Music Desktop App" :icon-file="logo" />
  </Suspense>
  <Suspense>
    <YTMViewLoading />
  </Suspense>
  <div ref="keyboardFocus" tabindex="32767"></div>
  
  <!-- Update notification -->
  <UpdateNotification
    :show="showUpdateNotification"
    :type="updateType"
    :version="updateVersion"
    :progress="updateProgress"
    :error="updateError"
    @close="closeUpdateNotification"
    @install="installUpdate"
    @check="checkForUpdates"
  />
</template>
