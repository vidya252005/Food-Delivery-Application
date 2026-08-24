/** Google OAuth client ID — must match backend GOOGLE_CLIENT_ID */
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

export const isGoogleOAuthConfigured = () => Boolean(GOOGLE_CLIENT_ID);

/** Hint shown when Google popup fails — common dev port mismatch */
export const GOOGLE_OAUTH_ORIGIN_HINT =
  'Add http://localhost:3000 and http://localhost:3001 to Authorized JavaScript origins in Google Cloud Console.';
