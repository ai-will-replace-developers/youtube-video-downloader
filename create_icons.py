#!/usr/bin/env python3
"""Generate PNG icons for the Chrome extension"""

import struct
import zlib
import os

def create_png(width, height, output_path):
    """Create a simple PNG with rounded rectangle and download icon"""
    
    def make_chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc
    
    signature = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)
    
    raw_data = b''
    corner_radius = width // 4
    icon_color = (44, 44, 44, 255)
    arrow_color = (244, 243, 238, 255)
    transparent = (0, 0, 0, 0)
    
    for y in range(height):
        raw_data += b'\x00'
        for x in range(width):
            in_rect = True
            
            if x < corner_radius and y < corner_radius:
                dx = corner_radius - x
                dy = corner_radius - y
                if dx * dx + dy * dy > corner_radius * corner_radius:
                    in_rect = False
            elif x >= width - corner_radius and y < corner_radius:
                dx = x - (width - corner_radius - 1)
                dy = corner_radius - y
                if dx * dx + dy * dy > corner_radius * corner_radius:
                    in_rect = False
            elif x < corner_radius and y >= height - corner_radius:
                dx = corner_radius - x
                dy = y - (height - corner_radius - 1)
                if dx * dx + dy * dy > corner_radius * corner_radius:
                    in_rect = False
            elif x >= width - corner_radius and y >= height - corner_radius:
                dx = x - (width - corner_radius - 1)
                dy = y - (height - corner_radius - 1)
                if dx * dx + dy * dy > corner_radius * corner_radius:
                    in_rect = False
            
            if not in_rect:
                raw_data += bytes(transparent)
                continue
            
            center_x = width // 2
            shaft_width = max(2, width // 6)
            shaft_top = height // 4
            shaft_bottom = height // 2 + height // 8
            
            in_shaft = (center_x - shaft_width // 2 <= x <= center_x + shaft_width // 2 and
                       shaft_top <= y <= shaft_bottom)
            
            arrow_width = max(4, width // 3)
            head_top = shaft_bottom - shaft_width
            head_bottom = shaft_bottom + arrow_width // 3
            
            in_head = False
            if head_top <= y <= head_bottom:
                progress = (y - head_top) / max(1, (head_bottom - head_top))
                head_width_at_y = int(arrow_width * progress) // 2
                if center_x - head_width_at_y <= x <= center_x + head_width_at_y:
                    in_head = True
            
            bar_left = width // 4
            bar_right = width - width // 4
            bar_top = height - height // 4
            bar_bottom = height - height // 6
            
            in_bar = (bar_left <= x <= bar_right and bar_top <= y <= bar_bottom)
            
            if in_shaft or in_head or in_bar:
                raw_data += bytes(arrow_color)
            else:
                raw_data += bytes(icon_color)
    
    compressed = zlib.compress(raw_data, 9)
    idat = make_chunk(b'IDAT', compressed)
    iend = make_chunk(b'IEND', b'')
    
    with open(output_path, 'wb') as f:
        f.write(signature + ihdr + idat + iend)
    print(f"Created: {output_path}")

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'icons')
    
    os.makedirs(icons_dir, exist_ok=True)
    
    create_png(16, 16, os.path.join(icons_dir, 'icon16.png'))
    create_png(48, 48, os.path.join(icons_dir, 'icon48.png'))
    create_png(128, 128, os.path.join(icons_dir, 'icon128.png'))
    
    print("All icons created successfully!")
