/**
 * YouTube Downloader - Popup Script
 * Handles UI interactions and communicates with the service worker
 */

// ===== State Management =====
const state = {
  currentVideoInfo: null,
  downloadType: 'video',
  selectedQuality: 'best',
  selectedFormat: 'mp4',
  selectedAudioQuality: 'mp3-320',
  downloadPath: '~/Downloads',
  includeSubtitles: false,
  isDownloading: false,
  currentDownloadId: null
};

// ===== DOM Elements =====
const elements = {
  // States
  loadingState: document.getElementById('loadingState'),
  notYoutubeState: document.getElementById('notYoutubeState'),
  videoInfoState: document.getElementById('videoInfoState'),
  progressState: document.getElementById('progressState'),
  successState: document.getElementById('successState'),
  errorState: document.getElementById('errorState'),

  // Video Info
  videoThumbnail: document.getElementById('videoThumbnail'),
  videoDuration: document.getElementById('videoDuration'),
  videoTitle: document.getElementById('videoTitle'),
  videoChannel: document.getElementById('videoChannel'),

  // Type Toggle
  toggleVideo: document.getElementById('toggleVideo'),
  toggleAudio: document.getElementById('toggleAudio'),

  // Quality Selectors
  qualityGroup: document.getElementById('qualityGroup'),
  qualitySelect: document.getElementById('qualitySelect'),
  qualityTrigger: document.getElementById('qualityTrigger'),
  qualityValue: document.getElementById('qualityValue'),
  qualityDropdown: document.getElementById('qualityDropdown'),

  audioQualityGroup: document.getElementById('audioQualityGroup'),
  audioQualitySelect: document.getElementById('audioQualitySelect'),
  audioQualityTrigger: document.getElementById('audioQualityTrigger'),
  audioQualityValue: document.getElementById('audioQualityValue'),
  audioQualityDropdown: document.getElementById('audioQualityDropdown'),

  // Format
  formatGroup: document.getElementById('formatGroup'),
  formatButtons: document.querySelectorAll('.format-btn'),

  // Subtitles
  subtitlesCheckbox: document.getElementById('subtitlesCheckbox'),

  // Path
  downloadPath: document.getElementById('downloadPath'),
  changePathBtn: document.getElementById('changePathBtn'),

  // Download Button
  downloadBtn: document.getElementById('downloadBtn'),

  // Progress
  progressThumbnail: document.getElementById('progressThumbnail'),
  progressTitle: document.getElementById('progressTitle'),
  progressFilename: document.getElementById('progressFilename'),
  progressBarFill: document.getElementById('progressBarFill'),
  progressPercent: document.getElementById('progressPercent'),
  downloadSpeed: document.getElementById('downloadSpeed'),
  downloadEta: document.getElementById('downloadEta'),
  downloadSize: document.getElementById('downloadSize'),
  cancelBtn: document.getElementById('cancelBtn'),

  // Success
  successFilename: document.getElementById('successFilename'),
  openFolderBtn: document.getElementById('openFolderBtn'),
  downloadAnotherBtn: document.getElementById('downloadAnotherBtn'),

  // Error
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),
  backBtn: document.getElementById('backBtn'),

  // Settings
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  connectionStatus: document.getElementById('connectionStatus'),
  testConnectionBtn: document.getElementById('testConnectionBtn'),
  autoSelectBest: document.getElementById('autoSelectBest'),
  rememberQuality: document.getElementById('rememberQuality'),
  defaultSubtitles: document.getElementById('defaultSubtitles'),
  ytdlpVersion: document.getElementById('ytdlpVersion'),
  ffmpegVersion: document.getElementById('ffmpegVersion'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),

  // History
  historyBtn: document.getElementById('historyBtn'),
  historyModal: document.getElementById('historyModal'),
  closeHistoryBtn: document.getElementById('closeHistoryBtn'),
  historyList: document.getElementById('historyList')
};

// ===== Utility Functions =====
function showState(stateName) {
  const states = ['loadingState', 'notYoutubeState', 'videoInfoState', 'progressState', 'successState', 'errorState'];
  states.forEach(s => {
    elements[s].classList.toggle('hidden', s !== stateName);
  });
}

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSecond) {
  return formatBytes(bytesPerSecond) + '/s';
}

