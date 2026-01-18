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



// apps/desktop/clipboard/ClipboardWatcher.js
const clipboardy = require('clipboardy').default;
const EventEmitter = require('events');

class ClipboardWatcher extends EventEmitter {
    constructor() {
        super();
        this.lastText = '';
        this.interval = null;
        this.clipboardy = null; // We will load it dynamically
    }

    async start() {
        // Dynamic import to handle ES Module version of clipboardy
        if (!this.clipboardy) {
            const module = await import('clipboardy');
            this.clipboardy = module.default;
        }

        console.log("Clipboard Watcher Started...");
        
        this.interval = setInterval(async () => {
            try {
                // Use the loaded instance
                const text = await this.clipboardy.read();
                
                if (text && text !== this.lastText) {
                    console.log("DETECTED CHANGE:", text);
                    this.lastText = text;
                    this.emit('change', text);
                }
            } catch (e) {
                // Suppress errors if clipboard is locked or empty
                // console.error("Clipboard Error:", e); 
            }
        }, 1000);
    }

    async write(text) {
        if (!this.clipboardy) {
             const module = await import('clipboardy');
             this.clipboardy = module.default;
        }
        
        this.lastText = text; // Update local tracker to avoid loop
        await this.clipboardy.write(text);
    }
}

module.exports = ClipboardWatcher;