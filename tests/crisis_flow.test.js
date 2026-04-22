const request = require('supertest');
const { app, server, io } = require('../server');
const { resetState, getGlobalState } = require('../data/state');

describe('Crisis Flow Simulation', () => {
  beforeEach(() => {
    resetState();
  });

  afterAll((done) => {
    io.close();
    if (server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  test('Input (Fire at H3) -> Output (Route bypassing H3)', async () => {
    // Check initial status
    let res = await request(app).get('/api/v1/status');
    expect(res.body.hazards.length).toBe(0);

    // Register a mock guest directly into state for testing
    const { updateOccupant } = require('../data/state');
    updateOccupant('test_socket_1', { guestId: 'g_1', room: '301', role: 'guest' });

    // Inject hazard at H3
    res = await request(app)
      .post('/api/v1/trigger')
      .send({ type: 'Fire', location: 'H3', intensity: 100 });
    
    expect(res.status).toBe(200);
    expect(getGlobalState().hazards[0].location).toBe('H3');

    // The logic directly.
    // If guest is in 301, and H3 is on fire.
    // Their adjacencies: 301 -> H3. If H3 is blocked, they can't go anywhere.
    // We expect the Action card to be "SHELTER IN PLACE".
    const { getActionCardForNode } = require('../logic/navigator');
    const buildingData = require('../data/mock_building.json');
    const card = getActionCardForNode('301', buildingData);

    expect(card.payload.title).toBe('SHELTER IN PLACE');
    expect(card.payload.visual_cue).toBe('SOLID_RED');
  });

  test('Guest in 101 can evacuate when H3 is on fire', () => {
    const { updateHazard } = require('../data/state');
    updateHazard('Fire', 'H3', 100);

    const { getActionCardForNode } = require('../logic/navigator');
    const buildingData = require('../data/mock_building.json');
    const card = getActionCardForNode('101', buildingData);

    expect(card.payload.title).toBe('EVACUATE NOW');
    // Path should be 101 -> H1
    expect(card.payload.instruction).toContain('North Hallway');
  });

  test('Simulate endpoint triggers multiple hazards', async () => {
    const res = await request(app).post('/api/v1/simulate/fire-start');
    expect(res.body.message).toContain('Simulation executed');
    
    const state = getGlobalState();
    expect(state.hazards.length).toBe(2);
    expect(state.hazards.map(h => h.location)).toContain('302');
    expect(state.hazards.map(h => h.location)).toContain('H3');
  });
});
