# Edge Hub Backend Prototype

This acts as the "Nervous System" of our building, providing a real-time Edge Hub backend to manage a decentralized crisis state. Built specifically for the Google Solutions Challenge, it ingests IoT sensor data, updates a "Digital Twin" of the building, and calculates safe evacuation paths immediately. 

## Features & Implementation Overview

We constructed the environment relying on core fast-paced technologies: 
* **Express.js** to handle REST API commands like Triage sensors.
* **Socket.io** to manage real-time multicast connections grouped by user roles and locations.
* **Jest** to ensure strict automated checks for our pathfinding behavior.

### The Building Graph (Adjacency List)
To execute fast response times, the `mock_building.json` uses an Adjacency List for instant `O(1)` node look-ups, representing our floor structure perfectly for Breadth-First Searches.

```json
{
  "nodes": {
    "101": { "type": "room", "floor": 1, "label": "Guest Room 101" },
    "H1":  { "type": "hallway", "floor": 1, "label": "North Hallway" },
    "EX1": { "type": "exit", "floor": 1, "label": "Main Lobby Exit" }
  },
  "adjacencies": {
    "101": ["H1"],
    "H1": ["101", "EX1"],
    "EX1": ["H1"]
  }
}
```

### In-Memory Distributed State
`state.js` maintains the status of the environment entirely in-memory using dictionaries and arrays to cut out disk-read latency completely. It tracks both the `hazard layer` (fire/smoke locations) and the `occupancy layer` (who is where). 

### Real-Time Routing Logic (BFS)
`navigator.js` employs a Breadth-First Search (BFS) algorithm to route guests to the nearest exit without intersecting any active hazard zones flagged in the state. 

**The Dead-End Fail-safe**
We planned specifically for worst-case scenarios: If a guest's available paths are completely cut off (both the window and hallway are flagged as hazardous), the navigator BFS sequence will gracefully return `null`. Instead of failing, the backend will immediately push a `SHELTER IN PLACE` override command to the guest's edge device.

#### Action Card Data Protocol
Our system enforces "Zero-Cognitive Load" formatting directly from the edge hub. The device gets told exactly how to look, feel, and sound. Example push:

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

---

## Technical Walkthrough & Verification

### Endpoints
The `server.js` exposes core functionality:
- **`GET /api/v1/status`**: The digital twin (Returns building structure, hazards, and occupants).
- **`POST /api/v1/trigger`**: IoT Sensor override (Injects hazards and instantly multicasts to groups).
- **`POST /api/v1/guest/report`**: User self-reporting mechanisms ("Trapped" or "Safe").
- **`POST /api/v1/simulate/fire-start`**: Development Simulator (Instantly injects a Fire at 302 and Smoke at H3 and broadcasts the recalculation).

### Verification
A full automated testing suite (`tests/crisis_flow.test.js`) runs validation endpoints confirming the mathematical rigour backing this structural model is accurate: 

```bash
> jest

PASS tests/crisis_flow.test.js
  Crisis Flow Simulation
    √ Input (Fire at H3) -> Output (Route bypassing H3)
    √ Guest in 101 can evacuate when H3 is on fire 
    √ Simulate endpoint triggers multiple hazards

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### Running Locally
1. `npm install`
2. Run tests to verify the core algorithms: `npm run test`
3. Start the Edge Hub engine: `npm run start` 

The Edge Hub simulator works reliably by mapping input triggers (Hazards) mapping to outputs (Action cards).
