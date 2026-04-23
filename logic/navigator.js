const { getBlockedNodes } = require('../data/state');

// Predictive Risk-Aware Routing (Dijkstra's Algorithm)
const findShortestSafePath = (startNodeId, buildingData, blockedNodes = []) => {
  const { nodes, adjacencies } = buildingData;
  if (!nodes[startNodeId]) return null;
  if (blockedNodes.includes(startNodeId)) return null;

  // Calculate Expansion Zones (nodes adjacent to blocked nodes)
  const expansionZones = new Set();
  for (const blocked of blockedNodes) {
    const neighbors = adjacencies[blocked] || [];
    for (const neighbor of neighbors) {
      if (!blockedNodes.includes(neighbor)) {
        expansionZones.add(neighbor);
      }
    }
  }

  // Dijkstra's algorithm setup
  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(nodes));

  for (const node of unvisited) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let current = null;
    let minDistance = Infinity;
    for (const node of unvisited) {
      if (distances[node] < minDistance) {
        current = node;
        minDistance = distances[node];
      }
    }

    // If we can't reach any more nodes or reached target (but we need to find ANY exit)
    if (current === null) break;
    
    // Stop if we reached an exit, wait we want the *closest* exit. 
    // We will just process the whole graph and then pick the reachable exit with the lowest cost.
    unvisited.delete(current);

    const neighbors = adjacencies[current] || [];
    for (const neighbor of neighbors) {
      if (blockedNodes.includes(neighbor)) continue; // Blocked

      // Base cost is 1. If it's an expansion zone, cost is much higher (e.g., 10) to heavily discourage it.
      const cost = expansionZones.has(neighbor) ? 10 : 1;
      const alt = distances[current] + cost;

      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = current;
      }
    }
  }

  // Find the closest exit
  let bestExit = null;
  let bestCost = Infinity;

  for (const nodeId of Object.keys(nodes)) {
    if (nodes[nodeId].type === 'exit' && distances[nodeId] < bestCost) {
      bestExit = nodeId;
      bestCost = distances[nodeId];
    }
  }

  if (bestExit === null) return null; // No exit reachable

  // Reconstruct path
  const path = [];
  let curr = bestExit;
  while (curr !== null) {
    path.unshift(curr);
    curr = previous[curr];
  }

  return path;
};

const getActionCardForNode = (startNodeId, buildingData) => {
  const blockedNodes = getBlockedNodes();
  const path = findShortestSafePath(startNodeId, buildingData, blockedNodes);

  if (path === null) {
    // The "Dead-End" Fail-safe
    return {
      type: "ACTION_CARD_UPDATE",
      payload: {
        severity: "CRITICAL",
        title: "SHELTER IN PLACE",
        instruction: "Seal the door with wet towels. Stay by the window. Help is on the way.",
        visual_cue: "SOLID_RED",
        haptic_pattern: "STEADY_VIBRATE",
        audio_alert: "voice_shelter.mp3"
      }
    };
  }

  // Generate an evacuation card based on the next node
  const nextNodeId = path[1]; // path[0] is startNodeId, path[1] is the next step
  const destNode = buildingData.nodes[nextNodeId];
  
  return {
    type: "ACTION_CARD_UPDATE",
    payload: {
      severity: "CRITICAL",
      title: "EVACUATE NOW",
      instruction: `Exit and proceed to ${destNode ? destNode.label : nextNodeId}.`,
      visual_cue: "FLASHING_RED", 
      haptic_pattern: "RAPID_PULSE",
      audio_alert: "voice_evacuate.mp3",
    }
  };
};

module.exports = {
  findShortestSafePath,
  getActionCardForNode
};
