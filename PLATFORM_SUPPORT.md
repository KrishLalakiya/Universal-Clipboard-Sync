# 🖥️ Cross-Platform Support

## Status: ✅ Fully Implemented

Universal Clipboard Sync now supports **Windows**, **macOS**, and **Linux**.

## Platform Support Details

### Windows (win32)
- ✅ Text clipboard access via `clipboardy`
- ✅ Image clipboard via PowerShell (`System.Windows.Forms.Clipboard`)
- ✅ Tested on Windows 10/11
- **Build**: `npm run build:win`

### macOS (darwin)
- ✅ Text clipboard access via `clipboardy`
- ✅ Image clipboard via `osascript` (AppleScript)
- ✅ Native app signing supported
- ✅ DMG and ZIP distribution
- **Build**: `npm run build:mac`
- **Requirements**: macOS 10.13+

### Linux (linux)
- ✅ Text clipboard access via `clipboardy`
- ✅ Image clipboard via `xclip`
- ✅ AppImage and DEB package support
- ✅ Automatic dependency detection
- **Build**: `npm run build:linux`
- **Requirements**: 
  - `xclip` for image support: `sudo apt-get install xclip`
  - X11 or Wayland display server

## Architecture

### Platform Abstraction Layer
Located in `apps/desktop/clipboard/`:

```
ClipboardWatcher.js (main interface)
├── ClipboardAdapter.js (platform router)
└── adapters/
    ├── WindowsClipboardAdapter.js
    ├── MacClipboardAdapter.js
    └── LinuxClipboardAdapter.js
```

Each adapter implements:
- `readText()` - Get text from clipboard
- `writeText(text)` - Set text to clipboard
- `readImage()` - Get image from clipboard (binary)
- `writeImage(buffer)` - Set image to clipboard

### Automatic Platform Detection
```javascript
const platform = os.platform();
// 'win32' for Windows
// 'darwin' for macOS
// 'linux' for Linux
```

## Build Instructions

### Prerequisites
```bash
npm install
```

### Build for Current Platform
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

### Build All Platforms (cross-compile)
```bash
npm run build
```

### Development
```bash
npm start          # Run with electron
npm run dev        # Development mode
```

## Clipboard Features by Platform

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Text Read/Write | ✅ | ✅ | ✅ |
| Image Read/Write | ✅ | ✅ | ✅* |
| History Persistence | ✅ | ✅ | ✅ |
| Offline Queueing | ✅ | ✅ | ✅ |
| P2P WebRTC | ✅ | ✅ | ✅ |

*Linux requires `xclip` for image support

## Platform-Specific Technical Details

### Windows
- Uses PowerShell for image access (`System.Windows.Forms.Clipboard`)
- Temporary files stored in system temp directory
- MD5 hashing for image change detection
- Handles clipboard lock scenarios gracefully

### macOS
- Uses AppleScript via `osascript` for image access
- Base64 encoding for image transmission
- Native Electron app signing support
- Gatekeeper assessment disabled in build config

### Linux
- Uses `xclip` for all clipboard operations
- No GUI toolkit dependencies required
- Works on both X11 and Wayland
- Automatic tool verification on startup

## Known Limitations

1. **Linux Image Support**: Requires `xclip` system package
   - Solution: Pre-install via package manager or document in setup

2. **Image Format**: All images normalized to PNG
   - Binary transfer with base64 encoding
   - Preserves transparency and quality

3. **Clipboard Size**: Large clipboard items (>100MB) may experience delays
   - Mitigation: Implement chunking for very large files in future

## Testing Cross-Platform

### Windows Development
```bash
npm start
# Test manual clipboard changes
# Test with signaling server running
```

### macOS Development
```bash
npm start
# Verify AppleScript execution
# Test both text and image workflows
```

### Linux Development
```bash
# Ensure xclip is installed
sudo apt-get install xclip

npm start
# Test text and image clipboard operations
```

## Troubleshooting

### Linux: Image clipboard not working
**Problem**: "xclip not found"
**Solution**: 
```bash
sudo apt-get install xclip
```

### Mac: AppleScript errors
**Problem**: Permission denied on clipboard access
**Solution**: Grant accessibility permissions in System Preferences

### Windows: PowerShell execution policy
**Problem**: Scripts blocked by execution policy
**Solution**: The app uses `-NoProfile -Command` which bypasses policy

## Distribution

### Windows
- NSIS installer (`.exe`)
- Portable executable (`portable.exe`)

### macOS
- DMG image (`.dmg`)
- ZIP archive (`.zip`)

### Linux
- AppImage (`.AppImage`)
- DEB package (`.deb`)
- RPM package support can be added

## Future Enhancements

1. Code signing for all platforms
2. Auto-update support via electron-updater
3. Wayland-specific optimizations for Linux
4. ARM64 support (Apple Silicon, Linux ARM)
5. File clipboard support (not just text/image)
6. Clipboard sync history cloud backup

## Environment Variables

```bash
DEVICE_ID=MyDevice npm start    # Custom device identifier
```
