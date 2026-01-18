// Shared message types for signaling and sync
module.exports = {
    // WebSocket / Network Messages
    JOIN_ROOM: 'JOIN_ROOM',
    CLIPBOARD_PUSH: 'CLIPBOARD_PUSH',
    DEVICE_NOTIFY: 'DEVICE_NOTIFY', // When a device joins/leaves
    DEVICE_LIST: 'DEVICE_LIST',
    
    // Internal Process Messages (Electron <-> Child Process)
    CMD_CONNECT: 'CMD_CONNECT',
    CMD_RESTORE: 'CMD_RESTORE',
    CLEAR_HISTORY: 'CLEAR_HISTORY',
    
    // Updates for UI
    UPDATE_HISTORY: 'CLIPBOARD_HISTORY',
    UPDATE_DEVICES: 'DEVICE_LIST',
    HISTORY_BATCH: 'HISTORY_BATCH'
};