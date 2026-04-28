const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const buildingData = require('./data/mock_building.json');
const { getGlobalState, updateHazard, updateOccupant, resetState, purgeIncidentData } = require('./data/state');
const { getActionCardForNode } = require('./logic/navigator');
const { verifyEvent } = require('./logic/ai_engine');
const { verifyIncidentCode, verifyTacticalToken } = require('./logic/security');

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Namespaces
const guestNsp = io.of('/guest');
const staffNsp = io.of('/staff');
const responderNsp = io.of('/responder');

// Throttling Layer
const lastUpdateSent = {}; // Tracks last time an update was sent to a guest

const broadcastActionCards = () => {
  const state = getGlobalState();
  const occupants = state.occupants;
  const now = Date.now();
  
  for (const [socketId, occupant] of Object.entries(occupants)) {
    if (occupant.role === 'guest' && occupant.room) {
      // Throttle to max 1 update per 2500ms
      if (!lastUpdateSent[socketId] || now - lastUpdateSent[socketId] > 2500) {
        const actionCard = getActionCardForNode(occupant.room, buildingData);
        guestNsp.to(socketId).volatile.emit('action_card', actionCard);
        lastUpdateSent[socketId] = now;
      }
    }
  }

  // Also broadcast the tactical heatmap to responders
  responderNsp.to('room:tactical_feed').volatile.emit('heatmap_update', state);
};

// ------------------------------------------
// REST Endpoints
// ------------------------------------------

// 1. Status - Returns the current "Global State"
app.get('/api/v1/status', (req, res) => {
  res.json(getGlobalState());
});

// 2. Triage - Injects a hazard into the system
app.post('/api/v1/trigger', async (req, res) => {
  const { type, location, intensity } = req.body;
  if (!type || !location) {
    return res.status(400).json({ error: 'Missing type or location' });
  }

  // Heuristic AI Triage
  const triageResult = await verifyEvent(req.body);

  if (triageResult.verified) {
    const newHazard = updateHazard(type, location, intensity);
    broadcastActionCards();
    return res.json({ message: 'Verified Crisis. Full Multicast triggered.', hazard: newHazard, triage: triageResult });
  } else if (triageResult.advisory) {
    staffNsp.emit('advisory_alert', { type, location, intensity, message: 'Potential hazard detected. Please investigate.' });
    return res.json({ message: 'Advisory issued to staff.', triage: triageResult });
  } else {
    return res.json({ message: 'False Positive ignored.', triage: triageResult });
  }
});

// 3. Allow guest to update status
app.post('/api/v1/guest/report', (req, res) => {
  const { socketId, status } = req.body;
  if (!socketId) return res.status(400).json({ error: 'socketId required' });
  
  updateOccupant(socketId, { status });
  res.json({ message: 'Status updated' });
});

// 4. Tactical Access
app.post('/api/v1/tactical/login', (req, res) => {
  const { code } = req.body;
  const result = verifyIncidentCode(code);
  if (result.success) {
    res.json({ token: result.token });
  } else {
    res.status(401).json({ error: 'Invalid Tactical Code' });
  }
});

// 5. Simulator Mode
app.post('/api/v1/simulate/fire-start', (req, res) => {
  updateHazard('Fire', '302', 100);
  updateHazard('Smoke', 'H3', 90);
  broadcastActionCards();
  res.json({ message: "Simulation executed. Hazards injected at 302 and H3." });
});

// 6. All-Clear
app.post('/api/v1/clear', (req, res) => {
  purgeIncidentData();
  guestNsp.emit('all_clear', { message: 'The incident has been resolved.' });
  res.json({ message: 'Incident data purged. All-clear broadcasted.' });
});

// ------------------------------------------
// WebSockets
// ------------------------------------------

guestNsp.on('connection', (socket) => {
  console.log(`New GUEST connected: ${socket.id}`);
  
  socket.on('register', (data) => {
    const { room, role = 'guest' } = data;
    updateOccupant(socket.id, { room, role });
    console.log(`Registered ${role} in ${room}`);
    
    const actionCard = getActionCardForNode(room, buildingData);
    socket.emit('action_card', actionCard);
  });

  socket.on('disconnect', () => {
    const { removeOccupant } = require('./data/state');
    removeOccupant(socket.id);
    delete lastUpdateSent[socket.id];
  });
});

staffNsp.on('connection', (socket) => {
  console.log(`New STAFF connected: ${socket.id}`);
});

responderNsp.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const authResult = verifyTacticalToken(token);
  if (authResult.valid) {
    next();
  } else {
    next(new Error('Authentication error'));
  }
});

responderNsp.on('connection', (socket) => {
  console.log(`New RESPONDER connected: ${socket.id}`);
  socket.join('room:tactical_feed');
  socket.emit('heatmap_update', getGlobalState());
});

io.on('connection', (socket) => {
  console.log(`Connected to default namespace: ${socket.id} - please use /guest, /staff, or /responder`);
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Edge Hub Prototype running on port ${PORT}`);
  });
}

module.exports = { app, server, io, guestNsp, staffNsp, responderNsp };
