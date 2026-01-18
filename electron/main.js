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
        // 1. Handle History Updates
        // Note: Check shared/messageTypes.js to confirm if it is 'CLIPBOARD_HISTORY' or 'UPDATE_HISTORY'
        if (msg.type === 'CLIPBOARD_HISTORY' || msg.type === 'UPDATE_HISTORY') {
            console.log("UI Update: History received");
            if (mainWindow) {
                mainWindow.webContents.send("history:update", msg.history);
            }
        }
        
        // 2. Handle Device List Updates (You were missing this!)
        else if (msg.type === 'DEVICE_LIST' || msg.type === 'UPDATE_DEVICES') {
             console.log("UI Update: Devices received", msg.devices);
             if (mainWindow) {
                 mainWindow.webContents.send("devices:update", msg.devices);
             }
        }

        if (msg.type === 'DEVICE_LIST') { 
         // Send to Window
         mainWindow.webContents.send("devices:update", msg.devices);
    }
    });
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

// 3. Generate QR (With Local IP Logic)
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