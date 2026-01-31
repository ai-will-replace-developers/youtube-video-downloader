#!/bin/bash

# ============================================================
# Generate PNG icons from SVG files
# Requires: rsvg-convert (librsvg) or ImageMagick
# ============================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ICONS_DIR="$SCRIPT_DIR/icons"

echo "Generating PNG icons..."

# Check for conversion tools
if command -v rsvg-convert &> /dev/null; then
    echo "Using rsvg-convert..."
    rsvg-convert -w 16 -h 16 "$ICONS_DIR/icon16.svg" -o "$ICONS_DIR/icon16.png"
    rsvg-convert -w 48 -h 48 "$ICONS_DIR/icon48.svg" -o "$ICONS_DIR/icon48.png"
    rsvg-convert -w 128 -h 128 "$ICONS_DIR/icon128.svg" -o "$ICONS_DIR/icon128.png"
    echo "Done!"
elif command -v convert &> /dev/null; then
    echo "Using ImageMagick..."
    convert -background none -resize 16x16 "$ICONS_DIR/icon16.svg" "$ICONS_DIR/icon16.png"
    convert -background none -resize 48x48 "$ICONS_DIR/icon48.svg" "$ICONS_DIR/icon48.png"
    convert -background none -resize 128x128 "$ICONS_DIR/icon128.svg" "$ICONS_DIR/icon128.png"
    echo "Done!"
else
    echo "No SVG converter found."
    echo "Install with: brew install librsvg"
    echo "Or: brew install imagemagick"
    echo ""
    echo "Creating placeholder icons instead..."
    
    # Create simple placeholder PNGs using Python
    python3 << 'EOF'
import struct
import zlib
import os

def create_png(width, height, color_rgb, output_path):
    """Create a simple solid color PNG"""
    
    def make_chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc
    
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk (image data)
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # Filter byte
        for x in range(width):
            # Create rounded rectangle effect
            margin = min(width, height) // 6
            corner_radius = min(width, height) // 4
            
            in_rect = margin <= x < width - margin and margin <= y < height - margin
            
            # Check if we're in the rounded corners
            if in_rect:
                # Check corners
                dx = dy = 0
                if x < margin + corner_radius:
                    dx = margin + corner_radius - x
                elif x >= width - margin - corner_radius:
                    dx = x - (width - margin - corner_radius - 1)
                
                if y < margin + corner_radius:
                    dy = margin + corner_radius - y
                elif y >= height - margin - corner_radius:
                    dy = y - (height - margin - corner_radius - 1)
                
                if dx > 0 and dy > 0:
                    if dx * dx + dy * dy > corner_radius * corner_radius:
                        in_rect = False
            
            if in_rect:
                raw_data += bytes(color_rgb)  # Icon color
            else:
                raw_data += b'\xf4\xf3\xee'  # Background color
    
    compressed = zlib.compress(raw_data, 9)
    idat = make_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = make_chunk(b'IEND', b'')
    
    # Write PNG
    with open(output_path, 'wb') as f:
        f.write(signature + ihdr + idat + iend)

# Create icons
script_dir = os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else os.getcwd()
icons_dir = os.path.join(script_dir, 'icons')

color = (44, 44, 44)  # #2c2c2c

create_png(16, 16, color, os.path.join(icons_dir, 'icon16.png'))
create_png(48, 48, color, os.path.join(icons_dir, 'icon48.png'))
create_png(128, 128, color, os.path.join(icons_dir, 'icon128.png'))

print("Created placeholder PNG icons")
EOF
    
fi

echo ""
echo "Icons generated in: $ICONS_DIR"
ls -la "$ICONS_DIR"/*.png 2>/dev/null || echo "No PNG files found"
