/**
 * Linux-specific clipboard adapter
 * Uses xclip for clipboard access
 */

const { execSync } = require('child_process');
const clipboardy = require('clipboardy').default;
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class LinuxClipboardAdapter {
    constructor() {
        this.lastImageHash = '';
        this.verifyTools();
    }

    verifyTools() {
        try {
            // Check if xclip is available
            execSync('which xclip', { stdio: 'ignore' });
            console.log("✅ Linux: xclip is installed");
        } catch (e) {
            console.warn("⚠️ Linux: xclip not found. Image clipboard may not work.");
            console.warn("   Install with: sudo apt-get install xclip");
        }
    }

    async readText() {
        try {
            return await clipboardy.read();
        } catch (err) {
            console.error("❌ Linux readText error:", err.message);
            throw err;
        }
    }

    async writeText(text) {
        try {
            await clipboardy.write(text);
            console.log("✍️ Linux: Text written to clipboard");
        } catch (err) {
            console.error("❌ Linux writeText error:", err.message);
            throw err;
        }
    }

    async readImage() {
        try {
            const result = execSync('xclip -selection clipboard -t image/png -o 2>/dev/null', {
                timeout: 2000,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            if (result && result.length > 0) {
                console.log("🖼️ Linux: Image read from clipboard");
                return result;
            }
        } catch (e) {
            console.log("⚠️ Linux: No image in clipboard");
        }
        return null;
    }

    async writeImage(buffer) {
        try {
            const tempFile = path.join(os.tmpdir(), `clipboard-image-${Date.now()}.png`);
            fs.writeFileSync(tempFile, buffer);

            execSync(`xclip -selection clipboard -t image/png -i < "${tempFile}"`, { stdio: 'ignore' });
            fs.unlinkSync(tempFile);

            console.log("🖼️ Linux: Image written to clipboard");
        } catch (err) {
            console.error("❌ Linux writeImage error:", err.message);
            throw err;
        }
    }

    hashImage(buffer) {
        return crypto.createHash('md5').update(buffer).digest('hex');
    }
}

module.exports = LinuxClipboardAdapter;
