#!/usr/bin/env python3
"""
YouTube Downloader - Native Messaging Host
Handles communication between Chrome extension and yt-dlp

This script receives JSON messages from the Chrome extension via stdin,
executes yt-dlp commands, and sends progress/results back via stdout.
"""

import json
import sys
import struct
import subprocess
import threading
import os
import re
import signal
from pathlib import Path
from typing import Optional, Dict, Any

# ===== Configuration =====
DEBUG_LOG = os.path.expanduser('~/Library/Logs/youtube-downloader-host.log')
ENABLE_DEBUG = True

# Active downloads tracking
active_downloads: Dict[str, subprocess.Popen] = {}

# ===== Logging =====
def log(message: str):
    """Write debug message to log file"""
    if not ENABLE_DEBUG:
        return
    try:
        with open(DEBUG_LOG, 'a') as f:
            f.write(f"{message}\n")
    except Exception:
        pass

# ===== Native Messaging Protocol =====
def send_message(message: Dict[str, Any]):
    """Send a message to the extension via stdout"""
    try:
        encoded = json.dumps(message).encode('utf-8')
        # Chrome native messaging uses 4-byte length prefix (little-endian)
        sys.stdout.buffer.write(struct.pack('<I', len(encoded)))
        sys.stdout.buffer.write(encoded)
        sys.stdout.buffer.flush()
        log(f"Sent: {message}")
    except Exception as e:
        log(f"Error sending message: {e}")

def receive_message() -> Optional[Dict[str, Any]]:
    """Receive a message from the extension via stdin"""
    try:
        # Read the 4-byte length prefix
        length_bytes = sys.stdin.buffer.read(4)
        if not length_bytes or len(length_bytes) < 4:
            return None
        
        # Unpack length (little-endian unsigned int)
        length = struct.unpack('<I', length_bytes)[0]
        
        # Read the message content
        content = sys.stdin.buffer.read(length)
        if not content:
            return None
        
        message = json.loads(content.decode('utf-8'))
        log(f"Received: {message}")
        return message
    except Exception as e:
        log(f"Error receiving message: {e}")
        return None

