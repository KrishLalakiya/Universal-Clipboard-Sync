const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

// deviceId -> websocket
const clients = new Map();

console.log("Signaling server running on ws://localhost:8080");

function broadcastDeviceList() {
  const devices = Array.from(clients.keys());

  for (const ws of clients.values()) {
    ws.send(
      JSON.stringify({
        type: "DEVICE_LIST",
        devices
      })
    );
  }
}

wss.on("connection", (ws) => {
  let deviceId = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // REGISTER
    if (data.type === "REGISTER") {
      deviceId = data.deviceId;
      clients.set(deviceId, ws);

      console.log(`Device registered: ${deviceId}`);
      broadcastDeviceList();
      return;
    }

    // SIGNAL relay
    if (data.type === "SIGNAL") {
      const target = clients.get(data.to);

      if (target) {
        target.send(
          JSON.stringify({
            type: "SIGNAL",
            from: data.from,
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
      broadcastDeviceList();
    }
  });
});
