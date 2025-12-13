const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      // Whitelist channels
      const validChannels = [
        'vinyl-player:play-pause',
        'vinyl-player:next',
        'vinyl-player:previous',
        'vinyl-player:close',
        // Used by 6K widget mode for click-and-drag window movement
        'vinyl-player:drag-start',
        'vinyl-player:drag-end'
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    on: (channel, func) => {
      // Whitelist channels
      const validChannels = [
        'vinyl-player:update-track',
        'vinyl-player:update-settings'
      ];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    }
  }
});

