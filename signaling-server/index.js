// const WebSocket = require("ws");

// const wss = new WebSocket.Server({ port: 8080 });

// // deviceId -> websocket
// const clients = new Map();

// console.log("Signaling server running on ws://localhost:8080");

// function broadcastDeviceList() {
//   const devices = Array.from(clients.keys());

//   for (const ws of clients.values()) {
//     ws.send(
//       JSON.stringify({
//         type: "DEVICE_LIST",
//         devices
//       })
//     );
//   }
// }

// wss.on("connection", (ws) => {
//   let deviceId = null;

//   ws.on("message", (message) => {
//     const data = JSON.parse(message);

//     // REGISTER
//     if (data.type === "REGISTER") {
//       deviceId = data.deviceId;
//       clients.set(deviceId, ws);

//       console.log(`Device registered: ${deviceId}`);
//       broadcastDeviceList();
//       return;
//     }

//     // SIGNAL relay
//     if (data.type === "SIGNAL") {
//       const target = clients.get(data.to);

//       if (target) {
//         target.send(
//           JSON.stringify({
//             type: "SIGNAL",
//             from: data.from,
//             payload: data.payload
//           })
//         );
//       }
//     }
//   });

//   ws.on("close", () => {
//     if (deviceId) {
//       clients.delete(deviceId);
//       console.log(`Device disconnected: ${deviceId}`);
//       broadcastDeviceList();
//     }
//   });
// });



const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { JOIN_ROOM, CLIPBOARD_PUSH, DEVICE_NOTIFY, HISTORY_BATCH } = require('../shared/messageTypes');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {};       // Active connections: { "1234": [ws1, ws2] }
const roomHistory = {}; // Saved History: { "1234": ["text1", "text2"] }

console.log("Starting Signaling Server...");

wss.on('connection', (ws) => {
    ws.room = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // --- JOIN ROOM ---
            if (data.type === JOIN_ROOM) {
                const { pin, deviceId } = data.payload;
                ws.room = pin;
                ws.deviceId = deviceId;
                
                if (!rooms[pin]) rooms[pin] = [];
                rooms[pin].push(ws);

                // Initialize history for this room if needed
                if (!roomHistory[pin]) roomHistory[pin] = [];

                // 1. Notify others
                broadcastDeviceCount(pin);
                console.log(`Device joined Room ${pin}: ${deviceId}`);

                // 2. SYNC: Send existing room history to this NEW device
                if (roomHistory[pin].length > 0) {
                    ws.send(JSON.stringify({
                        type: HISTORY_BATCH,
                        payload: roomHistory[pin]
                    }));
                }
            }

            // --- CLIPBOARD PUSH ---
            else if (data.type === CLIPBOARD_PUSH) {
                const pin = ws.room;
                if (pin) {
                    // 1. Save to Server History (Limit to last 20 items)
                    if (!roomHistory[pin]) roomHistory[pin] = [];
                    roomHistory[pin].push(data.payload);
                    if (roomHistory[pin].length > 20) roomHistory[pin].shift();

                    // 2. Broadcast to everyone else
                    broadcastClip(ws, data.payload);
                }
            }
        } catch (e) {
            console.error("Error parsing message:", e);
        }
    });

    ws.on('close', () => {
        if (ws.room && rooms[ws.room]) {
            rooms[ws.room] = rooms[ws.room].filter(c => c !== ws);
            broadcastDeviceCount(ws.room);
        }
    });
});

function broadcastClip(sender, text) {
    if (!sender.room || !rooms[sender.room]) return;
    rooms[sender.room].forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: CLIPBOARD_PUSH, payload: text }));
        }
    });
}

function broadcastDeviceCount(roomPin) {
    if (!rooms[roomPin]) return;
    const count = rooms[roomPin].length;
    rooms[roomPin].forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: DEVICE_NOTIFY, payload: count }));
        }
    });
}

// Listen on Port 3000 to avoid "Unexpected server response" errors
server.listen(3000, '0.0.0.0', () => {
    console.log("Server running on http://0.0.0.0:3000");
});
