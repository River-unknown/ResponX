const { getBlockedNodes } = require('../data/state');

// Returns the shortest unblocked path (as an array of node IDs) or null if no path.
const findShortestSafePath = (startNodeId, buildingData, blockedNodes = []) => {
  const { nodes, adjacencies } = buildingData;
  if (!nodes[startNodeId]) return null;
  if (blockedNodes.includes(startNodeId)) return null; 

  const queue = [[startNodeId]]; // Array of paths
  const visited = new Set();
  visited.add(startNodeId);

  while (queue.length > 0) {
    const path = queue.shift();
    const currentNode = path[path.length - 1];

    // Is it an exit?
    if (nodes[currentNode] && nodes[currentNode].type === 'exit') {
      return path;
    }

    const neighbors = adjacencies[currentNode] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && !blockedNodes.includes(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  // All paths are blocked or no exit reachable
  return null;
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
