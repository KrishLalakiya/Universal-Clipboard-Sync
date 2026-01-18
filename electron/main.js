const { app, Tray, Menu, BrowserWindow, nativeImage } = require("electron");
const path = require("path");
const os = require("os");
const { fork } = require("child_process");

let tray = null;
let mainWindow = null;
let connectedDevices = [];
let engine = null;

/* =========================
   WINDOW
========================= */
function createWindow() {
  if (mainWindow) {
    mainWindow.show();
    return;
  }

  console.log("Creating main window");

  mainWindow = new BrowserWindow({
    width: 500,
    height: 350,
    title: "Universal Clipboard Sync",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadURL(
    "data:text/html," +
      encodeURIComponent(`
<!DOCTYPE html>
<html>
<head>
  <title>Universal Clipboard Sync</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; }
    h2 { margin-top: 0; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <h2>Universal Clipboard Sync</h2>
  <p>Status: <b>Running</b></p>

  <h3>Connected Devices</h3>
  <ul id="devices">
    <li>Loading...</li>
  </ul>

  <script>
    const { ipcRenderer } = require("electron");

    ipcRenderer.on("devices:update", (_, devices) => {
      const ul = document.getElementById("devices");
      ul.innerHTML = "";

      if (devices.length === 0) {
        ul.innerHTML = "<li>No devices connected</li>";
        return;
      }

      devices.forEach(device => {
        const li = document.createElement("li");
        li.textContent = device;
        ul.appendChild(li);
      });
    });
  </script>
</body>
</html>
`)
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/* =========================
   ENGINE → UI
========================= */
function updateDeviceList(devices) {
  connectedDevices = devices;

  if (mainWindow) {
    mainWindow.webContents.send("devices:update", connectedDevices);
  }
}

/* =========================
   APP READY
========================= */
app.whenReady().then(() => {
  console.log("Electron app ready");

  // 🔹 Create window on start (debug-friendly)
  createWindow();

  // 🔹 Tray
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip("Universal Clipboard Sync");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open App",
        click: () => createWindow()
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => app.quit()
      }
    ])
  );

  // 🔹 Start clipboard engine as child process
  engine = fork(
    path.join(__dirname, "../apps/desktop/main.js"),
    [],
    {
      env: {
        DEVICE_ID: process.env.DEVICE_ID || os.hostname()
      }
    }
  );

  engine.on("message", (msg) => {
    if (msg.type === "DEVICE_LIST") {
      updateDeviceList(msg.devices);
    }
  });
});

/* =========================
   KEEP APP ALIVE
========================= */
app.on("window-all-closed", (e) => {
  e.preventDefault(); // keep tray app alive
});
