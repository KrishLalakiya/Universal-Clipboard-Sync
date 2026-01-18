const { app, Tray, Menu, nativeImage } = require("electron");

let tray = null;

app.whenReady().then(() => {
  console.log("Electron app ready");

  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const menu = Menu.buildFromTemplate([
    { label: "Clipboard Sync Running", enabled: false },
    { type: "separator" },
    {
      label: "Quit",
      click: () => app.quit()
    }
  ]);

  tray.setToolTip("Universal Clipboard Sync");
  tray.setContextMenu(menu);
});

app.on("window-all-closed", (e) => {
  e.preventDefault();
});
