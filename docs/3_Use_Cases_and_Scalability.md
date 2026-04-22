# Use Cases & Changing Environments

The backend isn't hardcoded to one specific hotel. Because of the mathematical rigour backing the Adjacency List routing engine, you can adapt this architecture to completely different domains.

## Testing Out the Prototype Locally
You can test the core functionality via your terminal quickly:

1. Start the backend: `npm start` (Runs on Port 3000).
2. Check the initial safe baseline:
   ```bash
   curl http://localhost:3000/api/v1/status
   ```
3. Trigger a simulated fire (at Room 302 / North Hallway) to force an update broadcast:
   ```bash
   curl -X POST http://localhost:3000/api/v1/simulate/fire-start
   ```
4. Verify the global state updated to register the active threats:
   ```bash
   curl http://localhost:3000/api/v1/status
   ```

## Adapting For Different Buildings
To use a different map (like a stadium, shopping mall, or corporate office), you **do not need to rewrite the main logic or the API endpoints**. You only interact with `data/mock_building.json`.

### Building the Layout
You must maintain two JSON sections to define your unique graph map:

**1. `nodes`**
Define all rooms, hallways, seating sections, and stairwells here. Give them specific IDs (e.g., `SEC_102` for an arena seating block). 
```json
{
  "SEC_102": { "type": "room", "label": "Seating Section 102" },
  "EXIT_W": { "type": "exit", "label": "West Exit Gates" } 
}
```
*Requirement*: You must explicitly tag safe zones with `"type": "exit"`. 

**2. `adjacencies`**
Define how people can walk. Ensure your edges are defined as two-way loops. If Section 102 attaches to Concourse A, they both map to each other:
```json
{
  "SEC_102": ["CON_A"],
  "CON_A": ["SEC_102", "EXIT_W"]
}
```

The `navigator.js` algorithm will read this file automatically and determine exactly how to weave crowds out of a stadium bypassing dangerous bottlenecks dynamically.

## Primary Target Verticals
1. **Hospitality (Hotels):** Rerouting guests trapped on higher floors out of alternative stairwells.
2. **Entertainment (Stadiums):** Multicasting crowd-control directions specifically targeting grouped blocks of fans to separate exit thresholds based on physical crush risks.
3. **Enterprise (Corporate Campuses):** Routing specific staff toward specialized rendezvous points during active shooter or hazard events.
