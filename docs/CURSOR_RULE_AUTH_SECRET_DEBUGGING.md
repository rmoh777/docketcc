# Cursor Rule: Auth.js Secret Debugging for SvelteKit

## Problem Symptoms
- Server returns 500 Internal Server Error
- Console shows: `[auth][error] MissingSecret: Please define a secret`
- Error occurs in `+layout.server.js` when calling `event.locals.auth()`
- Application fails to start or authenticate users

## Root Cause Analysis

### Most Common Issues (in order of frequency):
1. **Missing quotes around AUTH_SECRET value in .env file**
2. **Missing .env file entirely**  
3. **Incorrect AUTH_SECRET key name in .env**
4. **File naming issues (.env vs .env.local, etc.)**
5. **Import statement typos in hooks.server.js**

## Systematic Debugging Process

### Step 1: Verify .env File Existence and Location
```bash
# Check if .env exists in project root
Test-Path .env

# List all files including hidden ones
Get-ChildItem -Force -Name
```

**Requirements:**
- File must be named exactly `.env` (not `env`, `.env.local`, or `.env.txt`)
- Must be in same directory as `package.json`
- Must be in project root directory

### Step 2: Verify .env File Contents
```bash
# Display .env contents (temporarily for debugging)
Get-Content .env
```

**Required Format:**
```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Auth.js Secret - MUST BE QUOTED!
AUTH_SECRET="your_secret_key_minimum_32_characters_long"

# Development Environment
NODE_ENV=development
```

**Critical Requirements:**
- AUTH_SECRET value MUST be enclosed in quotes: `AUTH_SECRET="value"`
- Secret must be at least 32 characters long
- No spaces around the equals sign
- Key name must be exactly `AUTH_SECRET` (case-sensitive)

### Step 3: Verify Import Statement in hooks.server.js
```javascript
// CORRECT import statement
import { AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';

// CORRECT usage in SvelteKitAuth config
export const { handle } = SvelteKitAuth({
  secret: AUTH_SECRET,  // This line is critical
  // ... other config
});
```

### Step 4: Debug with Temporary Logging
Add temporary debug logging to see what's being imported:

```javascript
// Add AFTER imports in hooks.server.js
console.log("--- DEBUG: AUTH_SECRET value is:", AUTH_SECRET);
console.log("--- DEBUG: Type of AUTH_SECRET is:", typeof AUTH_SECRET);
```

**Expected Output:**
- `AUTH_SECRET value is: your_secret_key_minimum_32_characters_long`
- `Type of AUTH_SECRET is: string`

**Problem Indicators:**
- `AUTH_SECRET value is: undefined` = .env file issue
- `Type of AUTH_SECRET is: undefined` = import/file loading issue

## Quick Fix Commands

### Fix Missing Quotes in .env:
```bash
# Recreate .env with proper format
Remove-Item .env
New-Item -Name ".env" -ItemType File
Add-Content .env "# Auth.js Secret"
Add-Content .env 'AUTH_SECRET="your_32_character_minimum_secret_key_here"'
```

### Generate Secure Secret:
```bash
# Generate random 64-character secret
$secret = [System.Web.Security.Membership]::GeneratePassword(64, 0)
Add-Content .env "AUTH_SECRET=`"$secret`""
```

## File Visibility Issues

### If .env exists but Cursor can't see it:
```bash
# Check if .env is in .gitignore (normal)
Get-Content .gitignore | Select-String "\.env"

# Temporarily create .cursorignore to allow debugging
New-Item -Name ".cursorignore" -ItemType File
Add-Content .cursorignore "# Temporarily allow .env debugging"
Add-Content .cursorignore "# .env"
```

**Remember to delete .cursorignore after debugging for security!**

## Prevention Checklist

### For New Projects:
- [ ] Create `.env` file in project root
- [ ] Use quoted AUTH_SECRET: `AUTH_SECRET="value"`
- [ ] Ensure secret is 32+ characters
- [ ] Add `.env` to `.gitignore`
- [ ] Test auth before deploying

### For Existing Projects:
- [ ] Verify .env file location (same level as package.json)
- [ ] Check AUTH_SECRET has quotes around value
- [ ] Confirm import statement uses exact variable names
- [ ] Test locally before deployment

## Common Mistakes to Avoid

1. **Unquoted secrets**: `AUTH_SECRET=value` ❌ vs `AUTH_SECRET="value"` ✅
2. **Wrong file name**: `.env.local` ❌ vs `.env` ✅
3. **Wrong location**: `src/.env` ❌ vs `./.env` ✅ (project root)
4. **Typos in imports**: `AUTH_SECRT` ❌ vs `AUTH_SECRET` ✅
5. **Missing secret assignment**: Forgot `secret: AUTH_SECRET,` in config

## Deployment Notes

### For Cloudflare Workers/Pages:
```javascript
// hooks.server.js handles both development and production
const env = {
  AUTH_SECRET: platform?.env?.AUTH_SECRET || AUTH_SECRET,
  // ... other env vars
};
```

### Environment Variables Must Be Set In:
- **Development**: `.env` file
- **Production**: Platform environment variables (Vercel, Netlify, Cloudflare, etc.)

## Testing the Fix

1. Restart development server: `npm run dev`
2. Check console for debug output (if logging added)
3. Navigate to auth-protected route
4. Verify no 500 errors in browser/console
5. Remove debug logging after confirmation

## Success Indicators

- ✅ Server starts without MissingSecret errors
- ✅ Debug logs show AUTH_SECRET as string with correct value
- ✅ Auth pages load without 500 errors
- ✅ OAuth flow initiates properly
- ✅ No authentication-related console errors

---

*This rule was created after resolving a production issue where AUTH_SECRET was unquoted in the .env file, causing Auth.js to receive undefined instead of the secret string.* 