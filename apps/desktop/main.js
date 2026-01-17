// apps/desktop/main.js
// COMMIT 10: Signaling-only device registration

const WebSocket = require("ws");
const SignalingClient = require("./network/SignalingClient");

const DEVICE_ID = process.argv[2];

if (!DEVICE_ID) {
  console.error("Please pass device id (e.g. deviceA)");
  process.exit(1);
}

console.log("Desktop app started for device:", DEVICE_ID);

const signalingClient = new SignalingClient({
  deviceId: DEVICE_ID,
  serverUrl: "ws://localhost:8080",
  onSignal: (data) => {
    console.log(
      `Received SIGNAL from ${data.from}:`,
      data.payload
    );
  }
});

signalingClient.connect();


if (DEVICE_ID === "deviceA") {
  setTimeout(() => {
    console.log("Sending PING to deviceB");

    signalingClient.sendSignal("deviceB", {
      type: "PING",
      message: "hello from deviceA"
    });
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
