# Cloud Run Jobs Setup Guide (Serverless Approach)

This guide shows how to deploy the patent search worker using **Cloud Run Jobs** - a serverless, cost-effective solution that only runs (and charges) when executing searches.

## 🎯 Why Cloud Run Jobs?

**Advantages over GCE VMs:**
- ✅ **Pay only for execution time** (per second billing)
- ✅ **No idle costs** - no VM running 24/7
- ✅ **Auto-scaling** - handles multiple searches concurrently
- ✅ **No server management** - fully serverless
- ✅ **Built-in logging** and monitoring
- ✅ **Simpler architecture** - no SSH, no VM maintenance

**Cost Comparison:**
- **GCE VM:** ~$24/month (even when idle)
- **Cloud Run Jobs:** ~$0.10 per search execution

---

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **APIs to Enable:**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable storage.googleapis.com
   ```

3. **Get API Keys:**
   - **Google Gemini:** https://ai.google.dev/
   - **USPTO:** https://developer.uspto.gov/

---

## Step 1: Create Cloud Storage Bucket

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export BUCKET_NAME="patent-search-results"

# Set project
gcloud config set project $PROJECT_ID

# Create bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l us-central1 gs://$BUCKET_NAME/

# Optional: Set lifecycle rule to auto-delete old files
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://$BUCKET_NAME/
rm lifecycle.json
```

---

## Step 2: Create Service Accounts

### 2.1 Service Account for the Job (The "Doer")

This account will be used by the Cloud Run Job to access Cloud Storage.

```bash
export JOB_SERVICE_ACCOUNT="patent-job-runner"

# Create service account
gcloud iam service-accounts create $JOB_SERVICE_ACCOUNT \
  --display-name="Patent Search Job Runner" \
  --project=$PROJECT_ID

# Grant permission to write to Cloud Storage
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$JOB_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Save the email for later
export JOB_SERVICE_ACCOUNT_EMAIL="$JOB_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
echo "Job Service Account: $JOB_SERVICE_ACCOUNT_EMAIL"
```

### 2.2 Service Account for Your App (The "Caller")

This is for your Next.js app running on Vercel to trigger the jobs.

```bash
export APP_SERVICE_ACCOUNT="patent-app-vercel"

# Create service account
gcloud iam service-accounts create $APP_SERVICE_ACCOUNT \
  --display-name="Patent App (Vercel)" \
  --project=$PROJECT_ID

# Grant permission to run Cloud Run Jobs
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$APP_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.developer"

# Grant permission to act as the job service account
gcloud iam service-accounts add-iam-policy-binding $JOB_SERVICE_ACCOUNT_EMAIL \
  --member="serviceAccount:$APP_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Download credentials for Vercel
gcloud iam service-accounts keys create credentials.json \
  --iam-account=$APP_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com

echo "Credentials saved to credentials.json - use this for GOOGLE_CLOUD_CREDENTIALS in Vercel"
```

---

## Step 3: Build and Push Container Image

### 3.1 Create Artifact Registry Repository

```bash
# Create repository for Docker images
gcloud artifacts repositories create patent-search-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Repository for patent search worker images" \
  --project=$PROJECT_ID
```

### 3.2 Prepare the Worker Files

In your project root, you should have:
- `get_patents.js` ✅ (already created)
- `Dockerfile` ✅ (already created)
- `.dockerignore` ✅ (already created)
- `worker-package.json` ✅ (already created)

Copy the worker package.json:
```bash
cp worker-package.json package.json
```

### 3.3 Build and Push Using Cloud Build

```bash
# Build and push the container image
gcloud builds submit . --tag "us-central1-docker.pkg.dev/$PROJECT_ID/patent-search-repo/patent-worker:latest"
```

This will:
1. Build your Docker image in the cloud
2. Push it to Artifact Registry
3. Take about 2-3 minutes

---

## Step 4: Create the Cloud Run Job

Now create the actual job configuration:

```bash
export USPTO_API_KEY="your_uspto_api_key_here"

gcloud run jobs create patent-search-job \
  --image "us-central1-docker.pkg.dev/$PROJECT_ID/patent-search-repo/patent-worker:latest" \
  --region us-central1 \
  --service-account $JOB_SERVICE_ACCOUNT_EMAIL \
  --set-env-vars="USPTO_API_KEY=$USPTO_API_KEY,GOOGLE_CLOUD_STORAGE_BUCKET=$BUCKET_NAME" \
  --cpu 1 \
  --memory 2Gi \
  --max-retries 1 \
  --task-timeout 30m \
  --project=$PROJECT_ID
```

**Parameters explained:**
- `--cpu 1` - 1 CPU core (sufficient for most searches)
- `--memory 2Gi` - 2GB RAM
- `--max-retries 1` - Retry once if it fails
- `--task-timeout 30m` - Maximum 30 minutes per search
- Environment variables are set here (static config)

---

## Step 5: Test the Job Locally (Optional)

Before deploying to Vercel, test the job manually:

```bash
# Test execution with sample search terms
gcloud run jobs execute patent-search-job \
  --region us-central1 \
  --update-env-vars="JOB_ID=test-123,SEARCH_TERMS_JSON={\"deviceTerms\":[\"sensor\"],\"technologyTerms\":[\"IoT\"],\"subjectTerms\":[\"healthcare\"]}" \
  --project=$PROJECT_ID
```

Check the logs:
```bash
gcloud run jobs executions list --job patent-search-job --region us-central1
gcloud run jobs executions describe <EXECUTION_ID> --job patent-search-job --region us-central1
```

