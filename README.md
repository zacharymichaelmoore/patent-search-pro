# Patent Search Pro - README

## Current Architecture

**Self-Hosted Vector Search (Deployed)**

The application uses a GCP VM with vector search for fast patent similarity matching:

- Vector DB: Qdrant (self-hosted)
- Patents: 2,800+ vectorized (expandable)
- Search speed: ~10 seconds for 10 results
- VM: n2-highmem-8 on GCP

See `VECTOR_STATUS.md` for deployment details.

## Alternative: Cloud Run Jobs

Cloud Run Jobs implementation is documented but not deployed. Files:
- `CLOUD_RUN_SETUP.md`
- `CLOUD_RUN_UPGRADE.md`  
- `GCE_VS_CLOUD_RUN.md`

Can be implemented as serverless alternative.

## Features

- AI patent description generation (Google Gemini)
- Real-time term extraction
- Smart synonym suggestions
- Vector similarity search
- AI risk scoring
- CSV reports

## Quick Start

See deployment guides:
- Vector Search: `VECTOR_SETUP.md`
- Cloud Run (alternative): `CLOUD_RUN_SETUP.md`

## Environment Variables

```
GEMINI_API_KEY=your_key
PATENT_SEARCH_VM_URL=http://YOUR_VM_IP:8080
GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account"...}
```

## Status

Project: 98% complete
- VM deployed and operational
- Vercel app configured
- Search service active
- 2,800 patents indexed

See `PROGRESS.md` for detailed status.
