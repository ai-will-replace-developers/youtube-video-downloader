# YouTube Downloader

A premium-quality Chrome extension for downloading YouTube videos using yt-dlp and native messaging.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-Personal%20Use-green)

---

## Features

### Core Functionality
- **Quality Selection** - Download in 4K, 1080p, 720p, 480p, 360p, or auto-best
- **Audio Extraction** - Download audio-only in MP3, M4A, or Opus formats
- **Format Options** - Choose between MP4, WebM, or MKV containers
- **Subtitle Support** - Download subtitles when available
- **Custom Download Path** - Choose where to save your downloads

### User Experience
- **Real-time Progress** - See download speed, ETA, and completion percentage
- **Download History** - Track your previous downloads
- **Persistent Settings** - Remembers your preferences
- **Notifications** - Get notified when downloads complete

### Design
- Premium, minimal aesthetic with warm off-white (#f4f3ee) theme
- Smooth animations and transitions
- Responsive and accessible interface
- Native macOS integration

---

## Screenshots

### Popup Interface
The main popup shows video info, quality options, and download controls.

### Progress Tracking
Real-time progress with speed, ETA, and cancel option.

### Settings
Configure defaults, test connection, and manage history.

---

## Requirements

- **macOS** (10.15 Catalina or later)
- **Chrome** or Chromium-based browser
- **Python 3.8+**
- **yt-dlp**
- **ffmpeg** (recommended)

---

## Quick Start

### 1. Install Dependencies

```bash
# Install yt-dlp
brew install yt-dlp

# Install ffmpeg
brew install ffmpeg
```

### 2. Load Extension

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this folder

### 3. Install Native Host

```bash
chmod +x install-host.sh
./install-host.sh
```

Enter your extension ID when prompted.

### 4. Restart Chrome

Close and reopen Chrome completely.

### 5. Start Downloading

1. Go to any YouTube video
2. Click the extension icon
3. Select quality and format
4. Click Download!

---

## Usage

### Downloading a Video

1. Navigate to a YouTube video page
2. Click the YouTube Downloader extension icon
3. The popup shows video thumbnail, title, and channel
4. Select **Video** or **Audio** mode
5. Choose quality (4K, 1080p, 720p, etc.)
6. Select format (MP4, WebM, MKV)
7. Optionally enable subtitles
8. Choose download location
9. Click **Download**

### Download Progress

Once a download starts:
- Progress bar shows completion percentage
- Speed indicator shows current download rate
- ETA shows estimated time remaining
- Cancel button stops the download

### Audio-Only Downloads

1. Click the **Audio** toggle
2. Choose audio format:
   - MP3 (320kbps or 192kbps)
   - M4A (AAC)
   - Opus (highest quality)
3. Click Download

### Settings

Access settings via the gear icon:
- **Default download path** - Where files are saved
- **Auto-select best quality** - Always use best available
- **Remember quality choice** - Save last selected quality
- **Default subtitles** - Include subtitles by default
- **Connection status** - Verify native host is working
- **Version info** - See yt-dlp and ffmpeg versions

---

## Project Structure

```
youtube-downloader/
├── manifest.json           # Extension manifest (v3)
├── popup/
│   ├── popup.html         # Popup interface
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
├── content/
│   ├── content.js         # YouTube page script
│   └── content.css        # Overlay styles
├── background/
│   └── service-worker.js  # Background service
├── options/
│   ├── options.html       # Settings page
│   ├── options.css        # Settings styles
│   └── options.js         # Settings logic
├── native-host/
│   ├── host.py            # Native messaging host
│   └── com.youtube.downloader.json  # Host manifest
├── icons/
│   ├── icon16.svg/.png    # 16x16 icon
│   ├── icon48.svg/.png    # 48x48 icon
│   └── icon128.svg/.png   # 128x128 icon
├── utils/
│   └── storage.js         # Storage utilities
├── install-host.sh        # Installation script
├── uninstall-host.sh      # Uninstallation script
├── INSTALLATION.md        # Detailed setup guide
└── README.md              # This file
```

---

## Technical Details

### Native Messaging

The extension uses Chrome's native messaging API to communicate with a Python script that executes yt-dlp commands. This approach:

- Bypasses browser security restrictions
- Provides real-time progress updates
- Handles large file downloads efficiently
- Supports all yt-dlp features

### Communication Flow

```
Extension Popup → Service Worker → Native Host (Python) → yt-dlp
                                   ↓
Progress Updates ← Native Host ← stdout parsing
```

### Security

- All processing is local
- No data sent to external servers
- URLs validated before processing
- Filenames sanitized to prevent path traversal

---

## Troubleshooting

### Extension Not Working

1. Make sure developer mode is enabled
2. Check for errors in `chrome://extensions`
3. Reload the extension

### Native Host Not Connected

1. Run `./install-host.sh` again
2. Verify extension ID is correct
3. Check file permissions
4. Review log: `~/Library/Logs/youtube-downloader-host.log`

### Downloads Failing

1. Test yt-dlp directly: `yt-dlp [URL]`
2. Update yt-dlp: `brew upgrade yt-dlp`
3. Check internet connection
4. Try a different quality/format

### "yt-dlp not found"

```bash
# Check if yt-dlp is installed
which yt-dlp

# If using pip install, might need to add to PATH
export PATH="$HOME/.local/bin:$PATH"
```

---

## Updating

### Update yt-dlp

```bash
brew upgrade yt-dlp
# or
pip3 install --upgrade yt-dlp
```

### Update Extension

1. Pull latest changes
2. Go to `chrome://extensions`
3. Click refresh on the extension

---

## Known Limitations

- **Live streams** - Limited support, may fail
- **DRM content** - Cannot download protected videos
- **Age-restricted** - Requires browser cookies for some content
- **Playlists** - Downloads single videos only

---

## Privacy

- **No analytics** - No tracking or data collection
- **Local processing** - Everything runs on your machine
- **No external APIs** - Only communicates with YouTube
- **Open source** - All code is visible and auditable

---

## License

For personal use only. Not for distribution.

---

## Credits

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The amazing download engine
- [ffmpeg](https://ffmpeg.org/) - Media processing
- [Inter Font](https://fonts.google.com/specimen/Inter) - Typography

---

## Disclaimer

This tool is for personal use only. Respect copyright laws and YouTube's Terms of Service. Only download content you have the right to download.