# ===== Utility Functions =====
def get_ytdlp_path() -> str:
    """Find yt-dlp executable"""
    # Check common locations
    paths = [
        '/opt/homebrew/bin/yt-dlp',
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp',
        os.path.expanduser('~/.local/bin/yt-dlp'),
    ]
    
    for path in paths:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    
    # Try using 'which'
    try:
        result = subprocess.run(['which', 'yt-dlp'], capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    
    return 'yt-dlp'

def get_ffmpeg_path() -> str:
    """Find ffmpeg executable"""
    paths = [
        '/opt/homebrew/bin/ffmpeg',
        '/usr/local/bin/ffmpeg',
        '/usr/bin/ffmpeg',
    ]
    
    for path in paths:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    
    return 'ffmpeg'

def get_version(executable: str) -> str:
    """Get version of yt-dlp or ffmpeg"""
    try:
        result = subprocess.run(
            [executable, '--version'],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            # Extract first line or version number
            output = result.stdout.strip()
            if 'ffmpeg' in executable.lower():
                # ffmpeg version format: "ffmpeg version X.X.X ..."
                match = re.search(r'ffmpeg version (\S+)', output)
                if match:
                    return match.group(1)
            else:
                # yt-dlp version is usually the first line
                return output.split('\n')[0]
        return 'unknown'
    except Exception as e:
        log(f"Error getting version for {executable}: {e}")
        return 'not found'

def sanitize_filename(filename: str) -> str:
    """Remove invalid characters from filename"""
    # Remove or replace invalid characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    # Limit length
    if len(filename) > 200:
        filename = filename[:200]
    return filename

def expand_path(path: str) -> str:
    """Expand ~ and environment variables in path"""
    return os.path.expanduser(os.path.expandvars(path))

# ===== Progress Parsing =====
def parse_progress_line(line: str, download_id: str) -> Optional[Dict[str, Any]]:
    """Parse yt-dlp output line for progress information"""
    try:
        # Example: [download]  45.2% of 156.78MiB at  5.23MiB/s ETA 00:15
        download_match = re.search(
            r'\[download\]\s+(\d+\.?\d*)%\s+of\s+~?([\d.]+)(\w+)\s+at\s+([\d.]+)(\w+)/s\s+ETA\s+(\d+:\d+)',
            line
        )
        
        if download_match:
            percent = float(download_match.group(1))
            total_size = float(download_match.group(2))
            total_unit = download_match.group(3)
            speed = float(download_match.group(4))
            speed_unit = download_match.group(5)
            eta_str = download_match.group(6)
            
            # Convert to bytes
            unit_multipliers = {'B': 1, 'KiB': 1024, 'MiB': 1024**2, 'GiB': 1024**3,
                              'KB': 1000, 'MB': 1000**2, 'GB': 1000**3}
            
            total_bytes = total_size * unit_multipliers.get(total_unit, 1)
            speed_bytes = speed * unit_multipliers.get(speed_unit, 1)
            downloaded_bytes = total_bytes * (percent / 100)
            
            # Parse ETA
            eta_parts = eta_str.split(':')
            eta_seconds = int(eta_parts[0]) * 60 + int(eta_parts[1])
            
            return {
                'type': 'progress',
                'downloadId': download_id,
                'progress': {
                    'percent': percent,
                    'downloaded': downloaded_bytes,
                    'total': total_bytes,
                    'speed': speed_bytes,
                    'eta': eta_seconds
                }
            }
        
        # Check for destination filename
        dest_match = re.search(r'\[(?:download|Merger)\]\s+Destination:\s+(.+)$', line)
        if dest_match:
            return {
                'type': 'progress',
                'downloadId': download_id,
                'progress': {
                    'filename': os.path.basename(dest_match.group(1))
                }
            }
        
        # Check for merging files (indicates near completion)
        if '[Merger]' in line or 'Merging formats' in line:
            return {
                'type': 'progress',
                'downloadId': download_id,
                'progress': {
                    'percent': 99,
                    'status': 'merging'
                }
            }
        
    except Exception as e:
        log(f"Error parsing progress: {e}")
    
    return None

# ===== Command Handlers =====
def handle_test(message: Dict[str, Any]) -> Dict[str, Any]:
    """Test connection and get versions"""
    ytdlp_path = get_ytdlp_path()
    ffmpeg_path = get_ffmpeg_path()
    
    ytdlp_version = get_version(ytdlp_path)
    ffmpeg_version = get_version(ffmpeg_path)
    
    return {
        'id': message.get('id'),
        'success': True,
        'ytdlpVersion': ytdlp_version,
        'ffmpegVersion': ffmpeg_version
    }

def handle_download(message: Dict[str, Any]):
    """Start a download in a background thread"""
    download_id = message.get('downloadId')
    url = message.get('url')
    format_str = message.get('format', 'bestvideo+bestaudio/best')
    output_path = expand_path(message.get('output', '~/Downloads'))
    extension = message.get('extension', 'mp4')
    subtitles = message.get('subtitles', False)
    audio_only = message.get('audioOnly', False)
    audio_quality = message.get('audioQuality')
    title = sanitize_filename(message.get('title', 'video'))
    
    def download_thread():
        try:
            ytdlp_path = get_ytdlp_path()
            ffmpeg_path = get_ffmpeg_path()
            
            # Build output template
            output_template = os.path.join(output_path, f'{title}.%(ext)s')
            
            # Build command
            cmd = [
                ytdlp_path,
                '--ffmpeg-location', os.path.dirname(ffmpeg_path),
                '-f', format_str,
                '-o', output_template,
                '--no-playlist',
                '--no-mtime',
                '--progress',
                '--newline',
            ]
            
            # Add format-specific options
            if audio_only:
                cmd.extend(['-x'])  # Extract audio
                if extension == 'mp3':
                    cmd.extend(['--audio-format', 'mp3'])
                    if audio_quality:
                        cmd.extend(['--audio-quality', audio_quality])
                elif extension == 'm4a':
                    cmd.extend(['--audio-format', 'm4a'])
                elif extension == 'opus':
                    cmd.extend(['--audio-format', 'opus'])
            else:
                # Video options
                if extension == 'mp4':
                    cmd.extend(['--merge-output-format', 'mp4'])
                elif extension == 'mkv':
                    cmd.extend(['--merge-output-format', 'mkv'])
                elif extension == 'webm':
                    cmd.extend(['--merge-output-format', 'webm'])
            
            # Subtitles
            if subtitles:
                cmd.extend([
                    '--write-subs',
                    '--write-auto-subs',
                    '--sub-langs', 'en,en-US',
                    '--embed-subs' if extension in ['mp4', 'mkv'] else '--convert-subs', 'srt'
                ])
            
            # Add URL
            cmd.append(url)
            
            log(f"Running command: {' '.join(cmd)}")
            
            # Start process
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            active_downloads[download_id] = process
            
            final_filename = f'{title}.{extension}'
            
            # Read output line by line
            for line in iter(process.stdout.readline, ''):
                line = line.strip()
                if not line:
                    continue
                
                log(f"yt-dlp output: {line}")
                
                # Check if download was cancelled
                if download_id not in active_downloads:
                    process.terminate()
                    return
                
                # Parse and send progress
                progress = parse_progress_line(line, download_id)
                if progress:
                    if progress['progress'].get('filename'):
                        final_filename = progress['progress']['filename']
                    send_message(progress)
                
                # Check for completion message
                if '[download] 100%' in line or 'has already been downloaded' in line:
                    pass  # Will complete after process ends
            
            # Wait for process to complete
            process.wait()
            
            if download_id in active_downloads:
                del active_downloads[download_id]
            
            if process.returncode == 0:
                send_message({
                    'type': 'complete',
                    'downloadId': download_id,
                    'filename': final_filename
                })
            else:
                send_message({
                    'type': 'error',
                    'downloadId': download_id,
                    'error': 'Download failed. Check yt-dlp logs for details.'
                })
                
        except Exception as e:
            log(f"Download error: {e}")
            if download_id in active_downloads:
                del active_downloads[download_id]
            send_message({
                'type': 'error',
                'downloadId': download_id,
                'error': str(e)
            })
    
    # Start download in background thread
    thread = threading.Thread(target=download_thread, daemon=True)
    thread.start()
    
    # Send immediate acknowledgment
    send_message({
        'id': message.get('id'),
        'success': True,
        'downloadId': download_id
    })

def handle_cancel(message: Dict[str, Any]) -> Dict[str, Any]:
    """Cancel an active download"""
    download_id = message.get('downloadId')
    
    if download_id in active_downloads:
        process = active_downloads[download_id]
        try:
            process.terminate()
            process.wait(timeout=5)
        except Exception:
            process.kill()
        del active_downloads[download_id]
    
    return {
        'id': message.get('id'),
        'success': True
    }

def handle_select_directory(message: Dict[str, Any]) -> Dict[str, Any]:
    """Open directory picker dialog using osascript (macOS)"""
    try:
        script = '''
        tell application "System Events"
            activate
            set theFolder to choose folder with prompt "Select download location"
            return POSIX path of theFolder
        end tell
        '''
        
        result = subprocess.run(
            ['osascript', '-e', script],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0 and result.stdout.strip():
            return {
                'id': message.get('id'),
                'success': True,
                'path': result.stdout.strip()
            }
        else:
            return {
                'id': message.get('id'),
                'success': False,
                'error': 'Folder selection cancelled'
            }
    except Exception as e:
        return {
            'id': message.get('id'),
            'success': False,
            'error': str(e)
        }

def handle_open_folder(message: Dict[str, Any]) -> Dict[str, Any]:
    """Open folder in Finder"""
    path = expand_path(message.get('path', '~/Downloads'))
    try:
        subprocess.run(['open', path], check=True)
        return {
            'id': message.get('id'),
            'success': True
        }
    except Exception as e:
        return {
            'id': message.get('id'),
            'success': False,
            'error': str(e)
        }

# ===== Main Loop =====
def main():
    log("Native host started")
    
    # Handle SIGTERM gracefully
    def signal_handler(signum, frame):
        log("Received signal, shutting down...")
        for download_id, process in active_downloads.items():
            try:
                process.terminate()
            except Exception:
                pass
        sys.exit(0)
    
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        while True:
            message = receive_message()
            if message is None:
                log("No message received, exiting")
                break
            
            action = message.get('action')
            log(f"Handling action: {action}")
            
            if action == 'test':
                response = handle_test(message)
                send_message(response)
            
            elif action == 'download':
                handle_download(message)  # Sends its own response
            
            elif action == 'cancel':
                response = handle_cancel(message)
                send_message(response)
            
            elif action == 'selectDirectory':
                response = handle_select_directory(message)
                send_message(response)
            
            elif action == 'openFolder':
                response = handle_open_folder(message)
                send_message(response)
            
            else:
                send_message({
                    'id': message.get('id'),
                    'error': f'Unknown action: {action}'
                })
                
    except Exception as e:
        log(f"Main loop error: {e}")
    
    log("Native host exiting")

if __name__ == '__main__':
    main()
