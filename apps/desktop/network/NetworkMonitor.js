const { EventEmitter } = require('events');
const dns = require('dns').promises;

class NetworkMonitor extends EventEmitter {
    constructor(checkInterval = 5000) {
        super();
        this.isOnline = false;
        this.checkInterval = checkInterval;
        this.monitorInterval = null;
    }

    async checkConnectivity() {
        try {
            // Try to resolve a reliable DNS
            await dns.resolve('8.8.8.8');
            return true;
        } catch (e) {
            try {
                // Fallback
                await dns.resolve('1.1.1.1');
                return true;
            } catch {
                return false;
            }
        }
    }

    start() {
        console.log("🌐 Network Monitor started");
        
        // Check immediately
        this.checkConnectivity().then(online => {
            this.updateStatus(online);
        });

        // Then check periodically
        this.monitorInterval = setInterval(async () => {
            const online = await this.checkConnectivity();
            this.updateStatus(online);
        }, this.checkInterval);
    }

    updateStatus(online) {
        if (online !== this.isOnline) {
            this.isOnline = online;
            console.log(online ? "🟢 Network: ONLINE" : "🔴 Network: OFFLINE");
            this.emit(online ? 'online' : 'offline');
        }
    }

    stop() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }

    isConnected() {
        return this.isOnline;
    }
}

module.exports = NetworkMonitor;
