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

const updateOccupant = (socketId, occupantData) => {
  state.occupants[socketId] = { ...state.occupants[socketId], ...occupantData };
};

const removeOccupant = (socketId) => {
  delete state.occupants[socketId];
};

// Expose state clearing for testing
const resetState = () => {
  state.hazards = [];
  state.occupants = {};
};

module.exports = {
  state,
  getGlobalState,
  updateHazard,
  getBlockedNodes,
  updateOccupant,
  removeOccupant,
  resetState
};
