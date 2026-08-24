const { OAuth2Client } = require('google-auth-library');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const env = require('../config/env');

function getOAuthClient() {
  if (!env.GOOGLE_CLIENT_ID) return null;
  return new OAuth2Client(env.GOOGLE_CLIENT_ID);
}

async function loginWithGoogle(credential) {
  if (!credential || typeof credential !== 'string') {
    throw new AppError('Google credential is required', 400);
  }

  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(
      'Google OAuth is not configured on the server. Set GOOGLE_CLIENT_ID in backend/.env',
      503
    );
  }

  const client = getOAuthClient();
  let payload;

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new AppError('Invalid or expired Google sign-in token', 401);
  }

  if (!payload?.email || !payload.sub) {
    throw new AppError('Invalid Google token', 401);
  }

  let user = await userRepository.findByGoogleId(payload.sub);
  if (!user) {
    const existing = await userRepository.findByEmail(payload.email);
    if (existing) {
      user = await userRepository.linkGoogle(existing.id, {
        googleId: payload.sub,
        avatarUrl: payload.picture,
        name: payload.name || existing.name,
      });
    } else {
      user = await userRepository.createOAuthUser({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        googleId: payload.sub,
        avatarUrl: payload.picture,
      });
    }
  }

  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: user.id, role: 'user' }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
    },
  };
}

module.exports = { loginWithGoogle };
