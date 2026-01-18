const { app, Tray, Menu, BrowserWindow, nativeImage, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const { fork } = require("child_process");
const QRCode = require('qrcode');

// Import message types to ensure we match what the child process sends
// Make sure these match exactly what is in your shared/messageTypes.js!
const { CMD_CONNECT, UPDATE_HISTORY, UPDATE_DEVICES } = require('../shared/messageTypes');

let tray = null;
let mainWindow = null;
let engine = null;

/* =========================
   WINDOW
========================= */
function createWindow() {
    if (mainWindow) {
        mainWindow.show();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 500,
        height: 600, // Increased height slightly
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
   APP READY
========================= */
app.whenReady().then(() => {
    createWindow();

    tray = new Tray(nativeImage.createEmpty());
    tray.setToolTip("Universal Clipboard Sync");

    tray.setContextMenu(
        Menu.buildFromTemplate([
            { label: "Open App", click: () => createWindow() },
            { type: "separator" },
            { label: "Quit", click: () => app.quit() }
        ])
    );

    // --- START BACKGROUND ENGINE ---
    engine = fork(
        path.join(__dirname, "../apps/desktop/main.js"),
        [],
        {
            env: {
                DEVICE_ID: process.env.DEVICE_ID || os.hostname(),
                ...process.env // Inherit other env vars
            }
        }
    );

    // --- HANDLE MESSAGES FROM ENGINE ---
    engine.on("message", (msg) => {
        console.log("Main received from engine:", msg.type, msg);
        
        if (!mainWindow) return;
        
        // Handle both CLIPBOARD_HISTORY and UPDATE_HISTORY
        if (msg.type === 'CLIPBOARD_HISTORY' || msg.type === 'UPDATE_HISTORY') {
            const historyData = msg.history || [];
            console.log(`✅ UI Update: Sending ${historyData.length} history items`);
            mainWindow.webContents.send("history:update", historyData);
        }

        // Handle device list updates
        if (msg.type === 'DEVICE_LIST' || msg.type === 'UPDATE_DEVICES') {
            const devicesData = msg.devices || [];
            console.log(`✅ UI Update: Sending devices: ${devicesData.join(', ')}`);
            mainWindow.webContents.send("devices:update", devicesData);
        }
    });

    // Request initial state after engine starts
    setTimeout(() => {
        if (engine) {
            engine.send({ type: 'REQUEST_STATE' });
        }
    }, 1000);
});

/* =========================
   IPC HANDLERS (UI -> MAIN)
========================= */

// 1. Restore History Item
ipcMain.on("history:restore", (_, content) => {
    if (engine) {
        engine.send({ type: "RESTORE_CLIPBOARD", content });
    }
});

// 2. Connect to Room
ipcMain.on("ui:connect", (_, pin) => {
    if (engine) {
        // Ensure CMD_CONNECT string matches shared/messageTypes.js
        engine.send({ type: 'CMD_CONNECT', pin: pin });
    }
});

// 3. Request History (Legacy)
ipcMain.on("ui:request-history", (event) => {
    if (engine) {
        engine.send({ type: 'REQUEST_STATE' });
    }
});

// 4. Request State (Continuous Polling)
ipcMain.on("ui:request-state", (event) => {
    console.log("📤 UI requested state");
    if (engine) {
        engine.send({ type: 'REQUEST_STATE' });
    }
});

// 5. Generate QR (With Local IP Logic)
function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

ipcMain.handle("ui:generate-qr", async (_, dataStr) => {
    try {
        const data = JSON.parse(dataStr);
        const ip = getLocalIP();
        // Generates URL: http://192.168.1.5:3000/?pin=1234
        const url = `http://${ip}:3000/?pin=${data.pin}`;
        console.log("Generated QR for:", url);
        return await QRCode.toDataURL(url);
    } catch (e) {
        console.error("QR Generation Failed:", e);
        return "";
    }
});

/* =========================
   KEEP APP ALIVE
========================= */
app.on("window-all-closed", (e) => {
    // Keep app running in tray even if window closes
    e.preventDefault();
    // mainWindow = null; // Don't nullify if you want to just hide it, but standard is nullify
});