/**
 * YouTube Downloader - Storage Utility Module
 * Centralized storage management with type safety
 */

const STORAGE_KEYS = {
  DOWNLOAD_PATH: 'downloadPath',
  AUTO_SELECT_BEST: 'autoSelectBest',
  REMEMBER_QUALITY: 'rememberQuality',
  DEFAULT_SUBTITLES: 'defaultSubtitles',
  DEFAULT_VIDEO_FORMAT: 'defaultVideoFormat',
  DEFAULT_AUDIO_FORMAT: 'defaultAudioFormat',
  LAST_QUALITY: 'lastQuality',
  LAST_FORMAT: 'lastFormat',
  LAST_AUDIO_QUALITY: 'lastAudioQuality',
  DOWNLOAD_HISTORY: 'downloadHistory'
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.DOWNLOAD_PATH]: '~/Downloads',
  [STORAGE_KEYS.AUTO_SELECT_BEST]: true,
  [STORAGE_KEYS.REMEMBER_QUALITY]: false,
  [STORAGE_KEYS.DEFAULT_SUBTITLES]: false,
  [STORAGE_KEYS.DEFAULT_VIDEO_FORMAT]: 'mp4',
  [STORAGE_KEYS.DEFAULT_AUDIO_FORMAT]: 'mp3-320',
  [STORAGE_KEYS.LAST_QUALITY]: 'best',
  [STORAGE_KEYS.LAST_FORMAT]: 'mp4',
  [STORAGE_KEYS.LAST_AUDIO_QUALITY]: 'mp3-320',
  [STORAGE_KEYS.DOWNLOAD_HISTORY]: []
};

/**
 * Get a single value from storage
 */
async function get(key) {
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key] !== undefined ? result[key] : DEFAULT_SETTINGS[key];
  } catch (error) {
    console.error(`Storage get error for ${key}:`, error);
    return DEFAULT_SETTINGS[key];
  }
}

/**
 * Get multiple values from storage
 */
async function getMultiple(keys) {
  try {
    const result = await chrome.storage.local.get(keys);
    const output = {};
    for (const key of keys) {
      output[key] = result[key] !== undefined ? result[key] : DEFAULT_SETTINGS[key];
    }
    return output;
  } catch (error) {
    console.error('Storage getMultiple error:', error);
    const output = {};
    for (const key of keys) {
      output[key] = DEFAULT_SETTINGS[key];
    }
    return output;
  }
}

/**
 * Get all settings
 */
async function getAll() {
  return getMultiple(Object.values(STORAGE_KEYS));
}

/**
 * Set a single value in storage
 */
async function set(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
    return true;
  } catch (error) {
    console.error(`Storage set error for ${key}:`, error);
    return false;
  }
}

/**
 * Set multiple values in storage
 */
async function setMultiple(data) {
  try {
    await chrome.storage.local.set(data);
    return true;
  } catch (error) {
    console.error('Storage setMultiple error:', error);
    return false;
  }
}

/**
 * Reset all settings to defaults
 */
async function resetToDefaults() {
  try {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
    return true;
  } catch (error) {
    console.error('Storage reset error:', error);
    return false;
  }
}

/**
 * Add item to download history
 */
async function addToHistory(item) {
  try {
    const history = await get(STORAGE_KEYS.DOWNLOAD_HISTORY);
    history.unshift({
      ...item,
      timestamp: Date.now()
    });
    
    // Keep only last 50 items
    if (history.length > 50) {
      history.splice(50);
    }
    
    await set(STORAGE_KEYS.DOWNLOAD_HISTORY, history);
    return true;
  } catch (error) {
    console.error('Add to history error:', error);
    return false;
  }
}

/**
 * Clear download history
 */
async function clearHistory() {
  return set(STORAGE_KEYS.DOWNLOAD_HISTORY, []);
}

/**
 * Get download history
 */
async function getHistory() {
  return get(STORAGE_KEYS.DOWNLOAD_HISTORY);
}

// Export for use in other modules
export {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  get,
  getMultiple,
  getAll,
  set,
  setMultiple,
  resetToDefaults,
  addToHistory,
  clearHistory,
  getHistory
};
