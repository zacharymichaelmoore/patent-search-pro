# Environment Configuration Guide

## Overview

This application requires different environment variables for local development vs. production deployment. This guide explains how to configure them properly.

## Local Development (.env.local)

For local development, create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual values:

```env
GEMINI_API_KEY=AIzaSy...your_actual_key
GOOGLE_CLOUD_PROJECT_ID=my-project-12345
GOOGLE_CLOUD_STORAGE_BUCKET=my-patent-search-bucket
```

**Important:** 
- `.env.local` is in `.gitignore` and will NEVER be committed to Git
- This file only works in local development
- You'll need to get your own Google Gemini API key from https://ai.google.dev/

## Production Deployment (Vercel)

### Why .env.local Doesn't Work in Production

The `.env.local` file is:
- Only loaded during local development
- Never deployed to Vercel
- Intentionally excluded from version control

For production, you must configure environment variables in the Vercel dashboard.

### Setting Up Vercel Environment Variables

1. **Go to Your Vercel Project**
   - Navigate to your project on vercel.com
   - Click on "Settings" tab
   - Click on "Environment Variables" in the sidebar

2. **Add Each Variable**

   Add these variables one by one:

   | Variable Name | Example Value | When to Use |
   |--------------|---------------|-------------|
   | `GEMINI_API_KEY` | `AIzaSy...` | All environments |
   | `GOOGLE_CLOUD_PROJECT_ID` | `my-project-12345` | Production only |
   | `GOOGLE_CLOUD_STORAGE_BUCKET` | `my-bucket` | Production only |
   | `GOOGLE_CLOUD_CREDENTIALS` | `{"type":"service_account",...}` | Production only |

3. **Environment Selection**
   - **Production:** Variables used when deploying from main branch
   - **Preview:** Variables used for preview deployments
   - **Development:** Variables used with `vercel dev` command

   For most cases, set variables for "Production" and "Preview".

## Google Cloud Credentials (Production Only)

### Creating a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "IAM & Admin" > "Service Accounts"
3. Click "Create Service Account"
4. Give it a name like "patent-search-vercel"
5. Grant permissions:
   - Compute Instance Admin
   - Storage Object Admin
6. Click "Create Key" and download the JSON file

### Adding Credentials to Vercel

The `GOOGLE_CLOUD_CREDENTIALS` variable needs special handling:

1. Open the downloaded JSON file
2. Copy the ENTIRE contents (it should look like this):
   ```json
   {
     "type": "service_account",
     "project_id": "your-project",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     "client_id": "...",
     ...
   }
   ```
3. In Vercel, paste this entire JSON object as the value for `GOOGLE_CLOUD_CREDENTIALS`
4. Make sure it's valid JSON (no extra quotes around it)

### Using Credentials in Code

In your API routes, access the credentials like this:

```typescript
const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}');
```

## Environment Variable Best Practices

### ✅ DO

- Use `.env.example` to document required variables
- Keep `.env.local` in `.gitignore`
- Use descriptive variable names
- Set production secrets in Vercel dashboard
- Test with `vercel env pull` before deploying

### ❌ DON'T

- Commit `.env.local` to Git
- Share API keys in code or pull requests
- Use the same keys for dev and production
- Hardcode secrets in your code

## Verifying Your Setup

### Local Development

Run this command to check if your local variables are loaded:

```bash
npm run dev
```

Then in your browser console, check if the API routes work without errors.

### Production

After deploying to Vercel:

1. Check the deployment logs for any environment variable errors
2. Visit your production URL
3. Open browser DevTools and test API endpoints
4. Check Vercel function logs for any missing variable errors

## Troubleshooting

### "GEMINI_API_KEY is not defined"

**Local:** Make sure `.env.local` exists and contains the key
**Production:** Add the variable in Vercel settings

### "Invalid credentials"

- Check that the JSON is valid (no syntax errors)
- Ensure the service account has proper permissions
- Verify the credentials are for the correct GCP project

### "Cannot find module" errors

This usually means environment variables aren't being loaded. Check:
1. Variable names match exactly (case-sensitive)
2. No trailing spaces in variable names
3. Values are properly quoted if they contain spaces

## Testing Environment Variables

Create a simple test API route to verify your setup:

```typescript
// app/api/test-env/route.ts
export async function GET() {
  return Response.json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
    hasBucket: !!process.env.GOOGLE_CLOUD_STORAGE_BUCKET,
    hasCredentials: !!process.env.GOOGLE_CLOUD_CREDENTIALS,
  });
}
```

Visit `/api/test-env` to see which variables are loaded (without exposing the actual values).
