const WebSocket = require("ws");

class SignalingClient {
  constructor({ deviceId, serverUrl, onSignal, onDeviceList }) {
    this.deviceId = deviceId;
    this.serverUrl = serverUrl;
    this.onSignal = onSignal;
    this.onDeviceList = onDeviceList;
    this.socket = null;
  }

  connect() {
    this.socket = new WebSocket(this.serverUrl);

    this.socket.on("open", () => {
      console.log("Connected to signaling server");

      this.socket.send(
        JSON.stringify({
          type: "REGISTER",
          deviceId: this.deviceId
        })
      );

      console.log("REGISTER sent for", this.deviceId);
    });

    this.socket.on("message", (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === "SIGNAL" && this.onSignal) {
        this.onSignal(message);
      }

      if (message.type === "DEVICE_LIST" && this.onDeviceList) {
        this.onDeviceList(message.devices);
      }
    });

    this.socket.on("close", () => {
      console.log("Disconnected from signaling server");
    });

    this.socket.on("error", (err) => {
      console.error("Signaling error:", err.message);
    });
  }

  sendSignal(to, payload) {
    this.socket.send(
      JSON.stringify({
        type: "SIGNAL",
        from: this.deviceId,
        to,
        payload
      })
    );
  }
}

module.exports = SignalingClient;
