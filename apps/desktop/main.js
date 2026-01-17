// apps/desktop/main.js
// COMMIT 12: WebRTC signaling via signaling server (NO clipboard)
const WebSocket = require("ws");
const SignalingClient = require("./network/SignalingClient");
const WebRTCManager = require("./network/WebRTCManager");

const DEVICE_ID = process.argv[2];

if (!DEVICE_ID) {
  console.error("Please pass device id (e.g. deviceA)");
  process.exit(1);
}

console.log("Desktop app started for device:", DEVICE_ID);

let webrtcManager = null;

// 2️⃣ Create signaling client
const signalingClient = new SignalingClient({
  deviceId: DEVICE_ID,
  serverUrl: "ws://localhost:8080",
  onSignal: (data) => {
    console.log("Received signaling message:", data);

    // Forward signaling payloads to WebRTC
    if (webrtcManager) {
      webrtcManager.handleSignal(data.from, data.payload);
    }
  }
});

// 3️⃣ Create WebRTCManager AFTER signaling client exists
webrtcManager = new WebRTCManager({
  deviceId: DEVICE_ID,
  signalingClient
});

// 4️⃣ Connect to signaling server
signalingClient.connect();

// 5️⃣ Only ONE device starts WebRTC (offer creator)
if (DEVICE_ID === "deviceA") {
  setTimeout(() => {
    console.log("Starting WebRTC offer to deviceB");
    webrtcManager.createPeerConnection("deviceB");
  }, 2000);
}

// // Connect to signaling server
// const socket = new WebSocket("ws://localhost:8080");

// socket.on("open", () => {
//   console.log("Connected to signaling server");

//   // Register device
//   socket.send(
//     JSON.stringify({
//       type: "REGISTER",
//       deviceId: DEVICE_ID
//     })
//   );

//   console.log("REGISTER sent for", DEVICE_ID);
// });

// socket.on("message", (data) => {
//   console.log("Message from signaling server:", data.toString());
// });

// socket.on("close", () => {
//   console.log("Disconnected from signaling server");
// });

// socket.on("error", (err) => {
//   console.error("WebSocket error:", err.message);
// });
