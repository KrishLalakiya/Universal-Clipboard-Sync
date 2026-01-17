// apps/desktop/main.js
// COMMIT 13: Send test message over WebRTC data channel

const SignalingClient = require("./network/SignalingClient");
const WebRTCManager = require("./network/WebRTCManager");
const SyncEngine = require("./core/SyncEngine");
const ClipboardWatcher = require("./clipboard/ClipboardWatcher");

const DEVICE_ID = process.argv[2];

if (!DEVICE_ID) {
  console.error("Please pass device id (e.g. deviceA)");
  process.exit(1);
}

console.log("Desktop app started for device:", DEVICE_ID);

//
// 1️⃣ Create SyncEngine
//
const syncEngine = new SyncEngine(DEVICE_ID);

//
// 2️⃣ Create SignalingClient
//
const signalingClient = new SignalingClient({
  deviceId: DEVICE_ID,
  serverUrl: "ws://localhost:8080",
  onSignal: (data) => {
    webrtcManager.handleSignal(data.from, data.payload);
  }
});

//
// 3️⃣ Create WebRTCManager
//
const webrtcManager = new WebRTCManager({
  deviceId: DEVICE_ID,
  signalingClient
});

//
// 4️⃣ Wire WebRTC → SyncEngine
//
webrtcManager.onMessage = (message) => {
  const data = JSON.parse(message);

  if (data.type === "CLIPBOARD_ITEM") {
    console.log("📋 Clipboard received:", data.payload.content);
    syncEngine.onRemoteClipboardItem(data.payload);
  }
};

//
// 5️⃣ Wire SyncEngine → WebRTC
//
syncEngine.sendToOnlineDevices = (item) => {
  // 🚫 Do not send back items that came from another device
  if (item.sourceDeviceId !== DEVICE_ID) return;

  webrtcManager.sendMessage(
    JSON.stringify({
      type: "CLIPBOARD_ITEM",
      payload: item
    })
  );
};


//
// 6️⃣ Connect to signaling server
//
signalingClient.connect();

//
// 7️⃣ Only deviceA starts WebRTC
//
if (DEVICE_ID === "deviceA") {
  setTimeout(() => {
    console.log("🚀 Starting WebRTC offer to deviceB");
    webrtcManager.createPeerConnection("deviceB");
  }, 2000);
}

//
// 8️⃣ Start clipboard watcher
//
const clipboardWatcher = new ClipboardWatcher((text) => {
  console.log(`📋 Local clipboard changed on ${DEVICE_ID}:`, text);
  syncEngine.onLocalClipboardChange("text", text);
});

clipboardWatcher.start();