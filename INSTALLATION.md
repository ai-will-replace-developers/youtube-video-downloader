# Installation Guide

## YouTube Downloader Chrome Extension

This guide will help you set up the YouTube Downloader extension on macOS.

---

## Prerequisites

Before installing, make sure you have the following:

### 1. Homebrew (Package Manager)

If you don't have Homebrew installed, run this in Terminal:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. yt-dlp

yt-dlp is the core tool that handles video downloads:

```bash
brew install yt-dlp
```

Or using pip:

```bash
pip3 install yt-dlp
```

### 3. ffmpeg

ffmpeg is required for video/audio processing and format conversion:

```bash
brew install ffmpeg
```

### 4. Python 3

Python 3 should already be installed on macOS. Verify with:

```bash
python3 --version
```

If not installed:

```bash
brew install python3
```

---

## Installation Steps

### Step 1: Download the Extension

1. Download or clone this repository
2. Extract to a location you'll remember (e.g., `~/Documents/youtube-downloader`)

### Step 2: Convert SVG Icons to PNG

The extension requires PNG icons. Run this script to convert them:

```bash
cd /path/to/youtube-downloader

# If you have ImageMagick installed:
convert -background none icons/icon16.svg icons/icon16.png
convert -background none icons/icon48.svg icons/icon48.png
convert -background none icons/icon128.svg icons/icon128.png

# Or use an online SVG to PNG converter
```

**Alternative:** Use the provided PNG icons if available, or create simple 16x16, 48x48, and 128x128 PNG images.

### Step 3: Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable **Developer mode** (toggle in top right corner)
4. Click **Load unpacked**
5. Select the extension folder (containing `manifest.json`)
6. Note the **Extension ID** shown under the extension name (you'll need this)

### Step 4: Install Native Host

Run the installation script:

```bash
cd /path/to/youtube-downloader
chmod +x install-host.sh
./install-host.sh
```

When prompted, enter your extension ID from Step 3.

### Step 5: Restart Chrome

Close all Chrome windows completely, then reopen Chrome.

### Step 6: Test the Extension

1. Go to any YouTube video
2. Click the extension icon in Chrome toolbar
3. Click "Settings" and verify the connection shows "Connected"

---

## Troubleshooting

### "Native host disconnected" Error

1. **Verify the manifest path:**
   ```bash
   cat ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.youtube.downloader.json
   ```
   Make sure the `path` points to an existing file.

2. **Check host script permissions:**
   ```bash
   ls -la ~/Library/Application\ Support/YouTube\ Downloader/host.py
   ```
   Should show `-rwxr-xr-x` (executable).

3. **Test the host script directly:**
   ```bash
   echo '{"action":"test"}' | python3 ~/Library/Application\ Support/YouTube\ Downloader/host.py
   ```

4. **Check the log file:**
   ```bash
   cat ~/Library/Logs/youtube-downloader-host.log
   ```

### "yt-dlp not found" Error

Make sure yt-dlp is installed and in your PATH:

```bash
which yt-dlp
yt-dlp --version
```

If installed via pip, add to the script paths in `host.py`.

### "ffmpeg not found" Error

Install ffmpeg:

```bash
brew install ffmpeg
which ffmpeg
```

### Downloads Not Starting

1. Check if the video URL is valid
2. Try a different quality setting
3. Check the log file for errors
4. Make sure the download directory exists and is writable

### Permission Denied Errors

Make sure the download directory is writable:

```bash
ls -la ~/Downloads
```

Or choose a different directory in the extension settings.

---

## Updating

### Update yt-dlp

```bash
brew upgrade yt-dlp
# Or
pip3 install --upgrade yt-dlp
```

### Update the Extension

1. Pull the latest changes or download new version
2. Go to `chrome://extensions`
3. Click the refresh icon on the extension card

### Update Native Host

Run the installer again:

```bash
./install-host.sh
```

---

## Uninstallation

### Remove Native Host

```bash
./uninstall-host.sh
```

### Remove Extension

1. Go to `chrome://extensions`
2. Find YouTube Downloader
3. Click "Remove"

### Remove Dependencies (Optional)

```bash
brew uninstall yt-dlp ffmpeg
```

---

## File Locations

| Component | Location |
|-----------|----------|
| Extension | Where you extracted it |
| Native Host Script | `~/Library/Application Support/YouTube Downloader/host.py` |
| Native Messaging Manifest | `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.youtube.downloader.json` |
| Log File | `~/Library/Logs/youtube-downloader-host.log` |
| Extension Settings | Chrome's internal storage |

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the log file at `~/Library/Logs/youtube-downloader-host.log`
3. Make sure all dependencies are up to date
4. Try restarting Chrome after any configuration changes
