#!/bin/bash

# ============================================================
# YouTube Downloader - Native Host Installation Script
# For macOS
# ============================================================

set -e

echo "=============================================="
echo "YouTube Downloader - Native Host Installer"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Paths
HOST_SCRIPT="$SCRIPT_DIR/native-host/host.py"
APP_SUPPORT_DIR="$HOME/Library/Application Support/YouTube Downloader"
NATIVE_HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
MANIFEST_NAME="com.youtube.downloader.json"

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Error: This script is designed for macOS only.${NC}"
    exit 1
fi

# Step 1: Check for required dependencies
echo "Step 1: Checking dependencies..."

# Check for Python 3
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo -e "  ${GREEN}✓${NC} $PYTHON_VERSION"
else
    echo -e "  ${RED}✗${NC} Python 3 not found"
    echo "    Install with: brew install python3"
    exit 1
fi

# Check for yt-dlp
if command -v yt-dlp &> /dev/null; then
    YTDLP_VERSION=$(yt-dlp --version 2>&1)
    echo -e "  ${GREEN}✓${NC} yt-dlp version $YTDLP_VERSION"
else
    echo -e "  ${RED}✗${NC} yt-dlp not found"
    echo "    Install with: brew install yt-dlp"
    echo "    Or: pip3 install yt-dlp"
    exit 1
fi

# Check for ffmpeg
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n 1)
    echo -e "  ${GREEN}✓${NC} $FFMPEG_VERSION"
else
    echo -e "  ${YELLOW}!${NC} ffmpeg not found (optional but recommended)"
    echo "    Install with: brew install ffmpeg"
fi

echo ""

# Step 2: Create application support directory
echo "Step 2: Setting up application directory..."
mkdir -p "$APP_SUPPORT_DIR"
echo -e "  ${GREEN}✓${NC} Created: $APP_SUPPORT_DIR"

# Step 3: Copy host script
echo ""
echo "Step 3: Installing native host script..."
cp "$HOST_SCRIPT" "$APP_SUPPORT_DIR/host.py"
chmod +x "$APP_SUPPORT_DIR/host.py"
echo -e "  ${GREEN}✓${NC} Installed host.py to $APP_SUPPORT_DIR"

# Step 4: Create native messaging host directory
echo ""
echo "Step 4: Setting up Chrome native messaging..."
mkdir -p "$NATIVE_HOST_DIR"

# Step 5: Get Extension ID
echo ""
echo "Step 5: Configuration required"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC} You need to provide your Chrome extension ID."
echo ""
echo "To find your extension ID:"
echo "  1. Open Chrome and go to: chrome://extensions"
echo "  2. Enable 'Developer mode' (toggle in top right)"
echo "  3. Load the unpacked extension from this folder"
echo "  4. Copy the 'ID' shown under the extension name"
echo ""
read -p "Enter your extension ID: " EXTENSION_ID

if [ -z "$EXTENSION_ID" ]; then
    echo -e "${RED}Error: Extension ID is required.${NC}"
    exit 1
fi

# Step 6: Create native messaging manifest
echo ""
echo "Step 6: Creating native messaging manifest..."

cat > "$NATIVE_HOST_DIR/$MANIFEST_NAME" << EOF
{
  "name": "com.youtube.downloader",
  "description": "YouTube Downloader Native Host - Executes yt-dlp commands",
  "path": "$APP_SUPPORT_DIR/host.py",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF

echo -e "  ${GREEN}✓${NC} Created manifest at: $NATIVE_HOST_DIR/$MANIFEST_NAME"

# Step 7: Set permissions
echo ""
echo "Step 7: Setting permissions..."
chmod 644 "$NATIVE_HOST_DIR/$MANIFEST_NAME"
chmod 755 "$APP_SUPPORT_DIR/host.py"
echo -e "  ${GREEN}✓${NC} Permissions set correctly"

# Step 8: Verify installation
echo ""
echo "Step 8: Verifying installation..."

if [ -f "$NATIVE_HOST_DIR/$MANIFEST_NAME" ] && [ -x "$APP_SUPPORT_DIR/host.py" ]; then
    echo -e "  ${GREEN}✓${NC} All files installed correctly"
else
    echo -e "  ${RED}✗${NC} Installation verification failed"
    exit 1
fi

# Done
echo ""
echo "=============================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Restart Chrome (close all Chrome windows and reopen)"
echo "  2. Go to a YouTube video"
echo "  3. Click the extension icon to start downloading!"
echo ""
echo "Files installed:"
echo "  - Host script: $APP_SUPPORT_DIR/host.py"
echo "  - Manifest: $NATIVE_HOST_DIR/$MANIFEST_NAME"
echo ""
echo "Log file location: ~/Library/Logs/youtube-downloader-host.log"
echo ""
echo "To uninstall, run: ./uninstall-host.sh"
echo ""
