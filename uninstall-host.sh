#!/bin/bash

# ============================================================
# YouTube Downloader - Native Host Uninstallation Script
# For macOS
# ============================================================

echo "=============================================="
echo "YouTube Downloader - Native Host Uninstaller"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Paths
APP_SUPPORT_DIR="$HOME/Library/Application Support/YouTube Downloader"
NATIVE_HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
MANIFEST_NAME="com.youtube.downloader.json"
LOG_FILE="$HOME/Library/Logs/youtube-downloader-host.log"

echo "This will remove the YouTube Downloader native host."
read -p "Are you sure you want to continue? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Uninstallation cancelled."
    exit 0
fi

echo ""
echo "Removing files..."

# Remove manifest
if [ -f "$NATIVE_HOST_DIR/$MANIFEST_NAME" ]; then
    rm "$NATIVE_HOST_DIR/$MANIFEST_NAME"
    echo -e "  ${GREEN}✓${NC} Removed: $NATIVE_HOST_DIR/$MANIFEST_NAME"
else
    echo "  - Manifest not found (already removed)"
fi

# Remove application support directory
if [ -d "$APP_SUPPORT_DIR" ]; then
    rm -rf "$APP_SUPPORT_DIR"
    echo -e "  ${GREEN}✓${NC} Removed: $APP_SUPPORT_DIR"
else
    echo "  - Application directory not found (already removed)"
fi

# Remove log file
if [ -f "$LOG_FILE" ]; then
    rm "$LOG_FILE"
    echo -e "  ${GREEN}✓${NC} Removed: $LOG_FILE"
else
    echo "  - Log file not found (already removed)"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}Uninstallation Complete!${NC}"
echo "=============================================="
echo ""
echo "Note: The Chrome extension itself was not removed."
echo "To remove it, go to chrome://extensions and remove it manually."
echo ""
