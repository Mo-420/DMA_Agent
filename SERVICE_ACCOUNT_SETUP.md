## Quick Service Account Setup

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Create service account named 'DMA Bot'
3. Create JSON key and download it
4. Share your DMA manual with the service account email
5. Add this to .env:

GOOGLE_SERVICE_ACCOUNT_PATH=/path/to/downloaded/key.json

6. Restart server: npm run dev

This bypasses OAuth issues completely!
