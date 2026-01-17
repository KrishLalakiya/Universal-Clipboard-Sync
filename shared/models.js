// Shared data models will live here
// shared/models.js

/**
 * Represents one clipboard item
 */
class ClipboardItem {
  constructor({ id, type, content, sourceDeviceId, timestamp }) {
    this.id = id; // unique id
    this.type = type; // "text" | "image" | "file"
    this.content = content; // actual data
    this.sourceDeviceId = sourceDeviceId;
    this.timestamp = timestamp; // Date.now()
  }
}

/**
 * Represents a paired device
 */
class Device {
  constructor({ id, name, platform, online }) {
    this.id = id;
    this.name = name; // e.g. "Om's Laptop"
    this.platform = platform; // "windows" | "linux" | "android"
    this.online = online; // true / false
  }
}

module.exports = {
  ClipboardItem,
  Device
};

// These models are OS-independent and used by the Core Sync Engine

