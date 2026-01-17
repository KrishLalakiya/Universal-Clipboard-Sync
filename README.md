# Universal Clipboard Sync

A cross-platform, peer-to-peer clipboard synchronization system that works across different operating systems and networks.

## Problem
Users work across multiple devices and OS platforms. Clipboard sync is often limited to proprietary ecosystems or same-network solutions.

## Solution
Each device runs a local clipboard agent that:
- Detects clipboard changes
- Syncs data directly to paired devices using WebRTC
- Uses a signaling server only for connection setup
- Never stores clipboard data on servers

## Architecture
- Core Sync Engine (OS-independent)
- OS Adapter (platform-specific clipboard access)
- WebRTC Data Channels (P2P data transfer)
- WebSocket Signaling Server (no data storage)

## Status
🚧 Project under active development (Hackathon MVP)
