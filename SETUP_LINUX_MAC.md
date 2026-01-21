# 🚀 Setup Guide for Linux & macOS

## Prerequisites for All Platforms

```bash
# Node.js 16+ and npm 7+
node --version   # Should be v16.0.0 or higher
npm --version    # Should be v7.0.0 or higher
```

## Windows Setup

### Quick Start
```bash
npm install
npm start
```

### Build Installer
```bash
npm run build:win
# Creates installer in dist/ folder
```

**System Requirements:**
- Windows 10 or later
- No additional dependencies required

---

## macOS Setup

### Step 1: Install Dependencies
```bash
# Using Homebrew (if you don't have it, see https://brew.sh)
brew install node

# Verify installation
node --version
npm --version
```

### Step 2: Clone & Install
```bash
cd Universal-Clipboard-Sync
npm install
```

### Step 3: Grant Permissions
The app needs accessibility permissions for clipboard access:
1. Open **System Preferences** → **Security & Privacy** → **Accessibility**
2. Add Terminal (or your IDE) to the allowed apps list
3. Run the app

### Step 4: Run App
```bash
npm start
```

### Step 5: Build DMG/ZIP
```bash
npm run build:mac
# Creates .dmg installer in dist/ folder
```

### System Requirements
- macOS 10.13 or later
- Apple Silicon (M1/M2) and Intel Macs supported
- Accessibility permissions enabled

### Troubleshooting macOS
**Issue**: "AppleScript error" when accessing clipboard
```bash
# Grant accessibility permissions to Terminal/IDE
# System Preferences → Security & Privacy → Accessibility
```

**Issue**: "App cannot be opened" on first launch
```bash
# Unblock downloaded app
sudo xattr -d com.apple.quarantine "/Applications/Universal Clipboard Sync.app"
```

---

## Linux Setup

### Step 1: Install System Dependencies

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y nodejs npm xclip
```

**Fedora/RHEL:**
```bash
sudo dnf install -y nodejs npm xclip
```

**Arch:**
```bash
sudo pacman -S nodejs npm xclip
```

### Step 2: Verify Installation
```bash
node --version    # Should be v16+
npm --version     # Should be v7+
xclip --version   # Clipboard support
```

### Step 3: Clone & Install
```bash
cd Universal-Clipboard-Sync
npm install
```

### Step 4: Run App
```bash
npm start
```

### Step 5: Build AppImage/DEB
```bash
# Build AppImage (works on any Linux distro)
npm run build:linux

# Or build DEB package (Debian/Ubuntu)
npm run build:linux
# Creates .deb and .AppImage in dist/ folder
```

### Step 6: Install from DEB (Optional)
```bash
sudo dpkg -i dist/*.deb
# Then run from applications menu or:
universal-clipboard-sync
```

### System Requirements
- Ubuntu 18.04+, Debian 10+, Fedora 33+, or equivalent
- X11 or Wayland display server
- `xclip` for clipboard image support
- 200MB disk space

### Troubleshooting Linux

**Issue**: "xclip not found"
```bash
# Install xclip
sudo apt-get install xclip  # Ubuntu/Debian
sudo dnf install xclip      # Fedora
sudo pacman -S xclip        # Arch
```

**Issue**: "Cannot connect to X server"
- Make sure X11/Wayland is running
- Check `$DISPLAY` variable: `echo $DISPLAY`
- If using SSH, enable X11 forwarding: `ssh -X user@host`

**Issue**: AppImage won't execute
```bash
# Make it executable
chmod +x dist/*.AppImage
./dist/*.AppImage
```

**Issue**: "No protocol specified" when running with sudo
```bash
# Run WITHOUT sudo - the app doesn't need elevated privileges
npm start
```

---

## Cross-Platform Network Setup

### 1. Start Signaling Server (All Platforms)
```bash
cd signaling-server
npm install
npm start
# Server runs on ws://localhost:3000
```

### 2. Configure Connection
- Note your device's IP address:
  - **Windows**: `ipconfig` (look for IPv4)
  - **macOS**: `ifconfig | grep inet` (not 127.0.0.1)
  - **Linux**: `hostname -I`

### 3. Connect Devices
1. Open app on device A
2. Open app on device B
3. Get PIN from device A's QR code
4. Enter PIN on device B
5. Clipboard syncs automatically

---

## Verification Checklist

- [ ] Node.js and npm installed
- [ ] Git repository cloned
- [ ] `npm install` completed successfully
- [ ] `npm start` launches app without errors
- [ ] Clipboard can be read/written locally
- [ ] (Linux only) `xclip` is installed for images
- [ ] Signaling server can start: `cd signaling-server && npm start`

---

## Common Issues Across All Platforms

### npm install fails
```bash
# Clear npm cache and retry
npm cache clean --force
npm install
```

### "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Port 3000 already in use
```bash
# Change signaling server port in SignalingClient.js
# Default: ws://localhost:3000
```

### Clipboard not syncing
1. Check signaling server is running
2. Verify network connectivity between devices
3. Check browser console for errors: Ctrl+Shift+I
4. Review logs in terminal

---

## Development

### Debug Mode
```bash
# Enable verbose logging
npm run dev
```

### Testing Clipboard
- **Windows**: Copy text/image → paste should work instantly
- **macOS**: Use `pbpaste` and `pbcopy` commands to test
- **Linux**: Use `xclip -selection clipboard -o` to test

### View Logs
```bash
# Terminal output shows all clipboard operations
# Look for 📋, 📤, 🔙 emoji indicators
```

---

## Next Steps

1. **Build for distribution**: `npm run build`
2. **Set up auto-updates**: See PLATFORM_SUPPORT.md
3. **Code signing**: Implement certificates for professional distribution
4. **Electron Updater**: Add auto-update support

---

## Getting Help

- Check PLATFORM_SUPPORT.md for platform-specific details
- Review FIXES_DOCUMENTATION.md for known issues
- Check GitHub issues: https://github.com/KrishLalakiya/Universal-Clipboard-Sync
