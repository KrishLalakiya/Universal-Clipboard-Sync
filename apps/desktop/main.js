const SignalingClient = require("./network/SignalingClient");
const WebRTCManager = require("./network/WebRTCManager");
const SyncEngine = require("./core/SyncEngine");
const ClipboardWatcher = require("./clipboard/ClipboardWatcher");

const DEVICE_ID =
  process.env.DEVICE_ID ||
  process.argv[2] ||
  require("os").hostname();


if (!DEVICE_ID) {
  console.error("Please pass device id");
  process.exit(1);
}

console.log("Desktop app started for device:", DEVICE_ID);

// 1️⃣ State
const peers = new Map();
const syncEngine = new SyncEngine(DEVICE_ID);

// 2️⃣ Signaling client
const signalingClient = new SignalingClient({
  deviceId: DEVICE_ID,
  serverUrl: "ws://localhost:8080",

  onSignal: ({ from, payload }) => {
    const peer = peers.get(from);
    if (peer) {
      peer.handleSignal(from, payload);
    }
  },

  onDeviceList: (devices) => {
  console.log("📡 Online devices:", devices);

  const online = new Set(devices);

  // 1️⃣ REMOVE peers that went offline
  for (const [deviceId, peer] of peers) {
    if (!online.has(deviceId)) {
      console.log("🧹 Removing offline peer:", deviceId);
      try {
        peer.dataChannel?.close();
        peer.peerConnection?.close();
      } catch (_) {}
      peers.delete(deviceId);
    }
  }

  // 2️⃣ ADD peers that are newly online
  devices.forEach((deviceId) => {
    if (deviceId === DEVICE_ID) return;
    if (peers.has(deviceId)) return;

    console.log("🔗 Creating WebRTC peer for", deviceId);

    const peer = new WebRTCManager({
      deviceId: DEVICE_ID,
      signalingClient
    });

    peer.onMessage = (message) => {
      const data = JSON.parse(message);
      if (data.type === "CLIPBOARD_ITEM") {
        console.log("📋 Clipboard received:", data.payload.content);
        syncEngine.onRemoteClipboardItem(data.payload);
      }
    };

    peers.set(deviceId, peer);

    // Deterministic initiator to avoid double offers
    if (DEVICE_ID < deviceId) {
      setTimeout(() => {
        peer.createPeerConnection(deviceId);
      }, 1000);
    }
  });
}

});

// 3️⃣ SyncEngine → WebRTC (broadcast)
syncEngine.sendToOnlineDevices = (item) => {
  if (item.sourceDeviceId !== DEVICE_ID) return;

  for (const [deviceId, peer] of peers) {
    if (peer.dataChannel?.readyState === "open") {
      peer.sendMessage(
        JSON.stringify({
          type: "CLIPBOARD_ITEM",
          payload: item
        })
      );
    }
  }
};


// 4️⃣ Clipboard watcher
const clipboardWatcher = new ClipboardWatcher((text) => {
  if (Date.now() - syncEngine.lastRemoteUpdateTimestamp < 500) return;

  console.log(`📋 Local clipboard changed on ${DEVICE_ID}:`, text);
  syncEngine.onLocalClipboardChange("text", text);
});

clipboardWatcher.start();

// 5️⃣ Connect
signalingClient.connect();
