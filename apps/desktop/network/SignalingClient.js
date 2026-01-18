// const WebSocket = require("ws");

// class SignalingClient {
//   constructor({ deviceId, serverUrl, onSignal, onDeviceList }) {
//     this.deviceId = deviceId;
//     this.serverUrl = serverUrl;
//     this.onSignal = onSignal;
//     this.onDeviceList = onDeviceList;
//     this.socket = null;
//   }

//   connect() {
//     this.socket = new WebSocket(this.serverUrl);

//     this.socket.on("open", () => {
//       console.log("Connected to signaling server");

//       this.socket.send(
//         JSON.stringify({
//           type: "REGISTER",
//           deviceId: this.deviceId
//         })
//       );

//       console.log("REGISTER sent for", this.deviceId);
//     });

//     this.socket.on("message", (data) => {
//       const message = JSON.parse(data.toString());

//       if (message.type === "SIGNAL" && this.onSignal) {
//         this.onSignal(message);
//       }

//       if (message.type === "DEVICE_LIST" && this.onDeviceList) {
//         this.onDeviceList(message.devices);
//       }
//     });

//     this.socket.on("close", () => {
//       console.log("Disconnected from signaling server");
//     });

//     this.socket.on("error", (err) => {
//       console.error("Signaling error:", err.message);
//     });
//   }

//   sendSignal(to, payload) {
//     this.socket.send(
//       JSON.stringify({
//         type: "SIGNAL",
//         from: this.deviceId,
//         to,
//         payload
//       })
//     );
//   }
// }

// module.exports = SignalingClient;


//code 2

// const WebSocket = require('ws');
// const { JOIN_ROOM, CLIPBOARD_PUSH, DEVICE_NOTIFY } = require('../../../shared/messageTypes');

// class SignalingClient {
//     constructor(callbacks) {
//         this.ws = null;
//         this.callbacks = callbacks; // { onClip, onDeviceUpdate }
//     }

//     connect(url, pin, deviceId) {
//         this.ws = new WebSocket(url);

//         this.ws.on('open', () => {
//             console.log('WS Open. Joining room:', pin);
//             // Handshake
//             this.send({ type: JOIN_ROOM, payload: { pin, deviceId } });
//         });

//         this.ws.on('message', (data) => {
//             try {
//                 const msg = JSON.parse(data);
//                 switch (msg.type) {
//                     case CLIPBOARD_PUSH:
//                         if (this.callbacks.onClip) this.callbacks.onClip(msg.payload);
//                         break;
//                     case DEVICE_NOTIFY:
//                         if (this.callbacks.onDeviceUpdate) this.callbacks.onDeviceUpdate(msg.payload);
//                         break;
//                 }
//             } catch (e) {
//                 console.error('WS Parse Error', e);
//             }
//         });

//         this.ws.on('error', (e) => console.error('WS Error', e));
//     }

//     sendClip(text) {
//         this.send({ type: CLIPBOARD_PUSH, payload: text });
//     }

//     send(msg) {
//         if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//             this.ws.send(JSON.stringify(msg));
//         }
//     }
// }

// module.exports = SignalingClient;



const WebSocket = require('ws');
const EventEmitter = require('events'); 
const { JOIN_ROOM, CLIPBOARD_PUSH, DEVICE_NOTIFY, HISTORY_BATCH } = require('../../../shared/messageTypes');

class SignalingClient extends EventEmitter {
    constructor(callbacks) {
        super(); 
        this.ws = null;
        this.callbacks = callbacks; 
        this.isConnected = false;
    }

    connect(url, pin, deviceId) {
        // If already connected, close first
        if (this.ws) { 
            try { this.ws.terminate(); } catch(e){} 
        }

        this.ws = new WebSocket(url);

        this.ws.on('open', () => {
            console.log('WS Open. Joining room:', pin);
            this.isConnected = true;
            this.send({ type: JOIN_ROOM, payload: { pin, deviceId } });
            
            // Notify SyncEngine we are back online
            this.emit('connected'); 
        });

        this.ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                switch (msg.type) {
                    case CLIPBOARD_PUSH:
                        if (this.callbacks.onClip) this.callbacks.onClip(msg.payload);
                        break;
                    case DEVICE_NOTIFY:
                        if (this.callbacks.onDeviceUpdate) this.callbacks.onDeviceUpdate(msg.payload);
                        break;
                    // NEW: Handle Batch History
                    case HISTORY_BATCH:
                        if (this.callbacks.onHistoryBatch) this.callbacks.onHistoryBatch(msg.payload);
                        break;
                }
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        });

        this.ws.on('close', () => {
            this.isConnected = false;
            console.log('WS Disconnected');
        });

        this.ws.on('error', (e) => {
            this.isConnected = false;
            console.error('WS Error', e);
        });
    }

    sendClip(text) {
        // Return true if sent, false if offline
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.send({ type: CLIPBOARD_PUSH, payload: text });
            return true;
        }
        return false;
    }

    send(msg) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }
}

module.exports = SignalingClient;