/**
 * YouTube Downloader - Content Script
 * Injects download button overlay on YouTube video player
 * Extracts video information from the page
 */

(function() {
  'use strict';

  // ===== State =====
  let downloadButton = null;
  let currentVideoId = null;

  // ===== Utility Functions =====
  function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  function isVideoPage() {
    return window.location.pathname === '/watch' && getVideoId();
  }

  function extractVideoInfo() {
    try {
      const videoId = getVideoId();
      if (!videoId) return null;

      // Get video title
      const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
                          document.querySelector('h1.title') ||
                          document.querySelector('#title h1');
      const title = titleElement?.textContent?.trim() || document.title.replace(' - YouTube', '');

      // Get channel name
      const channelElement = document.querySelector('#channel-name a') ||
                            document.querySelector('ytd-channel-name a') ||
                            document.querySelector('.ytd-video-owner-renderer a');
      const channel = channelElement?.textContent?.trim() || 'Unknown Channel';

      // Get video duration
      const durationElement = document.querySelector('.ytp-time-duration');
      let duration = 0;
      if (durationElement) {
        const parts = durationElement.textContent.split(':').reverse();
        duration = parts.reduce((acc, part, index) => {
          return acc + parseInt(part) * Math.pow(60, index);
        }, 0);
      }

      // Get thumbnail
      const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

      // Get video URL
      const url = window.location.href;

      return {
        videoId,
        title,
        channel,
        duration,
        thumbnail,
        url
      };
    } catch (error) {
      console.error('Failed to extract video info:', error);
      return null;
    }
  }

  // ===== Download Button Overlay =====
  function createDownloadButton() {
    if (downloadButton) return;

    downloadButton = document.createElement('button');
    downloadButton.id = 'ytd-download-overlay-btn';
    downloadButton.className = 'ytd-download-btn';
    downloadButton.title = 'Download this video';
    downloadButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    downloadButton.addEventListener('click', handleDownloadClick);

    return downloadButton;
  }

  function injectDownloadButton() {
    if (!isVideoPage()) return;

    const videoId = getVideoId();
    if (videoId === currentVideoId && downloadButton && document.contains(downloadButton)) {
      return;
    }

    currentVideoId = videoId;

    // Remove existing button if any
    removeDownloadButton();

    // Create new button
    createDownloadButton();

    // Find the video player
    const player = document.querySelector('#movie_player');
    if (player && downloadButton) {
      player.appendChild(downloadButton);
    }
  }

  function removeDownloadButton() {
    if (downloadButton) {
      downloadButton.remove();
      downloadButton = null;
    }
  }

  function handleDownloadClick(e) {
    e.preventDefault();
    e.stopPropagation();

    // Open the extension popup by sending message to background
    chrome.runtime.sendMessage({
      action: 'openPopup',
      videoInfo: extractVideoInfo()
    });
  }

  // ===== Message Listener =====
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getVideoInfo') {
      const videoInfo = extractVideoInfo();
      sendResponse({ success: !!videoInfo, data: videoInfo });
    }
    return true;
  });

  // ===== URL Change Detection =====
  let lastUrl = window.location.href;

  function checkUrlChange() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      
      if (isVideoPage()) {
        // Wait a bit for the new page to load
        setTimeout(injectDownloadButton, 1000);
      } else {
        removeDownloadButton();
        currentVideoId = null;
      }
    }
  }

  // ===== Initialization =====
  function init() {
    // Initial injection
    if (isVideoPage()) {
      // Wait for the player to be ready
      const checkPlayer = setInterval(() => {
        const player = document.querySelector('#movie_player');
        if (player) {
          clearInterval(checkPlayer);
          injectDownloadButton();
        }
      }, 500);

      // Fallback timeout
      setTimeout(() => {
        clearInterval(checkPlayer);
        injectDownloadButton();
      }, 5000);
    }

    // Watch for URL changes (YouTube SPA navigation)
    const observer = new MutationObserver(() => {
      checkUrlChange();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also listen for popstate events
    window.addEventListener('popstate', () => {
      setTimeout(checkUrlChange, 100);
    });

    // Periodic check for button visibility
    setInterval(() => {
      if (isVideoPage() && (!downloadButton || !document.contains(downloadButton))) {
        injectDownloadButton();
      }
    }, 2000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
