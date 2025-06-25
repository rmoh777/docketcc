# Quick Fix: Google OAuth Redirect URI Mismatch

## Problem
Getting "Error 400: redirect_uri_mismatch" when trying to sign in with Google.

## Root Cause
The development server is running on `http://localhost:5176/` but Google OAuth is configured for a different port.

## Solution

### Step 1: Update Google OAuth Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find your OAuth 2.0 Client ID
4. Click **Edit**
5. In **Authorized redirect URIs**, add these URLs:
   ```
   http://localhost:5173/auth/callback/google
   http://localhost:5174/auth/callback/google
   http://localhost:5175/auth/callback/google
   http://localhost:5176/auth/callback/google
   http://localhost:5177/auth/callback/google
   ```
6. Click **Save**

### Step 2: Restart Development Server
```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 3: Test Authentication
1. Go to `http://localhost:5176/` (or whatever port Vite shows)
2. Click "Sign in with Google"
3. Should now work without redirect URI mismatch

## Why This Happens
- Vite dev server automatically finds available ports (5173, 5174, 5175, 5176, etc.)
- Google OAuth requires exact URL matches
- Adding multiple redirect URIs covers all common dev ports

## For Production
Make sure to add your production domain:
```
https://yourdomain.com/auth/callback/google
```

## Alternative: Force Specific Port
If you prefer to use a consistent port, add to `package.json`:
```json
{
  "scripts": {
    "dev": "vite dev --port 5173"
  }
}
``` 