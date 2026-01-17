// apps/desktop/clipboard/ClipboardWatcher.js

const clipboardy = require("clipboardy");

class ClipboardWatcher {
  constructor(onChange) {
    this.onChange = onChange;
    this.lastText = "";
  }

  start() {
    setInterval(async () => {
      try {
        const text = await clipboardy.default.read();

        if (text && text !== this.lastText) {
          this.lastText = text;
          this.onChange(text);
        }
      } catch (err) {
        console.error("Clipboard read error:", err.message);
      }
    }, 1000); // poll every 1 second
  }
}

module.exports = ClipboardWatcher;
