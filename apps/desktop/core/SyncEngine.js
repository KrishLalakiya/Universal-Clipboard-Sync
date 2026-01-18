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
const NetworkMonitor = require('../network/NetworkMonitor');
const { DEVICE_LIST, CLIPBOARD_HISTORY } = require('../../../shared/messageTypes');
const fs = require('fs');
const path = require('path');
const os = require('os');

class SyncEngine {
    constructor(deviceId, onUpdateUI) {
        this.deviceId = deviceId;
        this.onUpdateUI = onUpdateUI;
        
        this.history = [];
        this.offlineQueue = [];
        this.devices = [];
        this.isReceivingRemote = false;
        this.isOnline = false;
        this.isConnecting = false;

        // Offline queue storage path
        this.queueStoragePath = path.join(os.tmpdir(), `clipboard-queue-${deviceId}.json`);
        this.historyStoragePath = path.join(os.tmpdir(), `clipboard-history-${deviceId}.json`);
        
        this.clipboard = new ClipboardWatcher();
        this.networkMonitor = new NetworkMonitor(5000); // Check every 5 seconds
        
        this.network = new SignalingClient({
            onClip: (text) => this.handleIncomingClip(text),
            onDeviceUpdate: (count) => this.handleDeviceUpdate(count),
            onHistoryBatch: (items) => this.handleHistoryBatch(items)
        });

        // Network monitor events
        this.networkMonitor.on('online', () => {
            console.log("🌐 System is online - attempting to reconnect");
            if (!this.isOnline && !this.isConnecting) {
                this.flushOfflineQueue();
            }
        });

        this.networkMonitor.on('offline', () => {
            console.log("🌐 System is offline");
            this.isOnline = false;
        });

        // Load persisted data
        this.loadPersistedData();

        this.network.on('connected', () => {
            this.isOnline = true;
            this.isConnecting = false;
            console.log("🟢 ONLINE - Flushing offline queue");
            this.flushOfflineQueue();
        });

        this.network.on('disconnected', () => {
            this.isOnline = false;
            this.isConnecting = false;
            console.log("🔴 OFFLINE - Queuing clipboard items");
        });

        this.clipboard.on('change', (content) => {
            // Prevent echo from remote writes
            if (this.isReceivingRemote) {
                this.isReceivingRemote = false;
                return;
            }

            // Handle both text and image
            if (content.type === 'image') {
                console.log("🖼️ Image detected, sending...");
                // Convert buffer to base64 for transmission
                const base64Image = content.data.toString('base64');
                this.addToHistory({ type: 'image', data: base64Image });
                
                const sent = this.network.sendClip({ type: 'image', data: base64Image });
                if (!sent) {
                    console.log("⏳ Offline - Queuing image");
                    this.offlineQueue.push({ type: 'image', data: base64Image });
                    this.persistQueue();
                }
            } else {
                console.log("📋 Local Copy Detected:", content.data);
                this.addToHistory(content.data);
                
                const sent = this.network.sendClip(content.data);
                if (!sent) {
                    console.log("⏳ Offline - Queuing item");
                    this.offlineQueue.push(content.data);
                    this.persistQueue();
                }
            }
        });

        this.clipboard.start();
        this.networkMonitor.start();
    }

    connect(pin) {
        if (this.isConnecting) return;
        this.isConnecting = true;
        console.log("🔗 Attempting to connect with PIN:", pin);
        this.network.connect('ws://localhost:3000', pin, this.deviceId);
    }

    loadPersistedData() {
        try {
            // Load offline queue
            if (fs.existsSync(this.queueStoragePath)) {
                const data = fs.readFileSync(this.queueStoragePath, 'utf8');
                this.offlineQueue = JSON.parse(data);
                console.log(`✅ Loaded ${this.offlineQueue.length} queued items`);
            }
            
            // Load history
            if (fs.existsSync(this.historyStoragePath)) {
                const data = fs.readFileSync(this.historyStoragePath, 'utf8');
                this.history = JSON.parse(data);
                console.log(`✅ Loaded ${this.history.length} history items`);
                // CRITICAL: Immediately send to UI
                this.onUpdateUI('CLIPBOARD_HISTORY', this.history);
                console.log("📤 Sent loaded history to UI");
            } else {
                console.log("ℹ️ No persisted history found, starting fresh");
                // Still send empty array to initialize UI
                this.onUpdateUI('CLIPBOARD_HISTORY', []);
            }
        } catch (e) {
            console.error("❌ Error loading persisted data:", e);
            this.onUpdateUI('CLIPBOARD_HISTORY', []);
        }
    }

    persistQueue() {
        try {
            fs.writeFileSync(this.queueStoragePath, JSON.stringify(this.offlineQueue));
        } catch (e) {
            console.error("Error saving queue:", e);
        }
    }

    persistHistory() {
        try {
            fs.writeFileSync(this.historyStoragePath, JSON.stringify(this.history));
        } catch (e) {
            console.error("Error saving history:", e);
        }
    }

    flushOfflineQueue() {
        if (this.offlineQueue.length === 0) return;
        
        console.log(`📤 Flushing ${this.offlineQueue.length} queued items...`);
        const failed = [];
        
        this.offlineQueue.forEach(text => {
            const sent = this.network.sendClip(text);
            if (!sent) failed.push(text);
        });
        
        this.offlineQueue = failed;
        this.persistQueue();
        
        if (failed.length === 0) {
            console.log("✅ All queued items sent");
        } else {
            console.log(`⚠️ ${failed.length} items still queued`);
        }
    }

