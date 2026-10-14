const crypto = require('node:crypto');
function createLoginAttempt(now = Date.now()) {
  return { state: crypto.randomBytes(32).toString('hex'), nonce: crypto.randomBytes(32).toString('hex'), expiresAt: now + 10 * 60 * 1000 };
}
function consumeLoginAttempt(session, state, now = Date.now()) {
  const attempt = session.loginAttempt;
  delete session.loginAttempt;
  if (!attempt || typeof state !== 'string' || state !== attempt.state || attempt.expiresAt <= now) return null;
  return attempt;
}
module.exports = { createLoginAttempt, consumeLoginAttempt };
