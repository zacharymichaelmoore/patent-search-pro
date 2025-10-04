# Quick Reference: Cloud Run Jobs Commands

## Essential Commands

### Build & Deploy
```bash
# Build and push container
gcloud builds submit . --tag "us-central1-docker.pkg.dev/PROJECT_ID/patent-search-repo/patent-worker:latest"

# Create job
gcloud run jobs create patent-search-job \
  --image "us-central1-docker.pkg.dev/PROJECT_ID/patent-search-repo/patent-worker:latest" \
  --region us-central1 \
  --service-account JOB_SERVICE_ACCOUNT_EMAIL \
  --set-env-vars="USPTO_API_KEY=YOUR_KEY,GOOGLE_CLOUD_STORAGE_BUCKET=BUCKET_NAME"

# Update job with new image
gcloud run jobs update patent-search-job \
  --image "us-central1-docker.pkg.dev/PROJECT_ID/patent-search-repo/patent-worker:latest" \
  --region us-central1
```

### Testing
```bash
# Execute job manually
gcloud run jobs execute patent-search-job --region us-central1

# List executions
gcloud run jobs executions list --job patent-search-job --region us-central1

# View execution details
gcloud run jobs executions describe EXECUTION_ID --job patent-search-job --region us-central1
```

### Monitoring
```bash
# View logs
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=patent-search-job" --limit 50

# Check job configuration
gcloud run jobs describe patent-search-job --region us-central1
```

### Management
```bash
# Update timeout
gcloud run jobs update patent-search-job --task-timeout 30m --region us-central1

# Update resources
gcloud run jobs update patent-search-job --cpu 2 --memory 4Gi --region us-central1

# Delete job
gcloud run jobs delete patent-search-job --region us-central1
```

## Environment Variables for Vercel

```
GEMINI_API_KEY=your_gemini_key
USPTO_API_KEY=your_uspto_key
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
CLOUD_RUN_JOB_NAME=patent-search-job
GOOGLE_CLOUD_STORAGE_BUCKET=patent-search-results
GOOGLE_CLOUD_CREDENTIALS=<paste entire credentials.json>
```

## Cost Estimation

| Metric | Value |
|--------|-------|
| CPU cost | $0.000024/second |
| Memory cost (2GB) | $0.000025/second |
| Typical search | 300 seconds |
| Cost per search | ~$0.01 |
| Monthly (100 searches) | ~$1.50 |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Job not found | Create it with `gcloud run jobs create` |
| Permission denied | Check service account IAM roles |
| Container fails | Check logs with `gcloud logging read` |
| Timeout | Increase with `--task-timeout` flag |
| Out of memory | Increase with `--memory` flag |
