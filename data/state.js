const buildingData = require('./mock_building.json');

// The "Global State" (Digital Twin)
const state = {
  building: buildingData,
  hazards: [],       // Array of active hazards
  occupants: {},     // Array of active clients mapping
};

const getGlobalState = () => state;

const updateHazard = (type, location, intensity) => {
  const newHazard = {
    id: `hz_${Date.now()}`,
    type,
    location,
    intensity
  };
  state.hazards.push(newHazard);
  return newHazard;
};

const getBlockedNodes = () => {
  // Any node with an active hazard is blocked.
  return state.hazards.map(h => h.location);
};

const generateGhostId = (room) => {
  let floor = '00';
  if (room && typeof room === 'string') {
    const match = room.match(/\d+/);
    if (match) {
      let fNum = Math.floor(parseInt(match[0]) / 100);
      floor = fNum.toString().padStart(2, '0');
    }
  }
  const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `G-${floor}-${randomChars}`;
};

const updateOccupant = (socketId, occupantData) => {
  // Scrub incoming PII, apply Transient Identity if not set
  if (!state.occupants[socketId]) {
    state.occupants[socketId] = { 
      ghostId: generateGhostId(occupantData.room),
      room: occupantData.room,
      role: occupantData.role,
      status: 'Safe'
    };
  } else {
    // Explicit allow-list for non-PII field updates
    const allowed = ['room', 'status', 'role'];
    for (const key of allowed) {
      if (key in occupantData && occupantData[key] !== undefined) {
        state.occupants[socketId][key] = occupantData[key];
      }
    }
  }
};

const removeOccupant = (socketId) => {
  delete state.occupants[socketId];
};

const purgeIncidentData = () => {
  state.hazards = [];
  // Optionally, we could wipe occupants, but at least clear hazards and sensitive temporary data
  // Since occupants only have Ghost IDs, we just leave them or reset them.
  // For true "All-Clear", we reset state entirely.
  state.occupants = {};
};

// Expose state clearing for testing
const resetState = () => {
  purgeIncidentData();
};

module.exports = {
  state,
  getGlobalState,
  updateHazard,
  getBlockedNodes,
  updateOccupant,
  removeOccupant,
  resetState,
  purgeIncidentData,
  generateGhostId
};
