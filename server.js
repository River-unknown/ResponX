const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const buildingData = require('./data/mock_building.json');
const { getGlobalState, updateHazard, updateOccupant, resetState } = require('./data/state');
const { getActionCardForNode } = require('./logic/navigator');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// A helper to multicast action cards to all occupants based on their locations
const broadcastActionCards = () => {
  const state = getGlobalState();
  const occupants = state.occupants;
  
  for (const [socketId, occupant] of Object.entries(occupants)) {
    // Only process guests for this prototype scope
    if (occupant.role === 'guest' && occupant.room) {
      const actionCard = getActionCardForNode(occupant.room, buildingData);
      io.to(socketId).emit('action_card', actionCard);
    }
  }
};

// ------------------------------------------
// REST Endpoints
// ------------------------------------------

// 1. Status - Returns the current "Global State"
app.get('/api/v1/status', (req, res) => {
  res.json(getGlobalState());
});

// 2. Triage - Injects a hazard into the system
app.post('/api/v1/trigger', (req, res) => {
  const { type, location, intensity } = req.body;
  if (!type || !location) {
    return res.status(400).json({ error: 'Missing type or location' });
  }

  const newHazard = updateHazard(type, location, intensity);
  
  // Need to recalculate and multicast
  broadcastActionCards();

  res.json({ message: 'Hazard logged. Multicast triggered.', hazard: newHazard });
});

// 3. Allow guest to update status
app.post('/api/v1/guest/report', (req, res) => {
  const { socketId, status } = req.body;
  if (!socketId) return res.status(400).json({ error: 'socketId required' });
  
  updateOccupant(socketId, { status });
  res.json({ message: 'Status updated' });
});

// 4. Tactical Access
app.get('/api/v1/tactical/access', (req, res) => {
  const state = getGlobalState();
  res.json({
    timestamp: Date.now(),
    system: "LIVE",
    data: state
  });
});

// 5. Simulator Mode
app.post('/api/v1/simulate/fire-start', (req, res) => {
  // Set Room 302 and Floor 3 Hallway to "Smoke Filled" or "Fire"
  updateHazard('Fire', '302', 100);
  updateHazard('Smoke', 'H3', 90);

  broadcastActionCards();

  res.json({ message: "Simulation executed. Hazards injected at 302 and H3." });
});

// ------------------------------------------
// WebSockets
// ------------------------------------------
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  // Register client as an occupant. For prototype, expecting query params or initial emit.
  // We'll mimic an initial registration payload
  socket.on('register', (data) => {
    const { guestId, room, role = 'guest' } = data;
    updateOccupant(socket.id, { guestId, room, role, status: 'Safe' });
    console.log(`Registered ${role} in ${room}`);
    
    // Immediately send them their local action card
    const actionCard = getActionCardForNode(room, buildingData);
    socket.emit('action_card', actionCard);
  });

  socket.on('disconnect', () => {
    const { removeOccupant } = require('./data/state');
    removeOccupant(socket.id);
    console.log(`Client disconnected: ${socket.id}`);
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Edge Hub Prototype running on port ${PORT}`);
  });
}

module.exports = { app, server, io }; // export for testing