function formatETA(seconds) {
  if (!seconds || seconds === Infinity) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function truncatePath(path, maxLength = 25) {
  if (path.length <= maxLength) return path;
  const parts = path.split('/');
  if (parts.length <= 2) return '...' + path.slice(-maxLength);
  return '~/' + parts.slice(-2).join('/');
}

// ===== Storage Functions =====
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      'downloadPath',
      'autoSelectBest',
      'rememberQuality',
      'defaultSubtitles',
      'lastQuality',
      'lastFormat',
      'lastAudioQuality'
    ]);

    if (result.downloadPath) {
      state.downloadPath = result.downloadPath;
      elements.downloadPath.textContent = truncatePath(state.downloadPath);
    }

    if (result.autoSelectBest !== undefined) {
      elements.autoSelectBest.checked = result.autoSelectBest;
    }

    if (result.rememberQuality !== undefined) {
      elements.rememberQuality.checked = result.rememberQuality;
    }

    if (result.defaultSubtitles !== undefined) {
      elements.defaultSubtitles.checked = result.defaultSubtitles;
      state.includeSubtitles = result.defaultSubtitles;
      elements.subtitlesCheckbox.checked = result.defaultSubtitles;
    }

    if (result.rememberQuality && result.lastQuality) {
      state.selectedQuality = result.lastQuality;
      updateQualityDisplay(result.lastQuality);
    }

    if (result.lastFormat) {
      state.selectedFormat = result.lastFormat;
      updateFormatDisplay(result.lastFormat);
    }

    if (result.lastAudioQuality) {
      state.selectedAudioQuality = result.lastAudioQuality;
      updateAudioQualityDisplay(result.lastAudioQuality);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettings(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.error('Failed to save setting:', error);
  }
}

async function addToHistory(downloadInfo) {
  try {
    const result = await chrome.storage.local.get(['downloadHistory']);
    const history = result.downloadHistory || [];
    
    history.unshift({
      ...downloadInfo,
      timestamp: Date.now()
    });

    // Keep only last 50 items
    if (history.length > 50) {
      history.splice(50);
    }

    await chrome.storage.local.set({ downloadHistory: history });
  } catch (error) {
    console.error('Failed to save history:', error);
  }
}

async function loadHistory() {
  try {
    const result = await chrome.storage.local.get(['downloadHistory']);
    return result.downloadHistory || [];
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

// ===== UI Update Functions =====
function updateQualityDisplay(qualityValue) {
  const options = elements.qualityDropdown.querySelectorAll('.select-option');
  options.forEach(opt => {
    const isSelected = opt.dataset.value === qualityValue;
    opt.classList.toggle('selected', isSelected);
    if (isSelected) {
      elements.qualityValue.textContent = opt.querySelector('span').textContent;
    }
  });
}

function updateAudioQualityDisplay(qualityValue) {
  const options = elements.audioQualityDropdown.querySelectorAll('.select-option');
  options.forEach(opt => {
    const isSelected = opt.dataset.value === qualityValue;
    opt.classList.toggle('selected', isSelected);
    if (isSelected) {
      elements.audioQualityValue.textContent = opt.querySelector('span').textContent;
    }
  });
}

function updateFormatDisplay(format) {
  elements.formatButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.format === format);
  });
}

function updateVideoInfo(info) {
  elements.videoThumbnail.src = info.thumbnail;
  elements.videoDuration.textContent = formatDuration(info.duration || 0);
  elements.videoTitle.textContent = info.title;
  elements.videoChannel.textContent = info.channel;
  elements.progressThumbnail.src = info.thumbnail;
}

function updateProgress(progress) {
  const percent = progress.percent || 0;
  elements.progressBarFill.style.width = `${percent}%`;
  elements.progressPercent.textContent = `${Math.round(percent)}%`;
  
  if (progress.speed) {
    elements.downloadSpeed.textContent = formatSpeed(progress.speed);
  }
  
  if (progress.eta) {
    elements.downloadEta.textContent = formatETA(progress.eta);
  }
  
  if (progress.downloaded !== undefined && progress.total) {
    elements.downloadSize.textContent = `${formatBytes(progress.downloaded)} / ${formatBytes(progress.total)}`;
  }
  
  if (progress.filename) {
    elements.progressFilename.textContent = progress.filename;
  }
}

function updateConnectionStatus(connected, ytdlpVersion = null, ffmpegVersion = null) {
  const statusIndicator = elements.connectionStatus.querySelector('.status-indicator');
  const statusText = elements.connectionStatus.querySelector('span');
  
  statusIndicator.classList.toggle('connected', connected);
  statusIndicator.classList.toggle('disconnected', !connected);
  statusText.textContent = connected ? 'Connected' : 'Disconnected';
  
  if (ytdlpVersion) {
    elements.ytdlpVersion.textContent = ytdlpVersion;
  }
  
  if (ffmpegVersion) {
    elements.ffmpegVersion.textContent = ffmpegVersion;
  }
}

