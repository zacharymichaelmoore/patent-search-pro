# GCE Worker Setup Guide

This guide explains how to set up the Google Compute Engine (GCE) worker VM that will execute patent searches.

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **APIs Enabled:**
   - Compute Engine API
   - Cloud Storage API
3. **USPTO API Key** from https://developer.uspto.gov/

## Step 1: Create a Cloud Storage Bucket

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export BUCKET_NAME="patent-search-results"

# Create bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l us-central1 gs://$BUCKET_NAME/

# Set lifecycle rule to auto-delete files after 30 days (optional)
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
```

## Step 2: Create a Service Account

```bash
export SERVICE_ACCOUNT="patent-search-worker"

# Create service account
gcloud iam service-accounts create $SERVICE_ACCOUNT \
  --display-name="Patent Search Worker" \
  --project=$PROJECT_ID

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Download key (for Vercel environment variables)
gcloud iam service-accounts keys create credentials.json \
  --iam-account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com
```

## Step 3: Create the GCE VM Instance

```bash
export VM_NAME="patent-search-worker"
export ZONE="us-central1-a"

# Create VM with service account
gcloud compute instances create $VM_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-standard \
  --service-account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --tags=patent-search-worker
```

## Step 4: Set Up the Worker Script on the VM

```bash
# SSH into the VM
gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID

# Once inside the VM, run these commands:

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create working directory
sudo mkdir -p /home/patent-search
sudo chown $USER:$USER /home/patent-search
cd /home/patent-search

# Create package.json
cat > package.json <<'EOF'
{
  "name": "patent-search-worker",
  "version": "1.0.0",
  "type": "commonjs",
  "dependencies": {
    "@google-cloud/storage": "^7.17.1"
  }
}
EOF

# Install dependencies
npm install

# Exit SSH
exit
```

## Step 5: Upload the Worker Script

From your local machine:

```bash
# Upload get_patents.js to the VM
gcloud compute scp get_patents.js $VM_NAME:/home/patent-search/ \
  --zone=$ZONE \
  --project=$PROJECT_ID
```

## Step 6: Test the Worker

SSH back into the VM and test:

```bash
gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID

# Test the script
export JOB_ID="test-job-123"
export SEARCH_TERMS='{"deviceTerms":["sensor"],"technologyTerms":["IoT"],"subjectTerms":["healthcare"]}'
export USPTO_API_KEY="your_uspto_api_key"
export GOOGLE_CLOUD_STORAGE_BUCKET="your_bucket_name"

cd /home/patent-search
node get_patents.js

# Check if CSV was created in Cloud Storage
exit
gsutil ls gs://$BUCKET_NAME/
```

## Step 7: Configure Vercel Environment Variables

In your Vercel project settings, add these environment variables:

```
GEMINI_API_KEY=your_gemini_api_key
USPTO_API_KEY=your_uspto_api_key
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=patent-search-results
GOOGLE_CLOUD_ZONE=us-central1-a
GOOGLE_CLOUD_VM_NAME=patent-search-worker
GOOGLE_CLOUD_CREDENTIALS=<paste entire contents of credentials.json>
```

For `GOOGLE_CLOUD_CREDENTIALS`:
1. Open the `credentials.json` file you created in Step 2
2. Copy the ENTIRE contents (it should be one long JSON object)
3. Paste it as a single line into Vercel

## Alternative: Using Cloud Run Jobs (Recommended for Production)

For a more scalable solution, consider using Cloud Run Jobs instead of a persistent VM:

```bash
# Build container image
gcloud builds submit --tag gcr.io/$PROJECT_ID/patent-search-worker

# Create Cloud Run Job
gcloud run jobs create patent-search \
  --image gcr.io/$PROJECT_ID/patent-search-worker \
  --region us-central1 \
  --service-account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com
```

Then update the API route to trigger Cloud Run Jobs instead of VM commands.

## Manual Worker Execution Method

If the automated GCE triggering doesn't work, you can manually trigger searches:

1. User clicks "Begin Prior Art Search"
2. Frontend stores job in a queue (Firestore/Database)
3. Cron job or Cloud Scheduler runs every minute
4. Picks up pending jobs and executes them
5. Updates job status in database

## Monitoring & Logs

```bash
# View VM logs
gcloud compute ssh $VM_NAME --zone=$ZONE --command="tail -f /var/log/syslog"

# View Cloud Storage files
gsutil ls gs://$BUCKET_NAME/

# Download a result
gsutil cp gs://$BUCKET_NAME/test-job-123_report.csv ./
```

## Cost Estimation

- **VM (e2-medium):** ~$24/month if running 24/7
- **Cloud Storage:** ~$0.02/GB/month
- **Network egress:** Variable

**Cost Optimization:**
- Stop VM when not in use: `gcloud compute instances stop $VM_NAME --zone=$ZONE`
- Start VM only when needed: `gcloud compute instances start $VM_NAME --zone=$ZONE`
- Use preemptible VMs for even lower costs

## Troubleshooting

### Worker script fails to upload to Cloud Storage

Check service account permissions:
```bash
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
```

### Cannot connect to USPTO API

Verify your API key is correct and has not expired.

### VM cannot be accessed

Check firewall rules and ensure the VM is running:
```bash
gcloud compute instances describe $VM_NAME --zone=$ZONE
```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use least privilege** for service accounts
3. **Enable VPC firewall rules** to restrict access
4. **Rotate service account keys** regularly
5. **Enable Cloud Audit Logs** for compliance
6. **Use Secret Manager** instead of environment variables for production

## Next Steps

After completing this setup:

1. Test the full flow: Frontend → API → Worker → Cloud Storage
2. Verify CSV downloads work
3. Monitor costs in GCP Console
4. Set up alerts for errors
5. Deploy to Vercel production

## Cleanup (Optional)

To remove all resources:

```bash
# Delete VM
gcloud compute instances delete $VM_NAME --zone=$ZONE --project=$PROJECT_ID

# Delete bucket
gsutil rm -r gs://$BUCKET_NAME/

# Delete service account
gcloud iam service-accounts delete $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com
```
