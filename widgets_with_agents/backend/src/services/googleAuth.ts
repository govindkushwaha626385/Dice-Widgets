import { google } from "googleapis";

// Read env lazily so dotenv has run first (ESM imports run before dotenv.config() in app.ts)
function getEnv() {
  return {
    clientId: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
    refreshToken: (process.env.GOOGLE_REFRESH_TOKEN ?? "").trim(),
  };
}

export function isGoogleConfigured(): boolean {
  const { clientId, clientSecret, refreshToken } = getEnv();
  return !!(clientId && clientSecret && refreshToken);
}

export function getOAuth2Client() {
  const { clientId, clientSecret, refreshToken } = getEnv();
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, "urn:ietf:wg:oauth:2.0:oob");
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}
