/**
 * YouTube Downloader - Options Page Script
 */

// ===== DOM Elements =====
const elements = {
  setupSection: document.getElementById('setupSection'),
  setupTestBtn: document.getElementById('setupTestBtn'),
  setupTestResult: document.getElementById('setupTestResult'),
  
  hostStatus: document.getElementById('hostStatus'),
  ytdlpVersion: document.getElementById('ytdlpVersion'),
  ffmpegVersion: document.getElementById('ffmpegVersion'),
  testConnectionBtn: document.getElementById('testConnectionBtn'),
  
  downloadPath: document.getElementById('downloadPath'),
  changePathBtn: document.getElementById('changePathBtn'),
  
  autoSelectBest: document.getElementById('autoSelectBest'),
  rememberQuality: document.getElementById('rememberQuality'),
  defaultSubtitles: document.getElementById('defaultSubtitles'),
  
  defaultVideoFormat: document.getElementById('defaultVideoFormat'),
  defaultAudioFormat: document.getElementById('defaultAudioFormat'),
  
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  resetSettingsBtn: document.getElementById('resetSettingsBtn')
};

// ===== Functions =====
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      'downloadPath',
      'autoSelectBest',
      'rememberQuality',
      'defaultSubtitles',
      'defaultVideoFormat',
      'defaultAudioFormat'
    ]);

    if (result.downloadPath) {
      elements.downloadPath.value = result.downloadPath;
    }

    if (result.autoSelectBest !== undefined) {
      elements.autoSelectBest.checked = result.autoSelectBest;
    }

    if (result.rememberQuality !== undefined) {
      elements.rememberQuality.checked = result.rememberQuality;
    }

    if (result.defaultSubtitles !== undefined) {
      elements.defaultSubtitles.checked = result.defaultSubtitles;
    }

    if (result.defaultVideoFormat) {
      elements.defaultVideoFormat.value = result.defaultVideoFormat;
    }

    if (result.defaultAudioFormat) {
      elements.defaultAudioFormat.value = result.defaultAudioFormat;
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

async function testConnection() {
  elements.hostStatus.textContent = 'Testing...';
  elements.hostStatus.className = 'status-badge';
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'testConnection' });
    
    if (response && response.connected) {
      elements.hostStatus.textContent = 'Connected';
      elements.hostStatus.className = 'status-badge connected';
      elements.ytdlpVersion.textContent = response.ytdlpVersion || 'Unknown';
      elements.ffmpegVersion.textContent = response.ffmpegVersion || 'Unknown';
      return true;
    } else {
      elements.hostStatus.textContent = 'Disconnected';
      elements.hostStatus.className = 'status-badge disconnected';
      elements.ytdlpVersion.textContent = '--';
      elements.ffmpegVersion.textContent = '--';
      return false;
    }
  } catch (error) {
    console.error('Connection test failed:', error);
    elements.hostStatus.textContent = 'Error';
    elements.hostStatus.className = 'status-badge disconnected';
    return false;
  }
}

async function selectDirectory() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'selectDirectory' });
    if (response && response.path) {
      elements.downloadPath.value = response.path;
      await saveSettings('downloadPath', response.path);
    }
  } catch (error) {
    console.error('Failed to select directory:', error);
  }
}

async function clearHistory() {
  if (confirm('Are you sure you want to clear the download history?')) {
    await chrome.storage.local.set({ downloadHistory: [] });
    alert('Download history cleared.');
  }
}

async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    const defaults = {
      downloadPath: '~/Downloads',
      autoSelectBest: true,
      rememberQuality: false,
      defaultSubtitles: false,
      defaultVideoFormat: 'mp4',
      defaultAudioFormat: 'mp3-320'
    };
    
    await chrome.storage.local.set(defaults);
    
    elements.downloadPath.value = defaults.downloadPath;
    elements.autoSelectBest.checked = defaults.autoSelectBest;
    elements.rememberQuality.checked = defaults.rememberQuality;
    elements.defaultSubtitles.checked = defaults.defaultSubtitles;
    elements.defaultVideoFormat.value = defaults.defaultVideoFormat;
    elements.defaultAudioFormat.value = defaults.defaultAudioFormat;
    
    alert('Settings reset to defaults.');
  }
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Test connection buttons
  elements.testConnectionBtn.addEventListener('click', testConnection);
  
  if (elements.setupTestBtn) {
    elements.setupTestBtn.addEventListener('click', async () => {
      const result = elements.setupTestResult;
      result.textContent = 'Testing connection...';
      result.className = 'test-result';
      result.style.display = 'block';
      
      const connected = await testConnection();
      
      if (connected) {
        result.textContent = '✓ Connection successful! Everything is set up correctly.';
        result.className = 'test-result success';
      } else {
        result.textContent = '✗ Connection failed. Please check the installation steps above.';
        result.className = 'test-result error';
      }
    });
  }
  
  // Path selection
  elements.changePathBtn.addEventListener('click', selectDirectory);
  
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
  
  // Format selects
  elements.defaultVideoFormat.addEventListener('change', (e) => {
    saveSettings('defaultVideoFormat', e.target.value);
  });
  
  elements.defaultAudioFormat.addEventListener('change', (e) => {
    saveSettings('defaultAudioFormat', e.target.value);
  });
  
  // Actions
  elements.clearHistoryBtn.addEventListener('click', clearHistory);
  elements.resetSettingsBtn.addEventListener('click', resetSettings);
}

// ===== Initialization =====
async function init() {
  // Check if this is the setup page
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('setup') === 'true') {
    elements.setupSection.classList.remove('hidden');
  }
  
  // Load settings
  await loadSettings();
  
  // Setup event listeners
  setupEventListeners();
  
  // Test connection on load
  testConnection();
}

document.addEventListener('DOMContentLoaded', init);
