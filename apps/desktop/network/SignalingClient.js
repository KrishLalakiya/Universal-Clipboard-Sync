// apps/desktop/network/SignalingClient.js

const WebSocket = require("ws");
// const WebRTCManager = require("./network/WebRTCManager");

class SignalingClient {
  constructor({ deviceId, serverUrl, onSignal }) {
    this.deviceId = deviceId;
    this.serverUrl = serverUrl;
    this.onSignal = onSignal;
    this.socket = null;
  }

  connect() {
    this.socket = new WebSocket(this.serverUrl);

    this.socket.on("open", () => {
      console.log("Connected to signaling server");

      // Register device
      this.socket.send(
        JSON.stringify({
          type: "REGISTER",
          deviceId: this.deviceId
        }));
        console.log(`REGISTER sent for ${this.deviceId}`);
    });
    this.socket.on("message", (data) => {
      const message = JSON.parse(data.toString());

      console.log("SIGNALING MESSAGE RECEIVED:", message);

      // Forward peer-to-peer signaling messages
      if (message.type === "SIGNAL" && this.onSignal) {
        this.onSignal({
          from: message.from,
          payload: message.payload
        });
      } else {
        console.log("Non-signal message from server:", message);
      }

    });

    // this.socket.on("message", (message) => {
    //   const data = JSON.parse(message);

    //   if (data.type === "SIGNAL") {
    //     console.log("Received signaling message:", data);
    //     if (this.onSignal) {
    //       this.onSignal(data);
    //     }
    //   }
    // });

    this.socket.on("close", () => {
      console.log("Disconnected from signaling server");
    });

    this.socket.on("error", (err) => {
      console.error("Signaling error:", err.message);
    });
  }

  sendSignal(targetDeviceId, payload) {
    if (!this.socket) return;

    this.socket.send(
      JSON.stringify({
        type: "SIGNAL",
        from: this.deviceId,      // 🔑 who is sending
        to: targetDeviceId,       // 🔑 who should receive
        payload                   // OFFER / ANSWER / ICE
      })
    );
  }

}

module.exports = SignalingClient;
