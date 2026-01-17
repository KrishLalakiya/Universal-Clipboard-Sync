// apps/desktop/network/WebRTCManager.js

const wrtc = require("wrtc");

class WebRTCManager {
  constructor({ deviceId, signalingClient }) {
    this.deviceId = deviceId;
    this.signalingClient = signalingClient;

    this.peerConnection = null;
    this.dataChannel = null;
  }

  async createPeerConnection(targetDeviceId) {
    this.peerConnection = new wrtc.RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    // ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingClient.sendSignal(targetDeviceId, {
          type: "ICE_CANDIDATE",
          candidate: event.candidate
        });
      }
    };

    // Create data channel
    this.dataChannel = this.peerConnection.createDataChannel("clipboard");

    this.dataChannel.onopen = () => {
      console.log("Data channel open");
    };

    this.dataChannel.onmessage = (event) => {
      console.log("Received P2P message:", event.data);

      if (this.onMessage) {
        this.onMessage(event.data);
      }
    };


    // Create offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Send offer through signaling server
    this.signalingClient.sendSignal(targetDeviceId, {
      type: "OFFER",
      offer
    });
  }

  async handleSignal(fromDeviceId, payload) {
    if (payload.type === "OFFER") {
      await this.handleOffer(fromDeviceId, payload.offer);
    }

    if (payload.type === "ANSWER") {
      await this.peerConnection.setRemoteDescription(payload.answer);
    }

    if (payload.type === "ICE_CANDIDATE") {
      await this.peerConnection.addIceCandidate(payload.candidate);
    }
  }

  async handleOffer(fromDeviceId, offer) {
    this.peerConnection = new wrtc.RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingClient.sendSignal(fromDeviceId, {
          type: "ICE_CANDIDATE",
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;

      this.dataChannel.onmessage = (e) => {
        const message = JSON.parse(e.data);

        // if (message.type === "CLIPBOARD_ITEM") {
        //     syncEngine.onRemoteClipboardItem(message.payload);
        // }
        if (this.onMessage) {
          this.onMessage(e.data);
        }
      };
    };

    await this.peerConnection.setRemoteDescription(offer);

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.signalingClient.sendSignal(fromDeviceId, {
      type: "ANSWER",
      answer
    });
  }

  sendMessage(message) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(message);
    }
  }
}

module.exports = WebRTCManager;