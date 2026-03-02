# Where to Put Gmail & Calendar API Credentials

Put your **Google OAuth credentials** in the **backend** `.env` file so they stay server-side and are never exposed to the browser.

**If you see `unauthorized_client` in the terminal:** Your refresh token was created with the wrong OAuth client (e.g. the Playground’s default). You must create a new refresh token using **your** Client ID and Secret in the Playground — see step 3 below.

## 1. Location

**File:** `backend/.env`

Add these variables (see step 2 for how to get them):

```env
# Google (Gmail + Calendar) – OAuth 2.0
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

- **GOOGLE_CLIENT_ID** and **GOOGLE_CLIENT_SECRET**: from Google Cloud Console (OAuth 2.0 Client).
- **GOOGLE_REFRESH_TOKEN**: from a one-time OAuth flow for your account (e.g. govindkushwaham6263@gmail.com).

The same credentials are used for **Gmail**, **Calendar**, and **Tasks**.

## 2. How to get the values

1. **Google Cloud Console**  
   - Go to [Google Cloud Console](https://console.cloud.google.com/) → your project (or create one).
   - **APIs & Services** → **Library** → enable **Gmail API**, **Google Calendar API**, and **Google Tasks API**.

2. **OAuth client**  
   - **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
   - Application type: **Desktop app** (or **Web application** if you add redirect URI).
   - Copy **Client ID** → `GOOGLE_CLIENT_ID` and **Client secret** → `GOOGLE_CLIENT_SECRET`.

3. **Refresh token (one-time)** — **Important: use YOUR app’s credentials in the Playground**  
   If you get `unauthorized_client` when the app runs, the refresh token was created with the Playground’s client, not yours. Do this:
   - Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
   - Click the **gear (⚙️)** next to “Step 1” → check **“Use your own OAuth credentials”**.
   - Enter your **OAuth Client ID** and **OAuth Client secret** (the same ones you put in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`).
   - In Google Cloud Console → **APIs & Services** → **Credentials** → your OAuth 2.0 Client → add this to **Authorized redirect URIs**:  
     `https://developers.google.com/oauthplayground`  
     Save. (You can remove it later if you want.)
   - Back in the Playground, add these scopes and authorize:
     - Gmail: `https://www.googleapis.com/auth/gmail.readonly`
     - Calendar: `https://www.googleapis.com/auth/calendar.readonly`
     - Tasks: `https://www.googleapis.com/auth/tasks.readonly`
   - Click “Authorize APIs”, sign in with your Google account, then “Exchange authorization code for tokens”.
   - Copy the **Refresh token** → `GOOGLE_REFRESH_TOKEN` in `backend/.env`.
   - Restart the backend. The token must be created with **your** Client ID/secret or you will see `unauthorized_client`.

4. **Paste into `backend/.env`**  
   - Save the file and restart the backend. The app will use these to fetch Gmail and Calendar data.

## 3. Root `.env.example`

The root `.env.example` (and `backend/.env.example`) list these variable names so you know what to add; never commit real values.
