// apps/desktop/core/SyncEngine.js

const { ClipboardItem } = require("../../../shared/models");

class SyncEngine {
  constructor(deviceId) {
    this.deviceId = deviceId;

    // stores last N clipboard items
    this.history = [];

    // stores clipboard items waiting to be sent
    this.offlineQueue = [];

    // paired devices status (deviceId -> online/offline)
    this.devices = {};
  }

  /**
   * Register or update a device status
   */
  updateDeviceStatus(deviceId, isOnline) {
    this.devices[deviceId] = isOnline;
  }

  /**
   * Called when clipboard changes locally
   */
  onLocalClipboardChange(type, content) {
    const item = new ClipboardItem({
      id: this.generateId(),
      type,
      content,
      sourceDeviceId: this.deviceId,
      timestamp: Date.now()
    });

    // Save to history
    this.history.push(item);

    // Decide what to do
    this.processClipboardItem(item);
  }

  /**
   * Decide whether to send now or queue
   */
  processClipboardItem(item) {
    const hasOnlineDevices = Object.values(this.devices).some(
      (status) => status === true
    );

    if (hasOnlineDevices) {
      this.sendToOnlineDevices(item);
    } else {
      this.offlineQueue.push(item);
    }
  }

  /**
   * Placeholder: will be connected to WebRTC later
   */
  sendToOnlineDevices(item) {
    console.log("Sending clipboard item to online devices:", item);
  }

  /**
   * Retry sending queued items
   */
  retryOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    const stillOffline = [];

    this.offlineQueue.forEach((item) => {
      const hasOnlineDevices = Object.values(this.devices).some(
        (status) => status === true
      );

      if (hasOnlineDevices) {
        this.sendToOnlineDevices(item);
      } else {
        stillOffline.push(item);
      }
    });

    this.offlineQueue = stillOffline;
  }

  /**
   * Simple unique ID generator
   */
  generateId() {
    return (
      Math.random().toString(36).substring(2) +
      Date.now().toString(36)
    );
  }
  /**
   * Called when a clipboard item is received from another device
   * Conflict handling: Last Write Wins
  */
  onRemoteClipboardItem(item) {
    const lastItem = this.history.length > 0 ? this.history[this.history.length - 1] : null;

    // If no history, accept immediately
    if (!lastItem) {
      this.history.push(item);
      console.log("Accepted remote clipboard item (no conflict):", item);
      return;
    }

    // Last Write Wins based on timestamp
    if (item.timestamp > lastItem.timestamp) {
      this.history.push(item);
      console.log("Accepted remote clipboard item (newer):", item);
    } else {
      console.log("Ignored remote clipboard item (older):", item);
    }
  }


}


module.exports = SyncEngine;

