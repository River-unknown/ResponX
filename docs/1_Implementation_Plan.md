# Edge Hub Backend Implementation Plan

This document outlines the architecture and technical design blueprint for the real-time Edge Hub backend prototype, designed to manage decentralized crisis states without relying on slow cloud lookups.

## Core Project Setup
We utilize a Node.js ecosystem built on the following technologies to maximize response times during an emergency:
- **Express.js**: To handle REST API endpoints serving our "Global State" and simulating IoT triggers.
- **Socket.io**: To handle real-time WebSocket multicasting to specific groups (guests, staff, responders) instantaneously.
- **Jest & Supertest**: To provide completely automated verification testing for our core routing algorithms.

## Data Models & Logic

### Environment Scaffolding (`mock_building.json`)
The building structure maps structurally as a mathematical graph using an Adjacency List design:
- `nodes`: The list of all rooms, hallways, and exits containing necessary metadata (e.g., node type, floor number).
- `adjacencies`: An undirected adjacency array network defining exact physical connections securely (e.g. from `Guest Room 302` to `Floor 3 Hallway`).

### Memory & Global State (`state.js`)
We use an ultra-fast in-memory State Dict representing the current "Digital Twin":
- **Building Map/Graph**: Preloaded instantly from `mock_building.json`.
- **Hazard Layer**: Tracks active threats (e.g., Smoke, Fire) mapped to specific Node IDs. Nodes assigned to an active Hazard are dynamically flagged as blocked pathways.
- **Occupancy Layer**: Tracks all live personnel via `SocketID` mappings, including their reported locations and assigned roles (Guest vs Responder).

### The "Navigator" Routing Engine (`navigator.js`)
Rather than relying on pre-calculated, hardcoded evacuation paths (which fail when unexpected blockages occur), we compute the shortest safe path in real-time.
- **Algorithm**: Implements Breadth-First Search (BFS) mathematically finding the shortest unblocked path to safety since physical building distances generally have equal weight between connected rooms.
- **Dead-End Fail-safe**: If all paths connected to a guest become compromised/blocked by Hazards, the engine intentionally abandons finding a path, electing instead to fallback onto an actionable `"SHELTER IN PLACE"` directive.

## WebSockets and The "Action Card" Protocol
We leverage WebSockets to bypass typical HTTP pull-requests. The moment the backend registers a new hazard, it automatically determines what every single user must do based on their exact coordinate location, then immediately multicasts highly formatted "Action Cards".

```json
{
  "type": "ACTION_CARD_UPDATE",
  "payload": {
    "severity": "CRITICAL",
    "title": "EVACUATE NOW",
    "instruction": "Exit room and turn LEFT. Follow the Green floor lights to the South Stairwell.",
    "visual_cue": "FLASHING_RED", 
    "haptic_pattern": "RAPID_PULSE",
    "audio_alert": "voice_evac_south.mp3"
  }
}
```
These cards enforce a "Zero-Cognitive Load" approach. The user's Edge Device doesn't think; it simply obeys the action card styling injected by the central Hub.
