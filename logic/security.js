const jwt = require('jsonwebtoken');

// Use environment variable or fallback for testing only
const SECRET = process.env.JWT_TACTICAL_SECRET || 'fallback_secret_for_tests';

const verifyIncidentCode = (code) => {
  // Simulated tactical code verification.
  // In reality, this would check a secure responder database.
  if (code === '1122' || code === '9911') {
    const token = jwt.sign(
      { role: 'responder', system: 'sentinel' },
      SECRET,
      { expiresIn: '2h' }
    );
    return { success: true, token };
  }
  return { success: false };
};

const verifyTacticalToken = (token) => {
  try {
    const decoded = jwt.verify(token, SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

module.exports = {
  verifyIncidentCode,
  verifyTacticalToken
};
