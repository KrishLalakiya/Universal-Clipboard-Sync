// signaling-server/index.js

const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

// deviceId -> websocket
const clients = new Map();

console.log("Signaling server running on ws://localhost:8080");

wss.on("connection", (ws) => {
  let deviceId = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // Device registers itself
    if (data.type === "REGISTER") {
      deviceId = data.deviceId;
      clients.set(deviceId, ws);

      console.log(`Device registered: ${deviceId}`);
      return;
    }

    // Relay signaling messages (offer / answer / ICE)
    if (data.type === "SIGNAL") {
      const targetSocket = clients.get(data.targetDeviceId);

      if (targetSocket) {
        targetSocket.send(
          JSON.stringify({
            type: "SIGNAL",
            from: deviceId,
            payload: data.payload
          })
        );
      }
    }
  });

  ws.on("close", () => {
    if (deviceId) {
      clients.delete(deviceId);
      console.log(`Device disconnected: ${deviceId}`);
    }
  });
});
