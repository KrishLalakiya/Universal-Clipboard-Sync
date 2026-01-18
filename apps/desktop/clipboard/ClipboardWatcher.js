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

class ClipboardWatcher extends EventEmitter {
    constructor() {
        super();
        this.lastText = '';
        this.lastHash = '';
        this.interval = null;
        this.clipboardy = null;
        this.isWriting = false;
    }

    async start() {
        if (!this.clipboardy) {
            const module = await import('clipboardy');
            this.clipboardy = module.default;
        }

        console.log("📋 Clipboard Watcher Started...");
        
        this.interval = setInterval(async () => {
            // Skip if we're writing
            if (this.isWriting) return;
            
            try {
                const text = await this.clipboardy.read();
                
                if (text && text !== this.lastText) {
                    console.log("✅ DETECTED CHANGE");
                    this.lastText = text;
                    this.emit('change', text);
                }
            } catch (e) {
                // Silently handle clipboard locked errors
            }
        }, 1000);
    }

    async write(text) {
        if (!this.clipboardy) {
             const module = await import('clipboardy');
             this.clipboardy = module.default;
        }
        
        console.log("✍️ Writing to clipboard:", text.substring(0, 50));
        
        this.isWriting = true;
        this.lastText = text;
        
        try {
            await this.clipboardy.write(text);
        } finally {
            // Wait a bit, then allow monitoring again
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