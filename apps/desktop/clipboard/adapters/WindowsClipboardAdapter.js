/**
 * Windows-specific clipboard adapter
 * Uses PowerShell for image handling and clipboardy for text
 */

const { execSync } = require('child_process');
const clipboardy = require('clipboardy').default;
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class WindowsClipboardAdapter {
    constructor() {
        this.lastImageHash = '';
    }

    async readText() {
        try {
            return await clipboardy.read();
        } catch (err) {
            console.error("❌ Windows readText error:", err.message);
            throw err;
        }
    }

    async writeText(text) {
        try {
            await clipboardy.write(text);
            console.log("✍️ Windows: Text written to clipboard");
        } catch (err) {
            console.error("❌ Windows writeText error:", err.message);
            throw err;
        }
    }

    async readImage() {
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

                if (result.includes('SUCCESS') && fs.existsSync(tempFile)) {
                    const imageBuffer = fs.readFileSync(tempFile);
                    try { fs.unlinkSync(tempFile); } catch (e) { }
                    return imageBuffer;
                }
            } catch (e) {
                console.log("⚠️ Windows: No image in clipboard");
            }
        } catch (e) {
            console.log("❌ Windows readImage error:", e.message);
        }
        return null;
    }

    async writeImage(buffer) {
        try {
            const tempFile = path.join(os.tmpdir(), `clipboard-image-${Date.now()}.png`);
            fs.writeFileSync(tempFile, buffer);

            const escapedPath = tempFile.replace(/\\/g, '\\\\');
            const script = `
                [Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
                $img = [System.Drawing.Image]::FromFile('${escapedPath}')
                [System.Windows.Forms.Clipboard]::SetImage($img)
                $img.Dispose()
                Remove-Item '${escapedPath}'
            `;

            execSync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
            console.log("🖼️ Windows: Image written to clipboard");
        } catch (err) {
            console.error("❌ Windows writeImage error:", err.message);
            throw err;
        }
    }

    hashImage(buffer) {
        return crypto.createHash('md5').update(buffer).digest('hex');
    }
}

module.exports = WindowsClipboardAdapter;
