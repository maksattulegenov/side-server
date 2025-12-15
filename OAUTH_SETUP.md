# OAuth 2.0 Setup Instructions

Since service accounts can't upload to regular Google Drive folders, we need to use OAuth 2.0 to authenticate with your personal Google account.

## Step 1: Create OAuth 2.0 Credentials

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/apis/credentials?project=side-server-481017

2. **Click "Create Credentials" → "OAuth client ID"**

3. **If prompted, configure the OAuth consent screen:**
   - User Type: **External**
   - App name: `Side Server`
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Scopes: Click **Add or Remove Scopes**
     - Search for "Google Drive API"
     - Select: `https://www.googleapis.com/auth/drive.file`
   - Click **Save and Continue**
   - Test users: Add your Gmail address
   - Click **Save and Continue**

4. **Create OAuth Client ID:**
   - Application type: **Web application**
   - Name: `Side Server Web Client`
   - Authorized redirect URIs:
     - For Railway: `https://side-server-production.up.railway.app/oauth2callback`
     - For local testing: `http://localhost:3000/oauth2callback`
   - Click **Create**

5. **Copy the credentials:**
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `xxxxx`

## Step 2: Add to Railway Environment Variables

Add these three variables in Railway:

1. **OAUTH_CLIENT_ID**
   - Value: Your Client ID from above

2. **OAUTH_CLIENT_SECRET**
   - Value: Your Client Secret from above

3. **OAUTH_REDIRECT_URI**
   - Value: `https://side-server-production.up.railway.app/oauth2callback`

## Step 3: Authenticate (One Time)

1. **Wait for Railway to redeploy**

2. **Visit:** `https://side-server-production.up.railway.app/auth`

3. **Sign in with your Google account**

4. **Copy the REFRESH_TOKEN** shown on the success page

5. **Add to Railway variables:**
   - Variable: `REFRESH_TOKEN`
   - Value: The token you copied

6. **Railway will redeploy again**

## Step 4: Test Upload

After the final redeploy, try uploading an image. It will now upload to **your personal Google Drive**!

## Optional: Specify Upload Folder

To upload to a specific folder in your Drive:

1. Create a folder in your Google Drive
2. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/YOUR_FOLDER_ID`
3. Add to Railway:
   - Variable: `GOOGLE_DRIVE_FOLDER_ID`
   - Value: `YOUR_FOLDER_ID` (just the ID, not the full URL)

---

**Note:** You can now remove the `GOOGLE_SERVICE_ACCOUNT` variable from Railway if you want, as we're using OAuth instead.
