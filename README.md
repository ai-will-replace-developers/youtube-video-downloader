<div align="center">

<img src="https://raw.githubusercontent.com/feathericons/feather/master/icons/download-cloud.svg" width="56" height="56" alt="icon">

# YouTube Downloader

**A native macOS Chrome extension for downloading YouTube videos in the quality and format you choose.**

![Version](https://img.shields.io/badge/version-1.0.0-0a0a0a?style=flat-square)
![Platform](https://img.shields.io/badge/platform-macOS-0a0a0a?style=flat-square)
![Manifest](https://img.shields.io/badge/manifest-v3-0a0a0a?style=flat-square)
![License](https://img.shields.io/badge/license-personal--use-0a0a0a?style=flat-square)

</div>

---

## What it does

YouTube Downloader adds a toolbar popup to Chrome that lets you save the video you're watching directly to disk. It doesn't scrape or proxy video data through a server — instead, the extension talks to a small Python program installed on your Mac (a "native host"), which runs [yt-dlp](https://github.com/yt-dlp/yt-dlp) locally and streams progress back to the popup in real time.

That local-host design is what lets it do things a normal extension can't:

- Download actual video/audio files instead of just opening a stream
- Report live speed, ETA, and percentage while the file is being written
- Merge separate video and audio tracks into one file using ffmpeg
- Support every format and quality yt-dlp supports, not just what YouTube's player exposes

<div align="center">
<img src="https://github.com/ai-will-replace-developers/youtube-video-downloader/blob/main/image.png?raw=true" width="640" alt="Extension popup showing quality and format selection">
</div>

---

## Features

| | |
|---|---|
| **Quality** | 4K, 1080p, 720p, 480p, 360p, or auto-best |
| **Audio-only** | MP3 (320/192 kbps), M4A, or Opus |
| **Containers** | MP4, WebM, MKV |
| **Subtitles** | Downloaded alongside video when available |
| **Save location** | User-configurable download folder |
| **Progress** | Live speed, ETA, and percent complete, with cancel |
| **History** | Local record of past downloads |
| **Settings** | Persistent defaults for quality, format, and subtitles |

---

## Requirements

- macOS 10.15 (Catalina) or later
- Chrome or another Chromium-based browser
- Python 3.8+
- yt-dlp
- ffmpeg (recommended, required for merging separate video/audio streams)

---

## Installation

### 1. Clone the Repository

Clone the repository to your local machine and navigate into the project folder:
```bash
git clone https://github.com/unrealsrabon/youtube-video-downloader
cd youtube-video-downloader
```

### 2. Install Dependencies

Make sure you have [Homebrew](https://brew.sh) installed, then run:
```bash
brew install yt-dlp ffmpeg
```

### 3. Install the Native Host
Make the installation script executable and run it to register the native messaging connection:
```bash
chmod +x install-host.sh
./install-host.sh
```
*Note: You will be prompted to enter the Extension ID during this process (see step 4).*

### 4. Load the Extension
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left corner.
4. Select this project folder.
5. Copy the generated Extension ID from this page and paste it into your terminal prompt from step 3.

### 5. Restart Chrome
Fully quit and reopen Chrome so the native messaging connection registers properly.
 video, click the extension icon, pick a quality and format, and press Download.

---

## How it works

```
Popup UI  →  Service worker  →  Native host (Python)  →  yt-dlp
                                       │
              Progress updates  ←  stdout parsing
```

The popup never talks to yt-dlp directly. It sends a request to the extension's background service worker, which relays it to the native host process over Chrome's native messaging protocol. The host runs yt-dlp, parses its stdout for progress, and streams updates back up the same channel — which is how you get a live progress bar without polling a server.

---

## Project structure

```
youtube-downloader/
├── manifest.json                     Extension manifest (v3)
├── popup/                            Popup UI (html/css/js)
├── content/                          YouTube page overlay script
├── background/service-worker.js      Message routing
├── options/                          Settings page
├── native-host/
│   ├── host.py                       Runs yt-dlp, reports progress
│   └── com.youtube.downloader.json   Native messaging manifest
├── utils/storage.js                  Chrome storage helpers
├── install-host.sh / uninstall-host.sh
└── icons/
```

---

## Troubleshooting

**Extension doesn't load**
Confirm Developer mode is on, check `chrome://extensions` for errors, and reload the extension.

**"Native host not connected"**
Re-run `./install-host.sh` with the correct extension ID, and check `~/Library/Logs/youtube-downloader-host.log`.

**Downloads fail**
Test yt-dlp directly with `yt-dlp <url>`, update it with `brew upgrade yt-dlp`, or try a different quality/format.

**"yt-dlp not found"**
```bash
which yt-dlp
export PATH="$HOME/.local/bin:$PATH"   # if installed via pip
```

---

## Limitations

- Live streams are only partially supported and may fail
- DRM-protected content cannot be downloaded
- Age-restricted videos may require browser cookies
- Playlists download one video at a time, not in bulk

---

## Privacy

Everything runs locally. There is no analytics, no external API beyond YouTube itself, and no data leaves your machine.

---

## Credits

Built on [yt-dlp](https://github.com/yt-dlp/yt-dlp) and [ffmpeg](https://ffmpeg.org/), with [Inter](https://fonts.google.com/specimen/Inter) for typography.

---

<div align="center">

**For personal use only.** Respect copyright law and YouTube's Terms of Service — only download content you have the right to.

</div>
