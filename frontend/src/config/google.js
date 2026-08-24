/** Google OAuth client ID — must match backend GOOGLE_CLIENT_ID */
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

export const isGoogleOAuthConfigured = () => Boolean(GOOGLE_CLIENT_ID);
