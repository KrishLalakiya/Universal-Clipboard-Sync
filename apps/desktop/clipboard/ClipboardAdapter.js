/**
 * Platform-agnostic clipboard adapter
 * Automatically detects OS and uses appropriate implementation
 */

const os = require('os');
const WindowsClipboardAdapter = require('./adapters/WindowsClipboardAdapter');
const MacClipboardAdapter = require('./adapters/MacClipboardAdapter');
const LinuxClipboardAdapter = require('./adapters/LinuxClipboardAdapter');

class ClipboardAdapter {
    constructor() {
        const platform = os.platform();
        console.log(`🔧 Initializing clipboard adapter for: ${platform}`);

        switch (platform) {
            case 'win32':
                this.adapter = new WindowsClipboardAdapter();
                break;
            case 'darwin':
                this.adapter = new MacClipboardAdapter();
                break;
            case 'linux':
                this.adapter = new LinuxClipboardAdapter();
                break;
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    /**
     * Get current clipboard text
     */
    async readText() {
        return this.adapter.readText();
    }

    /**
     * Write text to clipboard
     */
    async writeText(text) {
        return this.adapter.writeText(text);
    }

    /**
     * Get image from clipboard
     */
    async readImage() {
        return this.adapter.readImage();
    }

    /**
     * Write image to clipboard
     */
    async writeImage(buffer) {
        return this.adapter.writeImage(buffer);
    }
}

module.exports = ClipboardAdapter;
