/**
 * YouTube Downloader - Service Worker
 * Handles native messaging communication with yt-dlp host
 * Manages downloads and progress updates
 */

const NATIVE_HOST_NAME = 'com.youtube.downloader';

// ===== State =====
let nativePort = null;
let pendingCallbacks = new Map();
let downloadCallbacks = new Map();
let messageId = 0;

// ===== Native Messaging =====
function connectToNativeHost() {
  if (nativePort) {
    try {
      nativePort.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }

  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    
    nativePort.onMessage.addListener(handleNativeMessage);
    
    nativePort.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
      console.error('Native host disconnected:', error?.message || 'Unknown error');
      nativePort = null;
      
      // Reject all pending callbacks
      pendingCallbacks.forEach(callback => {
        callback.reject(new Error('Native host disconnected'));
      });
      pendingCallbacks.clear();
      
      // Notify about download failures
      downloadCallbacks.forEach((callback, downloadId) => {
        notifyDownloadError(downloadId, 'Native host connection lost');
      });
      downloadCallbacks.clear();
    });

    return true;
  } catch (error) {
    console.error('Failed to connect to native host:', error);
    return false;
  }
}

function handleNativeMessage(message) {
  console.log('Received from native host:', message);

  if (message.id && pendingCallbacks.has(message.id)) {
    const callback = pendingCallbacks.get(message.id);
    pendingCallbacks.delete(message.id);

    if (message.error) {
      callback.reject(new Error(message.error));
    } else {
      callback.resolve(message);
    }
    return;
  }

  // Handle progress updates
  if (message.type === 'progress' && message.downloadId) {
    notifyDownloadProgress(message.downloadId, message.progress);
  }

  // Handle download completion
  if (message.type === 'complete' && message.downloadId) {
    notifyDownloadComplete(message.downloadId, message.filename);
    downloadCallbacks.delete(message.downloadId);
  }

  // Handle download errors
  if (message.type === 'error' && message.downloadId) {
    notifyDownloadError(message.downloadId, message.error);
    downloadCallbacks.delete(message.downloadId);
  }
}

function sendNativeMessage(action, data = {}) {
  return new Promise((resolve, reject) => {
    if (!nativePort) {
      if (!connectToNativeHost()) {
        reject(new Error('Failed to connect to native host. Please check installation.'));
        return;
      }
    }

    const id = ++messageId;
    const message = { id, action, ...data };

    pendingCallbacks.set(id, { resolve, reject });

    // Timeout after 30 seconds for non-download operations
    if (action !== 'download') {
      setTimeout(() => {
        if (pendingCallbacks.has(id)) {
          pendingCallbacks.delete(id);
          reject(new Error('Request timed out'));
        }
      }, 30000);
    }

    try {
      nativePort.postMessage(message);
    } catch (error) {
      pendingCallbacks.delete(id);
      reject(error);
    }
  });
}

// ===== Notification Functions =====
function notifyDownloadProgress(downloadId, progress) {
  // Send to popup if open
  chrome.runtime.sendMessage({
    action: 'downloadProgress',
    downloadId,
    progress
  }).catch(() => {
    // Popup might be closed, ignore error
  });
}

function notifyDownloadComplete(downloadId, filename) {
  // Send to popup if open
  chrome.runtime.sendMessage({
    action: 'downloadComplete',
    downloadId,
    filename
  }).catch(() => {
    // Popup might be closed
  });

  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Download Complete',
    message: `${filename} has been downloaded successfully.`,
    priority: 2
  });
}

function notifyDownloadError(downloadId, error) {
  // Send to popup if open
  chrome.runtime.sendMessage({
    action: 'downloadError',
    downloadId,
    error
  }).catch(() => {
    // Popup might be closed
  });

  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Download Failed',
    message: error || 'An error occurred during download.',
    priority: 2
  });
}

// ===== Message Handlers =====
async function handleTestConnection() {
  try {
    const response = await sendNativeMessage('test');
    return {
      connected: true,
      ytdlpVersion: response.ytdlpVersion,
      ffmpegVersion: response.ffmpegVersion
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

async function handleStartDownload(options) {
  try {
    const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    downloadCallbacks.set(downloadId, true);

    // Send download request to native host
    sendNativeMessage('download', {
      downloadId,
      url: options.url,
      format: options.format,
      output: options.output,
      extension: options.extension,
      subtitles: options.subtitles,
      audioOnly: options.audioOnly,
      audioQuality: options.audioQuality,
      title: options.title
    }).catch(error => {
      notifyDownloadError(downloadId, error.message);
      downloadCallbacks.delete(downloadId);
    });

    // Show started notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Download Started',
      message: `Downloading: ${options.title}`,
      priority: 1
    });

    return { downloadId };
  } catch (error) {
    throw error;
  }
}

async function handleCancelDownload(downloadId) {
  try {
    await sendNativeMessage('cancel', { downloadId });
    downloadCallbacks.delete(downloadId);
    return { success: true };
  } catch (error) {
    throw error;
  }
}

async function handleSelectDirectory() {
  try {
    const response = await sendNativeMessage('selectDirectory');
    return { path: response.path };
  } catch (error) {
    throw error;
  }
}

async function handleOpenFolder(path) {
  try {
    await sendNativeMessage('openFolder', { path });
    return { success: true };
  } catch (error) {
    throw error;
  }
}

// ===== Extension Message Listener =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleRequest = async () => {
    try {
      switch (request.action) {
        case 'testConnection':
          return await handleTestConnection();
        
        case 'startDownload':
          return await handleStartDownload(request);
        
        case 'cancelDownload':
          return await handleCancelDownload(request.downloadId);
        
        case 'selectDirectory':
          return await handleSelectDirectory();
        
        case 'openFolder':
          return await handleOpenFolder(request.path);
        
        case 'openPopup':
          // Store video info for popup to retrieve
          if (request.videoInfo) {
            await chrome.storage.session.set({ pendingVideoInfo: request.videoInfo });
          }
          return { success: true };
        
        default:
          return { error: 'Unknown action' };
      }
    } catch (error) {
      return { error: error.message };
    }
  };

  handleRequest().then(sendResponse);
  return true; // Keep the message channel open for async response
});

// ===== Extension Installation =====
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      downloadPath: '~/Downloads',
      autoSelectBest: true,
      rememberQuality: false,
      defaultSubtitles: false,
      downloadHistory: []
    });

    // Open options page with setup instructions
    chrome.tabs.create({
      url: 'options/options.html?setup=true'
    });
  }
});

// ===== Keep Service Worker Alive =====
// Ping every 25 seconds to keep the service worker active during downloads
setInterval(() => {
  if (downloadCallbacks.size > 0) {
    console.log('Active downloads:', downloadCallbacks.size);
  }
}, 25000);

// ===== Initialize Connection =====
// Try to connect on startup
connectToNativeHost();
