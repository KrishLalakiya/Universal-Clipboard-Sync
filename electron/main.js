const { app, Tray, Menu, BrowserWindow, nativeImage, ipcMain } = require("electron");
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
        height: 450,
        title: "Universal Clipboard Sync",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));


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

    createWindow(); // debug-friendly

    tray = new Tray(nativeImage.createEmpty());
    tray.setToolTip("Universal Clipboard Sync");

    tray.setContextMenu(
        Menu.buildFromTemplate([
            { label: "Open App", click: () => createWindow() },
            { type: "separator" },
            { label: "Quit", click: () => app.quit() }
        ])
    );

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
        if (msg.type === "DEVICE_STATUS") {
            if (mainWindow) {
                mainWindow.webContents.send("devices:status", msg.devices);
            }
        }
        if (msg.type === "CLIPBOARD_HISTORY") {
            if (mainWindow) {
                mainWindow.webContents.send("history:update", msg.history);
            }
        }
    });
});

/* =========================
   HISTORY RESTORE (IPC)
========================= */
ipcMain.on("history:restore", (_, content) => {
    if (engine) {
        engine.send({
            type: "RESTORE_CLIPBOARD",
            content
        });
    }
});

/* =========================
   KEEP APP ALIVE
========================= */
app.on("window-all-closed", (e) => {
    e.preventDefault();
});
