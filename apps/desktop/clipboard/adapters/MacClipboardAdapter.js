/**
 * macOS-specific clipboard adapter
 * Uses osascript and pbpaste/pbcopy commands
 */

const { execSync } = require('child_process');
const clipboardy = require('clipboardy').default;
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class MacClipboardAdapter {
    constructor() {
        this.lastImageHash = '';
    }

    async readText() {
        try {
            return await clipboardy.read();
        } catch (err) {
            console.error("❌ Mac readText error:", err.message);
            throw err;
        }
    }

    async writeText(text) {
        try {
            await clipboardy.write(text);
            console.log("✍️ Mac: Text written to clipboard");
        } catch (err) {
            console.error("❌ Mac writeText error:", err.message);
            throw err;
        }
    }

    async readImage() {
        try {
            // Check if clipboard contains image using osascript
            const result = execSync(`osascript -e 'the clipboard as «class PNGf»' 2>/dev/null | base64 2>/dev/null || echo ""`, {
                encoding: 'utf8',
                timeout: 2000,
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();

            if (result && result.length > 0) {
                const buffer = Buffer.from(result, 'base64');
                console.log("🖼️ Mac: Image read from clipboard");
                return buffer;
            }
        } catch (e) {
            console.log("⚠️ Mac: No image in clipboard");
        }
        return null;
    }

    async writeImage(buffer) {
        try {
            const tempFile = path.join(os.tmpdir(), `clipboard-image-${Date.now()}.png`);
            fs.writeFileSync(tempFile, buffer);

            execSync(`osascript -e "set the clipboard to (read (POSIX file \\"${tempFile}\\") as PNG)"`, { stdio: 'ignore' });
            fs.unlinkSync(tempFile);

            console.log("🖼️ Mac: Image written to clipboard");
        } catch (err) {
            console.error("❌ Mac writeImage error:", err.message);
            throw err;
        }
    }

    hashImage(buffer) {
        return crypto.createHash('md5').update(buffer).digest('hex');
    }
}

module.exports = MacClipboardAdapter;
