// // apps/desktop/core/SyncEngine.js

// const { ClipboardItem } = require("../../../shared/models");

// class SyncEngine {
//   constructor(deviceId) {
//     this.deviceId = deviceId;

//     // stores last N clipboard items
//     this.history = [];

//     // stores clipboard items waiting to be sent
//     this.offlineQueue = [];

//     // paired devices status (deviceId -> online/offline)
//     this.devices = {};

//     this.lastRemoteUpdateTimestamp = 0;

//   }

//   /**
//    * Register or update a device status
//    */
//   updateDeviceStatus(deviceId, isOnline) {
//     this.devices[deviceId] = isOnline;
//   }

//   /**
//    * Called when clipboard changes locally
//    */
//   onLocalClipboardChange(type, content) {
//     const item = new ClipboardItem({
//       id: this.generateId(),
//       type,
//       content,
//       sourceDeviceId: this.deviceId,
//       timestamp: Date.now()
//     });

//     // Save to history
//     this.history.push(item);

//     // Decide what to do
//     this.processClipboardItem(item);
//   }

//   /**
//    * Decide whether to send now or queue
//    */
//   processClipboardItem(item) {
//     const hasOnlineDevices = Object.values(this.devices).some(
//       (status) => status === true
//     );

//     if (hasOnlineDevices) {
//       this.sendToOnlineDevices(item);
//     } else {
//       this.offlineQueue.push(item);
//     }
//   }

//   /**
//    * Placeholder: will be connected to WebRTC later
//    */
//   sendToOnlineDevices(item) {
//     console.log("Sending clipboard item to online devices:", item);
//   }

//   /**
//    * Retry sending queued items
//    */
//   retryOfflineQueue() {
//     if (this.offlineQueue.length === 0) return;

//     const stillOffline = [];

//     this.offlineQueue.forEach((item) => {
//       const hasOnlineDevices = Object.values(this.devices).some(
//         (status) => status === true
//       );

//       if (hasOnlineDevices) {
//         this.sendToOnlineDevices(item);
//       } else {
//         stillOffline.push(item);
//       }
//     });

//     this.offlineQueue = stillOffline;
//   }

//   /**
//    * Simple unique ID generator
//    */
//   generateId() {
//     return (
//       Math.random().toString(36).substring(2) +
//       Date.now().toString(36)
//     );
//   }
//   /**
//    * Called when a clipboard item is received from another device
//    * Conflict handling: Last Write Wins
//   */

//   onRemoteClipboardItem(item) {
//     // 🔒 Mark time of remote update (for echo prevention)
//     this.lastRemoteUpdateTimestamp = item.timestamp;

//     const lastItem = this.history[this.history.length - 1];

//     // Last-write-wins
//     if (!lastItem || item.timestamp > lastItem.timestamp) {
//       this.history.push(item);
//       console.log("📋 Applied remote clipboard:", item.content);
//     }
//   }

// }
// //   onRemoteClipboardItem(item) {
// //     const lastItem = this.history.length > 0 ? this.history[this.history.length - 1] : null;

// //     // If no history, accept immediately
// //     if (!lastItem) {
// //       this.history.push(item);
// //       console.log("Accepted remote clipboard item (no conflict):", item);
// //       return;
// //     }

// //     // Last Write Wins based on timestamp
// //     if (item.timestamp > lastItem.timestamp) {
// //       this.history.push(item);
// //       console.log("Accepted remote clipboard item (newer):", item);
// //     } else {
// //       console.log("Ignored remote clipboard item (older):", item);
// //     }
// //   }


// // }


// module.exports = SyncEngine;





const SignalingClient = require('../network/SignalingClient');
const ClipboardWatcher = require('../clipboard/ClipboardWatcher');
const { DEVICE_LIST, CLIPBOARD_HISTORY } = require('../../../shared/messageTypes');

class SyncEngine {
    constructor(deviceId, onUpdateUI) {
        this.deviceId = deviceId;
        this.onUpdateUI = onUpdateUI;
        
        this.history = [];
        this.offlineQueue = []; // <-- NEW: Store items while offline
        this.devices = [];

        // Initialize Modules
        this.clipboard = new ClipboardWatcher();
        
        // Pass the new 'onHistoryBatch' callback
        this.network = new SignalingClient({
            onClip: (text) => this.handleIncomingClip(text),
            onDeviceUpdate: (count) => this.handleDeviceUpdate(count),
            onHistoryBatch: (items) => this.handleHistoryBatch(items)
        });

        // Listen for when we come back online
        this.network.on('connected', () => {
            console.log("Back online! Flushing queue:", this.offlineQueue.length);
            this.flushOfflineQueue();
        });

        // Listen to Local Clipboard
        this.clipboard.on('change', (text) => {
            this.addToHistory(text);
            
            // Try to send. If false (offline), queue it.
            const sent = this.network.sendClip(text);
            if (!sent) {
                console.log("Offline. Queued item:", text);
                this.offlineQueue.push(text);
            }
        });

        this.clipboard.start();
    }

    connect(pin) {
        // Connect to Port 3000
        this.network.connect('ws://localhost:3000', pin, this.deviceId);
    }

    // --- NEW: Sync Logic ---

    flushOfflineQueue() {
        if (this.offlineQueue.length === 0) return;

        // Send all queued items
        this.offlineQueue.forEach(text => {
            this.network.sendClip(text);
        });
        
        // Clear queue
        this.offlineQueue = [];
    }

    handleHistoryBatch(items) {
        console.log("Received History Batch:", items.length);
        // Add each item to history
        items.forEach(text => {
            this.addToHistory(text);
        });
    }

    // --- Existing Logic ---

    handleIncomingClip(text) {
        this.clipboard.write(text);
        this.addToHistory(text);
    }

    handleDeviceUpdate(count) {
        this.devices = [`${count} Device(s) Connected`];
        this.onUpdateUI(DEVICE_LIST, this.devices); 
    }

    addToHistory(text) {
        // Avoid duplicates at top
        if (this.history[0]?.content === text) return;
        
        this.history.push({ id: Date.now(), content: text });
        if (this.history.length > 50) this.history.shift();
        
        this.onUpdateUI(CLIPBOARD_HISTORY, this.history);
    }

    restore(text) {
        this.clipboard.write(text);
    }
}

module.exports = SyncEngine;

