# Detailed Walkthrough & Verification

The following outlines how the components work in sequence when a crisis occurs on site.

## 1. The Normal Baseline State
Before an incident occurs, the system sits dormant maintaining standard connections. 
- Connected user devices ping their current `Room ID` via WebSockets.
- The state manager `state.js` maintains a dictionary of all active connections.
- Polling the `GET /api/v1/status` endpoint confirms that there are exactly `0` active Hazards in the building map.

## 2. Triggering an Incident (IoT Injection)
When physical sensors detect anomalies, or a system admin tests a simulation, a payload hits the `POST /api/v1/trigger` or `POST /api/v1/simulate/fire-start` endpoint:
- **Action**: The Express backend logs the hazard (e.g. `Smoke` injected specifically at the `H3` Floor 3 Hallway node). 
- **Effect**: The `H3` node falls into an actively Blocked State.

## 3. Real-Time Re-Routing (BFS Traversal)
The instant the hazard is inserted, the backend triggers a blanket re-evaluation using our `navigator.js`.
It iterates through all connected users:
- **User A (Room 101, Floor 1):** The Breadth-First-Search confirms `H3` is far away and does not block their route to the `Main Lobby Exit`. An Action card indicating `EVACUATE NOW` is generated.
- **User B (Room 302, Floor 3):** Needs to exit through `H3` to reach the Stairwell. Since `H3` is marked as a Hazard, the standard path is dead. Because no further path exists branching outside of their room, BFS returns `null`. 

## 4. The Response Multicast (Zero-Latency Broadcast)
Rather than waiting for users to refresh their apps, the backend takes the newly generated Action Cards and force-pushes them to the phones via Socket.io.
- User A receives an alert on their phone immediately directing them to evacuate safely.
- User B receives the **Dead-End Fail-safe** protocol: `SHELTER IN PLACE`. Instead of telling them to run into a hazard, the card explicitly tells them to seal the door and stay by the window.

## 5. Verification Checks
Through executing `npm test`, our Jest automation confirms this logic is ironclad:

```bash
PASS tests/crisis_flow.test.js
  Crisis Flow Simulation
    √ Input (Fire at H3) -> Output (Route bypassing H3)
    √ Guest in 101 can evacuate when H3 is on fire
    √ Simulate endpoint triggers multiple hazards
```
The checks explicitly enforce that changing states guarantees dynamically correct routing parameters globally.