function renderHistory(history) {
  if (history.length === 0) {
    elements.historyList.innerHTML = `
      <div class="empty-history">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#6b6b6b" stroke-width="2"/>
          <path d="M12 6v6l4 2" stroke="#6b6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>No downloads yet</p>
      </div>
    `;
    return;
  }

  elements.historyList.innerHTML = history.map(item => `
    <div class="history-item">
      <img class="history-thumbnail" src="${item.thumbnail}" alt="Thumbnail">
      <div class="history-info">
        <div class="history-title">${item.title}</div>
        <div class="history-meta">${new Date(item.timestamp).toLocaleDateString()} • ${item.quality}</div>
      </div>
    </div>
  `).join('');
}

// ===== Communication Functions =====
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getVideoInfo() {
  try {
    const tab = await getCurrentTab();
    
    if (!tab.url.includes('youtube.com/watch')) {
      showState('notYoutubeState');
      return null;
    }

    // Request video info from content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' });
    
    if (response && response.success) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get video info:', error);
    return null;
  }
}

async function sendToServiceWorker(action, data) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

async function testNativeConnection() {
  try {
    const response = await sendToServiceWorker('testConnection');
    updateConnectionStatus(
      response.connected,
      response.ytdlpVersion,
      response.ffmpegVersion
    );
    return response.connected;
  } catch (error) {
    console.error('Connection test failed:', error);
    updateConnectionStatus(false);
    return false;
  }
}

async function startDownload() {
  if (state.isDownloading || !state.currentVideoInfo) return;

  state.isDownloading = true;
  elements.downloadBtn.classList.add('loading');
  elements.downloadBtn.disabled = true;

  try {
    // Get the format string based on selection
    let formatString;
    let extension;
    
    if (state.downloadType === 'audio') {
      const audioOption = elements.audioQualityDropdown.querySelector(`.select-option[data-value="${state.selectedAudioQuality}"]`);
      formatString = audioOption.dataset.format;
      extension = audioOption.dataset.ext;
    } else {
      const videoOption = elements.qualityDropdown.querySelector(`.select-option[data-value="${state.selectedQuality}"]`);
      formatString = videoOption.dataset.format;
      extension = state.selectedFormat;
    }

    const downloadOptions = {
      url: state.currentVideoInfo.url,
      format: formatString,
      output: state.downloadPath,
      extension: extension,
      subtitles: state.includeSubtitles,
      audioOnly: state.downloadType === 'audio',
      audioQuality: state.selectedAudioQuality.includes('mp3') 
        ? elements.audioQualityDropdown.querySelector(`.select-option[data-value="${state.selectedAudioQuality}"]`).dataset.quality
        : null,
      title: state.currentVideoInfo.title
    };

    // Show progress state
    showState('progressState');
    elements.progressTitle.textContent = 'Starting download...';
    elements.progressFilename.textContent = state.currentVideoInfo.title + '.' + extension;

    // Save quality preference if enabled
    if (elements.rememberQuality.checked) {
      if (state.downloadType === 'audio') {
        await saveSettings('lastAudioQuality', state.selectedAudioQuality);
      } else {
        await saveSettings('lastQuality', state.selectedQuality);
        await saveSettings('lastFormat', state.selectedFormat);
      }
    }

    // Send download request
    const response = await sendToServiceWorker('startDownload', downloadOptions);
    state.currentDownloadId = response.downloadId;

  } catch (error) {
    console.error('Download failed:', error);
    showError(error.message);
  } finally {
    state.isDownloading = false;
    elements.downloadBtn.classList.remove('loading');
    elements.downloadBtn.disabled = false;
  }
}

