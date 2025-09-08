const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the vinyl player renderer
contextBridge.exposeInMainWorld('vinylPlayerAPI', {
  // IPC communication
  send: (channel, data) => {
    const validChannels = ['vinyl-player:play-pause', 'vinyl-player:close'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Listen for track updates from main process
  onTrackUpdate: (callback) => {
    ipcRenderer.on('vinyl-player:update-track', (event, track) => callback(track));
  },
  
  // Listen for settings updates
  onSettingsUpdate: (callback) => {
    ipcRenderer.on('vinyl-player:update-settings', (event, settings) => callback(settings));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
