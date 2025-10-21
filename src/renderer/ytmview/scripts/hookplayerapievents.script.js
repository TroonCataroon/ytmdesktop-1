(function() {
  const ytmStore = window.__YTMD_HOOK__.ytmStore;

  function sendStoreState() {
    // We don't want to see everything in the store as there can be some sensitive data so we only send what's necessary to operate
    let state = ytmStore.getState();

    const videoId = document.querySelector("ytmusic-app-layout>ytmusic-player-bar").playerApi.getPlayerResponse()?.videoDetails?.videoId;
    const likeButtonData = document.querySelector("ytmusic-app-layout>ytmusic-player-bar").querySelector("ytmusic-like-button-renderer").data;
    const defaultLikeStatus = likeButtonData?.likeStatus ?? "UNKNOWN";
    const storeLikeStatus = state.likeStatus.videos[videoId];
    
    const likeStatus = storeLikeStatus ? state.likeStatus.videos[videoId] : defaultLikeStatus;
    const volume = state.player.volume;
    const adPlaying = state.player.adPlaying;
    const muted = state.player.muted;

    window.ytmd.sendStoreUpdate(state.queue, likeStatus, volume, muted, adPlaying);
  }

  // Create a throttled version of sendVideoProgress
  let lastProgressTime = 0;
  let progressThrottleTimeout = null;
  let lastProgress = null;
  
  function throttledSendVideoProgress(progress) {
    const now = Date.now();
    lastProgress = progress;
    
    // If we haven't sent progress in 250ms, send it immediately
    if (now - lastProgressTime > 250) {
      window.ytmd.sendVideoProgress(progress);
      lastProgressTime = now;
      lastProgress = null;
      
      // Clear any pending timeout
      if (progressThrottleTimeout) {
        clearTimeout(progressThrottleTimeout);
        progressThrottleTimeout = null;
      }
    } 
    // Otherwise, schedule an update if we don't have one already
    else if (!progressThrottleTimeout) {
      progressThrottleTimeout = setTimeout(() => {
        if (lastProgress !== null) {
          window.ytmd.sendVideoProgress(lastProgress);
          lastProgressTime = Date.now();
          lastProgress = null;
        }
        progressThrottleTimeout = null;
      }, 250 - (now - lastProgressTime));
    }
  }

  document.querySelector("ytmusic-app-layout>ytmusic-player-bar").playerApi.addEventListener("onVideoProgress", progress => {
    throttledSendVideoProgress(progress);
  });
  document.querySelector("ytmusic-app-layout>ytmusic-player-bar").playerApi.addEventListener("onStateChange", state => {
    window.ytmd.sendVideoState(state);
  });
  document.querySelector("ytmusic-app-layout>ytmusic-player-bar").playerApi.addEventListener("onVideoDataChange", event => {
    if (event.playertype === 1 && (event.type === "dataloaded" || event.type === "dataupdated")) {
      let videoDetails = document.querySelector("ytmusic-app-layout>ytmusic-player-bar").playerApi.getPlayerResponse().videoDetails;
      let playlistId = document.querySelector("ytmusic-app-layout>ytmusic-player-bar").playerApi.getPlaylistId();
      let album = null;
      let hasFullMetadata = false;

      // If playing from online sources this usually is filled out with the first dataupdated which is followed after dataloaded. While offline this is always filled
      let currentItem = document.querySelector("ytmusic-app-layout>ytmusic-player-bar").currentItem;
      if (currentItem !== null && currentItem !== undefined) {
        hasFullMetadata = true;

        // Fill out video details with better information
        const rawTitle = currentItem.title.runs.map(v => v.text).join("");
        // Fix character encoding issues in title
        videoDetails.title = rawTitle
          .replace(/ΓÇó/g, '•')
          .replace(/├ÿ/g, 'Ø')
          .replace(/ΓÇÖ/g, '–')
          .replace(/ΓÇÜ/g, '—')
          .replace(/ΓÇô/g, '"')
          .replace(/ΓÇ£/g, '"')
          .replace(/ΓÇ¥/g, "'")
          .replace(/ΓÇ¥/g, "'");
        videoDetails.thumbnail = currentItem.thumbnail; // Can contain more thumbnails than player response

        // Extract artist and album information from longBylineText
        let artistParts = [];
        for (let i = 0; i < currentItem.longBylineText.runs.length; i++) {
          const item = currentItem.longBylineText.runs[i];
          if (item.navigationEndpoint) {
            if (item.navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig.pageType === "MUSIC_PAGE_TYPE_ALBUM") {
              album = {
                id: item.navigationEndpoint.browseEndpoint.browseId,
                text: item.text
              }
            }
          } else {
            // This is likely artist information (no navigation endpoint)
            artistParts.push(item.text);
          }
        }
        
        // Update the author field with the extracted artist information
        if (artistParts.length > 0) {
          // Fix character encoding issues (ΓÇó -> •, ├ÿ -> Ø, etc.)
          const fixedAuthor = artistParts.join("")
            .replace(/ΓÇó/g, '•')
            .replace(/├ÿ/g, 'Ø')
            .replace(/ΓÇÖ/g, '–')
            .replace(/ΓÇÜ/g, '—')
            .replace(/ΓÇô/g, '"')
            .replace(/ΓÇ£/g, '"')
            .replace(/ΓÇ¥/g, "'")
            .replace(/ΓÇ¥/g, "'");
          videoDetails.author = fixedAuthor;
        }
      }

      let state = ytmStore.getState();
      const likeButtonData = document.querySelector("ytmusic-app-layout>ytmusic-player-bar").querySelector("ytmusic-like-button-renderer").data;
      const defaultLikeStatus = likeButtonData?.likeStatus ?? "UNKNOWN";
      const storeLikeStatus = state.likeStatus.videos[videoDetails.videoId];
      
      const likeStatus = storeLikeStatus ? state.likeStatus.videos[videoDetails.videoId] : defaultLikeStatus;

      window.ytmd.sendVideoData(videoDetails, playlistId, album, likeStatus, hasFullMetadata);
    }
  });
  ytmStore.subscribe(() => {
    sendStoreState();
  });
  window.addEventListener("yt-action", e => {
    if (e.detail.actionName === "yt-service-request") {
      if (e.detail.args[1].createPlaylistServiceEndpoint) {
        let title = e.detail.args[2].create_playlist_title;
        let returnValue = e.detail.returnValue;
        returnValue[0].ajaxPromise.then(response => {
          let id = response.data.playlistId;
          window.ytmd.sendCreatePlaylistObservation({
            title,
            id
          });
        });
      }
    } else if (e.detail.actionName === "yt-handle-playlist-deletion-command") {
      let playlistId = e.detail.args[0].handlePlaylistDeletionCommand.playlistId;
      window.ytmd.sendDeletePlaylistObservation(playlistId);
    }
  });
})