    handleHistoryBatch(items) {
        console.log("📚 Batch Received:", items.length);
        items.forEach(text => {
            // Avoid duplicates
            if (!this.history.some(h => h.content === text)) {
                this.addToHistory(text);
            }
        });
    }

    handleIncomingClip(content) {
        console.log("🔄 Remote Clip Received:", typeof content === 'object' ? content.type : content.substring(0, 50));
        
        // Handle image or text
        let contentToCheck = typeof content === 'object' && content.type === 'image' ? content.data : content;
        
        // Prevent duplicate echo
        if (this.history.length > 0 && this.history[0].content === contentToCheck) {
            console.log("⏭️ Echo prevented");
            return;
        }

        this.isReceivingRemote = true;
        
        if (typeof content === 'object' && content.type === 'image') {
            // Restore image from base64
            const imageBuffer = Buffer.from(content.data, 'base64');
            this.clipboard.write(imageBuffer).then(() => {
                this.addToHistory(content);
                this.onUpdateUI('CLIPBOARD_HISTORY', this.history);
                this.onUpdateUI(DEVICE_LIST, this.devices);
                setTimeout(() => { this.isReceivingRemote = false; }, 500);
            }).catch(e => {
                console.error("Error writing image to clipboard:", e);
                this.isReceivingRemote = false;
            });
        } else {
            // Text
            this.clipboard.write(content).then(() => {
                this.addToHistory(content);
                this.onUpdateUI('CLIPBOARD_HISTORY', this.history);
                this.onUpdateUI(DEVICE_LIST, this.devices);
                setTimeout(() => { this.isReceivingRemote = false; }, 500);
            }).catch(e => {
                console.error("Error writing to clipboard:", e);
                this.isReceivingRemote = false;
            });
        }
    }

    handleDeviceUpdate(count) {
        this.devices = [`${count} Device(s) Connected`];
        console.log(`📱 Device count: ${count}`);
        this.onUpdateUI(DEVICE_LIST, this.devices);
        
        // Whenever device count changes, resend history to keep UI in sync
        this.onUpdateUI('CLIPBOARD_HISTORY', this.history);
    }

    addToHistory(content) {
        let item;
        
        // Handle both image and text
        if (typeof content === 'object' && content.type === 'image') {
            // Image item
            item = {
                id: Date.now(),
                type: 'image',
                content: content.data, // base64 or buffer
                timestamp: new Date().toISOString()
            };
            
            // Skip if identical to last item
            if (this.history.length > 0 && this.history[0].type === 'image' && this.history[0].content === content.data) {
                console.log("⏭️ Skipped duplicate image");
                return;
            }
        } else {
            // Text item
            const text = typeof content === 'object' ? content.data : content;
            item = {
                id: Date.now(),
                content: text,
                timestamp: new Date().toISOString()
            };
            
            // Skip if identical to last item
            if (this.history.length > 0 && !this.history[0].type && this.history[0].content === text) {
                console.log("⏭️ Skipped duplicate text");
                return;
            }
        }
        
        this.history.unshift(item);
        
        // Keep only last 50 items
        if (this.history.length > 50) {
            this.history.pop();
        }
        
        // Update UI and persist - IMMEDIATELY
        console.log(`📝 Added to history (${this.history.length} total) - Updating UI NOW`);
        this.onUpdateUI('CLIPBOARD_HISTORY', this.history);
        this.persistHistory();
        
        // Also force a device update to keep things in sync
        this.onUpdateUI(DEVICE_LIST, this.devices);
    }

    restore(content) {
        console.log("🔙 Restoring:", typeof content === 'object' ? content.type : typeof content === 'string' ? content.substring(0, 50) : 'unknown');
        this.isReceivingRemote = true;
        
        if (typeof content === 'object' && content.type === 'image') {
            // Restore image - content.content holds the base64 data
            const base64Data = content.content || content.data;
            if (!base64Data) {
                console.error("❌ Image has no data to restore");
                this.isReceivingRemote = false;
                return;
            }
            
            const imageBuffer = Buffer.from(base64Data, 'base64');
            this.clipboard.write(imageBuffer).then(() => {
                setTimeout(() => { this.isReceivingRemote = false; }, 300);
            }).catch(e => {
                console.error("Error restoring image:", e);
                this.isReceivingRemote = false;
            });
        } else {
            // Restore text
            const textToRestore = typeof content === 'object' ? content.content : content;
            this.clipboard.write(textToRestore).then(() => {
                setTimeout(() => { this.isReceivingRemote = false; }, 300);
            }).catch(e => {
                console.error("Error restoring:", e);
                this.isReceivingRemote = false;
            });
        }
    }

    clearHistory() {
        console.log("🗑️ Clearing all history");
        this.history = [];
        this.onUpdateUI('CLIPBOARD_HISTORY', this.history);
        this.persistHistory();
        
        // Send clear history message to server
        if (this.network && this.network.sendMessage) {
            this.network.sendMessage(JSON.stringify({
                type: 'CLEAR_HISTORY'
            }));
        }
    }
}

module.exports = SyncEngine;

