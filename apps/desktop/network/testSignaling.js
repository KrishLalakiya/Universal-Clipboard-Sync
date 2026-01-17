const SignalingClient = require("./SignalingClient");

const client = new SignalingClient({
  deviceId: "desktop-1",
  serverUrl: "ws://localhost:8080",
  onSignal: (data) => {
    console.log("Signal received in app:", data);
  }
});

client.connect();
