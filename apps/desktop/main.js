// apps/desktop/main.js

const ClipboardWatcher = require("./clipboard/ClipboardWatcher");


const SyncEngine = require("./core/SyncEngine");
const WebRTCManager = require("./network/WebRTCManager");
const SignalingClient = require("./network/SignalingClient");

const DEVICE_ID = process.argv[2];

if (!DEVICE_ID) {
  console.error("Please pass device id");
  process.exit(1);
}

// Create Sync Engine
const syncEngine = new SyncEngine(DEVICE_ID);

// Create Signaling Client
const signalingClient = new SignalingClient({
  deviceId: DEVICE_ID,
  serverUrl: "ws://localhost:8080",
  onSignal: (data) => {
    webrtcManager.handleSignal(data.from, data.payload);
  }
});

// Create WebRTC Manager
const webrtcManager = new WebRTCManager({
  deviceId: DEVICE_ID,
  signalingClient
});

// 🔌 WIRING (THIS IS THE KEY PART)

// When SyncEngine wants to send data
syncEngine.sendToOnlineDevices = (item) => {
  webrtcManager.sendMessage(JSON.stringify(item));
};

// When WebRTC receives data
webrtcManager.onMessage = (message) => {
  const item = JSON.parse(message);
  syncEngine.onRemoteClipboardItem(item);
};

signalingClient.connect();

// Start clipboard watching
const clipboardWatcher = new ClipboardWatcher((text) => {
  console.log("Local clipboard changed:", text);

  syncEngine.onLocalClipboardChange("text", text);
});

clipboardWatcher.start();


console.log("Desktop app started for device:", DEVICE_ID);
