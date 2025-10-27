# Connect Your Custom GPT to Automated Testing

## Step 1: Get Your Assistant ID

Option A - Using OpenAI Platform:
1. Go to: https://platform.openai.com/assistants
2. Find your "DMA Manual GPT" assistant
3. Copy the Assistant ID (looks like: asst_xxxxxxxxxxxxx)

Option B - Via API:
1. List all your assistants:
   ```bash
   curl https://api.openai.com/v1/assistants \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```
2. Find the ID of your "DMA Manual GPT"

## Step 2: Update .env File

Add this line to your .env file:
```env
CUSTOM_GPT_ASSISTANT_ID=asst_your_assistant_id_here
```

## Step 3: Run the Test

```bash
npm run test:discord-quality
```

The test will now compare your Discord Bot against your actual custom GPT!

---

## Alternative: Create Matching Assistant

If you want me to create an assistant that matches your GPT's configuration,
tell me and I can create it with the same instructions and knowledge base.
