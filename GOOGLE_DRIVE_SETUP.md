# Alternative: Service Account Setup (Easier)

If OAuth is giving you trouble, try using a Service Account instead:

## Step 1: Create Service Account

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Create Service Account:**
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name: "DMA Bot Service Account"
   - Click "Create and Continue"
   - Skip roles for now, click "Done"

3. **Create Key:**
   - Click on your service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Download the JSON file

## Step 2: Share the Document

1. **Open your DMA manual:**
   - Go to: https://docs.google.com/document/d/1D1gm6kjPGi-7uvdMQT9rt6ES8DpMI7WStv14Tpi8VtI/edit

2. **Share with Service Account:**
   - Click "Share" button
   - Add the service account email (from the JSON file, looks like: `dma-bot-service-account@your-project.iam.gserviceaccount.com`)
   - Give it "Viewer" access
   - Click "Send"

## Step 3: Update Configuration

Add to your `.env` file:
```env
GOOGLE_SERVICE_ACCOUNT_PATH=/path/to/your/service-account-key.json
```

## Step 4: Update Code

I'll modify the GoogleDriveService to use service account authentication instead of OAuth.

---

## Current OAuth Issue

The "Missing authorization code" error means Google isn't redirecting back to our app. This usually happens because:

1. **OAuth Consent Screen not verified** - Google blocks unverified apps
2. **Redirect URI mismatch** - Must be exactly `http://localhost:3004/auth/google/callback`
3. **Test user not added** - Your email must be in the test users list

**Quick fix:** Try the service account approach above - it's more reliable for server-to-server access.


## Troubleshooting: "400 Bad Request" Error

If you see a "400 Bad Request" error when trying to authorize:

1. **Check OAuth Consent Screen:**
   - Go to: https://console.cloud.google.com/apis/credentials/consent
   - Make sure the OAuth consent screen is configured
   - Add your email as a test user (Important!)

2. **Check Redirect URI in Credentials:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click on your OAuth client ID
   - Make sure this URI is listed under "Authorized redirect URIs":
     - `http://localhost:3004/auth/google/callback`

3. **Try these steps:**
   ```bash
   # Make sure server is running
   npm run dev
   
   # Then try visiting this URL again:
   # http://localhost:3004/auth/google
   ```

4. **Alternative: Add more redirect URIs**
   Add these to your OAuth client:
   - `http://localhost:3004/auth/google/callback`
   - `http://127.0.0.1:3004/auth/google/callback`
   - `http://localhost/auth/google/callback`
