// const SignalingClient = require("./network/SignalingClient");
// const WebRTCManager = require("./network/WebRTCManager");
// const SyncEngine = require("./core/SyncEngine");
// const ClipboardWatcher = require("./clipboard/ClipboardWatcher");
// const os = require("os");

// const CLIPBOARD_HISTORY_LIMIT = 20;
// let clipboardHistory = [];
// let deviceStatusMap = {};

// const DEVICE_ID =
//   process.env.DEVICE_ID ||
//   process.argv[2] ||
//   os.hostname();

// console.log("Desktop app started for device:", DEVICE_ID);

// /* =========================
//    DEVICE STATUS
// ========================= */
// function updateDeviceStatus(deviceId, status) {
//   deviceStatusMap[deviceId] = {
//     status,
//     lastSeen: Date.now()
//   };

//   if (process.send) {
//     process.send({
//       type: "DEVICE_STATUS",
//       devices: deviceStatusMap
//     });
//   }
// }

// /* =========================
//    CLIPBOARD HISTORY
// ========================= */
// function addToHistory(item) {
//   if (
//     clipboardHistory.length > 0 &&
//     clipboardHistory[clipboardHistory.length - 1].content === item.content
//   ) {
//     return;
//   }

//   clipboardHistory.push(item);

//   if (clipboardHistory.length > CLIPBOARD_HISTORY_LIMIT) {
//     clipboardHistory.shift();
//   }

//   if (process.send) {
//     process.send({
//       type: "CLIPBOARD_HISTORY",
//       history: clipboardHistory
//     });
//   }
// }

// /* =========================
//    STATE
// ========================= */
// const peers = new Map();
// const syncEngine = new SyncEngine(DEVICE_ID);

// /* =========================
//    SIGNALING
// ========================= */
// const signalingClient = new SignalingClient({
//   deviceId: DEVICE_ID,
//   serverUrl: "ws://localhost:8080",

//   onSignal: ({ from, payload }) => {
//     const peer = peers.get(from);
//     if (peer) {
//       peer.handleSignal(from, payload);
//     }
//   },

//   onDeviceList: (devices) => {
//     console.log("📡 Online devices:", devices);

//     if (process.send) {
//       process.send({ type: "DEVICE_LIST", devices });
//     }

//     const online = new Set(devices);

//     // 🔴 OFFLINE
//     for (const [deviceId, peer] of peers) {
//       if (!online.has(deviceId)) {
//         updateDeviceStatus(deviceId, "offline");

//         try {
//           peer.dataChannel?.close();
//           peer.peerConnection?.close();
//         } catch (_) { }

//         peers.delete(deviceId);
//       }
//     }

//     // 🟡 CONNECTING
//     devices.forEach((deviceId) => {
//       if (deviceId === DEVICE_ID) return;
//       if (peers.has(deviceId)) return;

//       updateDeviceStatus(deviceId, "connecting");

//       const peer = new WebRTCManager({
//         deviceId: DEVICE_ID,
//         signalingClient
//       });

//       peer.onMessage = (message) => {
//         const data = JSON.parse(message);

//         if (data.type === "CLIPBOARD_ITEM") {
//           syncEngine.onRemoteClipboardItem(data.payload);

//           addToHistory({
//             content: data.payload.content,
//             source: data.payload.sourceDeviceId,
//             timestamp: Date.now()
//           });
//         }
//       };

//       // 🟢 ONLINE
//       process.on("message", (msg) => {
//   if (msg.type === "PEER_ONLINE") {
//     updateDeviceStatus(msg.deviceId, "online");
//   }
// });




//       peers.set(deviceId, peer);

//       if (DEVICE_ID < deviceId) {
//         setTimeout(() => {
//           peer.createPeerConnection(deviceId);
//         }, 1000);
//       }
//     });
//   }
// });

// /* =========================
//    SYNC ENGINE → WEBRTC
// ========================= */
// syncEngine.sendToOnlineDevices = (item) => {
//   if (item.sourceDeviceId !== DEVICE_ID) return;

//   for (const peer of peers.values()) {
//     if (peer.dataChannel?.readyState === "open") {
//       peer.sendMessage(
//         JSON.stringify({
//           type: "CLIPBOARD_ITEM",
//           payload: item
//         })
//       );
//     }
//   }
// };

// /* =========================
//    CLIPBOARD WATCHER
// ========================= */
// const clipboardWatcher = new ClipboardWatcher((text) => {
//   if (Date.now() - syncEngine.lastRemoteUpdateTimestamp < 500) return;

//   syncEngine.onLocalClipboardChange("text", text);

//   addToHistory({
//     content: text,
//     source: DEVICE_ID,
//     timestamp: Date.now()
//   });
// });

// clipboardWatcher.start();

// /* =========================
//    CONNECT
// ========================= */
// signalingClient.connect();





// apps/desktop/main.js
const path = require('path');
const SyncEngine = require('./core/SyncEngine');

// Ensure we import the exact strings from the shared file
const { 
    CMD_CONNECT, 
    CMD_RESTORE, 
    CLIPBOARD_HISTORY, 
    DEVICE_LIST,
    CLEAR_HISTORY
} = require('../../shared/messageTypes');

const DEVICE_ID = process.env.DEVICE_ID || 'Desktop-Client';

// Helper to send messages back to parent Electron process
const sendToParent = (type, payload) => {
    if (process.send) {
        process.send({ type, ...payload });
    }
};

// Initialize Engine
const engine = new SyncEngine(DEVICE_ID, (type, data) => {
    // Explicitly handle each type to ensure data keys are correct
    if (type === CLIPBOARD_HISTORY) {
        sendToParent(type, { history: data });
    } 
    else if (type === DEVICE_LIST) {
        sendToParent(type, { devices: data });
    }
});

// Listen for commands from Electron Parent
process.on('message', (msg) => {
    if (!msg || !msg.type) return;

    console.log("🔧 Child received message type:", msg.type);

    switch (msg.type) {
        case CMD_CONNECT:
            console.log("🔗 Received CMD_CONNECT:", msg.pin);
            engine.connect(msg.pin);
            break;
        case 'RESTORE_CLIPBOARD': 
            console.log("🔙 Restoring:", msg.content);
            engine.restore(msg.content);
            break;
        case CLEAR_HISTORY:
            console.log("🗑️ Clearing all history");
            engine.clearHistory();
            break;
        case 'REQUEST_STATE':
            // Send current state EVERY TIME (for continuous sync)
            console.log("📤 [REQUEST_STATE] Sending:", engine.history.length, "history items &", engine.devices.length, "devices");
            sendToParent('CLIPBOARD_HISTORY', { history: engine.history });
            sendToParent('DEVICE_LIST', { devices: engine.devices });
            break;
    }
});

console.log("✅ Child Process Started - Device:", DEVICE_ID);