Check if CSV was created:
```bash
gsutil ls gs://$BUCKET_NAME/
```

---

## Step 6: Configure Environment Variables

### 6.1 Update `.env.local` for Local Development

```env
GEMINI_API_KEY=your_gemini_api_key
USPTO_API_KEY=your_uspto_api_key
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
CLOUD_RUN_JOB_NAME=patent-search-job
GOOGLE_CLOUD_STORAGE_BUCKET=patent-search-results
```

### 6.2 Configure Vercel Environment Variables

In your Vercel project settings, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `GEMINI_API_KEY` | Your Gemini API key | From ai.google.dev |
| `USPTO_API_KEY` | Your USPTO API key | From developer.uspto.gov |
| `GOOGLE_CLOUD_PROJECT_ID` | your-project-id | Your GCP project ID |
| `GOOGLE_CLOUD_LOCATION` | us-central1 | Region where job runs |
| `CLOUD_RUN_JOB_NAME` | patent-search-job | Name of the Cloud Run Job |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | patent-search-results | Your bucket name |
| `GOOGLE_CLOUD_CREDENTIALS` | {...} | **Entire contents of credentials.json** |

**For GOOGLE_CLOUD_CREDENTIALS:**
1. Open `credentials.json`
2. Copy the ENTIRE JSON object (everything from `{` to `}`)
3. Paste as a single line in Vercel

---

## Step 7: Deploy to Vercel

```bash
# If not already done, install Vercel CLI
npm install -g vercel

# Push code to GitHub first
git add .
git commit -m "Add Cloud Run Jobs integration"
git push origin main

# Deploy to Vercel
vercel --prod
```

Or deploy through the Vercel dashboard by connecting your GitHub repository.

---

## Step 8: Test End-to-End

1. **Open your deployed app**
2. **Generate a patent description** using AI
3. **Watch terms extract** automatically
4. **Click "Begin Prior Art Search"**
5. **Monitor on status page** - it polls every 30 seconds
6. **Download CSV** when complete

---

## Monitoring & Debugging

### View Job Executions

```bash
# List all executions
gcloud run jobs executions list \
  --job patent-search-job \
  --region us-central1 \
  --limit 10

# View logs for a specific execution
gcloud run jobs executions describe <EXECUTION_ID> \
  --job patent-search-job \
  --region us-central1

# Stream logs
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=patent-search-job" \
  --project=$PROJECT_ID \
  --limit 50 \
  --format json
```

### Check Cloud Storage

```bash
# List all result files
gsutil ls -lh gs://$BUCKET_NAME/

# Download a specific report
gsutil cp gs://$BUCKET_NAME/<job-id>_report.csv ./
```

### Common Issues

**Issue:** Job fails to start
- **Check:** Service account permissions
- **Fix:** Re-run Step 2 IAM commands

**Issue:** Job times out
- **Check:** USPTO API rate limits
- **Fix:** Increase `--task-timeout` or reduce search scope

**Issue:** Can't download CSV
- **Check:** Bucket permissions and signed URL generation
- **Fix:** Verify service account has `storage.objectAdmin` role

---

## Cost Optimization

### Estimated Costs (us-central1 pricing)

**Per Search:**
- CPU: $0.000024/second × 1 CPU × ~300 seconds = $0.007
- Memory: $0.0000025/second × 2GB × ~300 seconds = $0.002
- **Total per search:** ~$0.01

**Monthly (100 searches):**
- Compute: ~$1.00
- Storage: ~$0.50
- **Total:** ~$1.50/month

**Compare to GCE VM:**
- e2-medium: $24.27/month (always running)
- **Savings:** ~95% cost reduction!

### Tips to Reduce Costs

1. **Use smaller CPU/memory** if searches are simple
   ```bash
   gcloud run jobs update patent-search-job \
     --cpu 0.5 \
     --memory 1Gi \
     --region us-central1
   ```

2. **Set shorter timeouts** for faster searches
   ```bash
   gcloud run jobs update patent-search-job \
     --task-timeout 15m \
     --region us-central1
   ```

3. **Enable lifecycle policies** on Cloud Storage (already done in Step 1)

---

## Updating the Worker

When you make changes to `get_patents.js`:

```bash
# Rebuild and push new image
gcloud builds submit . --tag "us-central1-docker.pkg.dev/$PROJECT_ID/patent-search-repo/patent-worker:latest"

# Update the job to use new image
gcloud run jobs update patent-search-job \
  --image "us-central1-docker.pkg.dev/$PROJECT_ID/patent-search-repo/patent-worker:latest" \
  --region us-central1
```

---

## Cleanup (Optional)

To remove all resources:

```bash
# Delete the job
gcloud run jobs delete patent-search-job --region us-central1

# Delete the container image
gcloud artifacts docker images delete \
  us-central1-docker.pkg.dev/$PROJECT_ID/patent-search-repo/patent-worker:latest

# Delete the repository
gcloud artifacts repositories delete patent-search-repo --location us-central1

# Delete the bucket
gsutil rm -r gs://$BUCKET_NAME/

# Delete service accounts
gcloud iam service-accounts delete $JOB_SERVICE_ACCOUNT_EMAIL
gcloud iam service-accounts delete $APP_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com
```

---

## Next Steps

✅ Job is deployed and ready  
✅ Vercel app can trigger searches  
✅ Results are saved to Cloud Storage  
✅ Status page monitors progress  
✅ CSV reports are downloadable  

**Your patent search tool is now fully serverless!** 🎉
