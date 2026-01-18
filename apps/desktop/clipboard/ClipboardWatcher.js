// // apps/desktop/clipboard/ClipboardWatcher.js

// const clipboardy = require("clipboardy");

// class ClipboardWatcher {
//   constructor(onChange) {
//     this.onChange = onChange;
//     this.lastText = "";
//   }

//   start() {
//     setInterval(async () => {
//       try {
//         const text = await clipboardy.default.read();

//         if (text && text !== this.lastText) {
//           this.lastText = text;
//           this.onChange(text);
//         }
//       } catch (err) {
//         console.error("Clipboard read error:", err.message);
//       }
//     }, 1000); // poll every 1 second
//   }
// }

// module.exports = ClipboardWatcher;



const clipboardy = require('clipboardy').default;
const EventEmitter = require('events');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ClipboardWatcher extends EventEmitter {
    constructor() {
        super();
        this.lastText = '';
        this.lastImageHash = '';
        this.interval = null;
        this.clipboardy = null;
        this.isWriting = false;
    }

    async start() {
        if (!this.clipboardy) {
            const module = await import('clipboardy');
            this.clipboardy = module.default;
        }

        const platform = os.platform();
        console.log("📋 Clipboard Watcher Started on platform:", platform);
        
        this.interval = setInterval(async () => {
            // Skip if we're writing
            if (this.isWriting) return;
            
            try {
                // Try to get image first (only check occasionally to reduce overhead)
                const imageData = await this.getImageFromClipboard();
                if (imageData && imageData.length > 0) {
                    console.log("🖼️ Image detected in clipboard, size:", imageData.length);
                    const hash = this.hashImage(imageData);
                    if (hash !== this.lastImageHash) {
                        this.lastImageHash = hash;
                        console.log("📤 Emitting image change");
                        this.emit('change', { type: 'image', data: imageData });
                    }
                    return; // Don't check text if image is present
                }
                
                // Fall back to text
                const text = await this.clipboardy.read();
                if (text && text !== this.lastText) {
                    console.log("✅ Text change detected:", text.substring(0, 50));
                    this.lastText = text;
                    this.lastImageHash = ''; // Reset image hash
                    console.log("📤 Emitting text change");
                    this.emit('change', { type: 'text', data: text });
                }
            } catch (e) {
                // Silently handle clipboard locked errors
                console.log("Clipboard read error:", e.message);
            }
        }, 1000);
    }

    async getImageFromClipboard() {
        try {
            const platform = os.platform();
            
            if (platform === 'win32') {
                return await this.getImageFromClipboardWindows();
            } else if (platform === 'darwin') {
                return await this.getImageFromClipboardMac();
            } else if (platform === 'linux') {
                return await this.getImageFromClipboardLinux();
            }
            
            return null;
        } catch (e) {
            console.log("❌ Image detection error:", e.message);
            return null;
        }
    }

    async getImageFromClipboardWindows() {
        try {
            const tempFile = path.join(os.tmpdir(), `cb-${Date.now()}.png`);
            const escapedPath = tempFile.replace(/\\/g, '\\\\');
            
            const script = `[System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null; [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($img -ne $null) { $img.Save('${escapedPath}'); Write-Host 'SUCCESS'; $img.Dispose(); }`;
            
            try {
                const result = execSync(`powershell -NoProfile -Command "${script}"`, {
                    encoding: 'utf8',
                    timeout: 5000,
                    stdio: ['pipe', 'pipe', 'pipe']
                }).trim();
                
                console.log("📊 PowerShell result:", result);
                
                if (result.includes('SUCCESS') && fs.existsSync(tempFile)) {
                    console.log("✅ Image file created successfully");
                    const imageBuffer = fs.readFileSync(tempFile);
                    try { fs.unlinkSync(tempFile); } catch (e) { }
                    return imageBuffer;
                } else {
                    console.log("⚠️ PowerShell did not indicate success or file not found");
                }
            } catch (e) {
                console.log("⚠️ PowerShell execution error:", e.message);
            }
        } catch (e) {
            console.log("❌ Image detection exception:", e.message);
        }
        return null;
    }

    async getImageFromClipboardMac() {
        try {
            const result = execSync(`osascript -e 'the clipboard as «class PNGf»' 2>/dev/null | base64 2>/dev/null || echo ""`, {
                encoding: 'utf8',
                timeout: 2000,
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
            
            if (result && result.length > 0) {
                return Buffer.from(result, 'base64');
            }
        } catch (e) {
            // Silent fail
        }
        return null;
    }

    async getImageFromClipboardLinux() {
        try {
            const result = execSync('xclip -selection clipboard -t image/png -o 2>/dev/null', {
                timeout: 2000,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            if (result && result.length > 0) {
                return result;
            }
        } catch (e) {
            // Silent fail
        }
        return null;
    }

    hashImage(buffer) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(buffer).digest('hex');
    }

    async write(content) {
        if (!this.clipboardy) {
             const module = await import('clipboardy');
             this.clipboardy = module.default;
        }
        
        // Check if content is an image buffer
        if (Buffer.isBuffer(content)) {
            console.log("🖼️ Writing image to clipboard");
            this.isWriting = true;
            try {
                const platform = os.platform();
                
                if (platform === 'win32') {
                    // Save to temp file and use PowerShell
                    const tempFile = path.join(os.tmpdir(), `clipboard-image-${Date.now()}.png`);
                    fs.writeFileSync(tempFile, content);
                    
                    const script = `
                        [Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
                        $img = [System.Drawing.Image]::FromFile('${tempFile}')
                        [System.Windows.Forms.Clipboard]::SetImage($img)
                        Remove-Item '${tempFile}'
                    `;
                    
                    execSync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
                } else if (platform === 'darwin') {
                    const tempFile = path.join(os.tmpdir(), `clipboard-image-${Date.now()}.png`);
                    fs.writeFileSync(tempFile, content);
                    execSync(`osascript -e "set the clipboard to (read (POSIX file \\"${tempFile}\\") as PNG)"`, { stdio: 'ignore' });
                    fs.unlinkSync(tempFile);
                } else if (platform === 'linux') {
                    const tempFile = path.join(os.tmpdir(), `clipboard-image-${Date.now()}.png`);
                    fs.writeFileSync(tempFile, content);
                    execSync(`xclip -selection clipboard -t image/png -i < "${tempFile}"`, { stdio: 'ignore' });
                    fs.unlinkSync(tempFile);
                }
            } finally {
                setTimeout(() => {
                    this.isWriting = false;
                }, 100);
            }
            return;
        }
        
        // Text content
        console.log("✍️ Writing to clipboard:", content.substring(0, 50));
        this.isWriting = true;
        this.lastText = content;
        this.lastImageHash = '';
        
        try {
            await this.clipboardy.write(content);
        } finally {
            setTimeout(() => {
                this.isWriting = false;
            }, 100);
        }
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

module.exports = ClipboardWatcher;