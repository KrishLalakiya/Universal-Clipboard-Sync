// apps/desktop/main.js
// COMMIT 13: Send test message over WebRTC data channel

const SignalingClient = require("./network/SignalingClient");
const WebRTCManager = require("./network/WebRTCManager");

const DEVICE_ID = process.argv[2];

if (!DEVICE_ID) {
  console.error("Please pass device id (e.g. deviceA)");
  process.exit(1);
}

console.log("Desktop app started for device:", DEVICE_ID);

// 1️⃣ Create signaling client
const signalingClient = new SignalingClient({
  deviceId: DEVICE_ID,
  serverUrl: "ws://localhost:8080",
  onSignal: (data) => {
    console.log("Received signaling message:", data);
    webrtcManager.handleSignal(data.from, data.payload);
  }
});

// 2️⃣ Create WebRTC manager
const webrtcManager = new WebRTCManager({
  deviceId: DEVICE_ID,
  signalingClient
});

// 3️⃣ Handle incoming WebRTC messages
webrtcManager.onMessage = (message) => {
  console.log("📩 Received WebRTC message:", message);
};

// 4️⃣ Connect to signaling server
signalingClient.connect();

// 5️⃣ ONLY deviceA creates the WebRTC OFFER
if (DEVICE_ID === "deviceA") {
  setTimeout(() => {
    console.log("🚀 Starting WebRTC offer to deviceB");
    webrtcManager.createPeerConnection("deviceB");
  }, 2000);
}

// 6️⃣ Send test message AFTER data channel is open
if (DEVICE_ID === "deviceA") {
  setTimeout(() => {
    console.log("🚀 Sending test message over WebRTC");

    webrtcManager.sendMessage(
      JSON.stringify({
        type: "TEST",
        message: "hello from deviceA over WebRTC"
      })
    );
  }, 5000);
}