async function cancelDownload() {
  if (state.currentDownloadId) {
    try {
      await sendToServiceWorker('cancelDownload', { downloadId: state.currentDownloadId });
      showState('videoInfoState');
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  }
  state.currentDownloadId = null;
}

function showError(message) {
  elements.errorMessage.textContent = message;
  showState('errorState');
}

function showSuccess(filename) {
  elements.successFilename.textContent = filename;
  showState('successState');

  // Add to history
  if (state.currentVideoInfo) {
    addToHistory({
      title: state.currentVideoInfo.title,
      thumbnail: state.currentVideoInfo.thumbnail,
      quality: state.downloadType === 'audio' ? state.selectedAudioQuality : state.selectedQuality,
      filename: filename
    });
  }
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Type toggle
  elements.toggleVideo.addEventListener('click', () => {
    state.downloadType = 'video';
    elements.toggleVideo.classList.add('active');
    elements.toggleAudio.classList.remove('active');
    elements.qualityGroup.classList.remove('hidden');
    elements.audioQualityGroup.classList.add('hidden');
    elements.formatGroup.classList.remove('hidden');
  });

  elements.toggleAudio.addEventListener('click', () => {
    state.downloadType = 'audio';
    elements.toggleAudio.classList.add('active');
    elements.toggleVideo.classList.remove('active');
    elements.qualityGroup.classList.add('hidden');
    elements.audioQualityGroup.classList.remove('hidden');
    elements.formatGroup.classList.add('hidden');
  });

  // Quality dropdowns
  setupDropdown(elements.qualitySelect, elements.qualityTrigger, elements.qualityDropdown, (value) => {
    state.selectedQuality = value;
    updateQualityDisplay(value);
  });

  setupDropdown(elements.audioQualitySelect, elements.audioQualityTrigger, elements.audioQualityDropdown, (value) => {
    state.selectedAudioQuality = value;
    updateAudioQualityDisplay(value);
  });

  // Format buttons
  elements.formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedFormat = btn.dataset.format;
      updateFormatDisplay(btn.dataset.format);
    });
  });

  // Subtitles checkbox
  elements.subtitlesCheckbox.addEventListener('change', (e) => {
    state.includeSubtitles = e.target.checked;
  });

  // Change path button
  elements.changePathBtn.addEventListener('click', async () => {
    try {
      const response = await sendToServiceWorker('selectDirectory');
      if (response && response.path) {
        state.downloadPath = response.path;
        elements.downloadPath.textContent = truncatePath(response.path);
        await saveSettings('downloadPath', response.path);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  });

  // Download button
  elements.downloadBtn.addEventListener('click', startDownload);

  // Cancel button
  elements.cancelBtn.addEventListener('click', cancelDownload);

  // Success buttons
  elements.openFolderBtn.addEventListener('click', async () => {
    try {
      await sendToServiceWorker('openFolder', { path: state.downloadPath });
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  });

  elements.downloadAnotherBtn.addEventListener('click', () => {
    showState('videoInfoState');
  });

  // Error buttons
  elements.retryBtn.addEventListener('click', startDownload);
  elements.backBtn.addEventListener('click', () => {
    showState('videoInfoState');
  });

  // Settings modal
  elements.settingsBtn.addEventListener('click', () => {
    elements.settingsModal.classList.remove('hidden');
    testNativeConnection();
  });

  elements.closeSettingsBtn.addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
  });

  elements.settingsModal.querySelector('.modal-backdrop').addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
  });

  elements.testConnectionBtn.addEventListener('click', testNativeConnection);

  // Settings checkboxes
  elements.autoSelectBest.addEventListener('change', (e) => {
    saveSettings('autoSelectBest', e.target.checked);
  });

  elements.rememberQuality.addEventListener('change', (e) => {
    saveSettings('rememberQuality', e.target.checked);
  });

  elements.defaultSubtitles.addEventListener('change', (e) => {
    saveSettings('defaultSubtitles', e.target.checked);
  });

  elements.clearHistoryBtn.addEventListener('click', async () => {
    await chrome.storage.local.set({ downloadHistory: [] });
    renderHistory([]);
  });

  // History modal
  elements.historyBtn.addEventListener('click', async () => {
    elements.historyModal.classList.remove('hidden');
    const history = await loadHistory();
    renderHistory(history);
  });

  elements.closeHistoryBtn.addEventListener('click', () => {
    elements.historyModal.classList.add('hidden');
  });

  elements.historyModal.querySelector('.modal-backdrop').addEventListener('click', () => {
    elements.historyModal.classList.add('hidden');
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select')) {
      document.querySelectorAll('.custom-select.open').forEach(select => {
        select.classList.remove('open');
      });
    }
  });

  // Listen for progress updates from service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadProgress') {
      updateProgress(message.progress);
    } else if (message.action === 'downloadComplete') {
      showSuccess(message.filename);
      state.currentDownloadId = null;
    } else if (message.action === 'downloadError') {
      showError(message.error);
      state.currentDownloadId = null;
    }
  });
}

function setupDropdown(container, trigger, dropdown, onSelect) {
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    container.classList.toggle('open');
  });

  dropdown.querySelectorAll('.select-option').forEach(option => {
    option.addEventListener('click', () => {
      onSelect(option.dataset.value);
      container.classList.remove('open');
    });
  });
}

// ===== Initialization =====
async function init() {
  showState('loadingState');
  
  // Load saved settings
  await loadSettings();
  
  // Setup event listeners
  setupEventListeners();
  
  // Try to get video info
  const videoInfo = await getVideoInfo();
  
  if (videoInfo) {
    state.currentVideoInfo = videoInfo;
    updateVideoInfo(videoInfo);
    showState('videoInfoState');
  } else {
    showState('notYoutubeState');
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
