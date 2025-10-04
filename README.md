# AI Patent Assistant

An AI-powered tool for drafting provisional patents and conducting exhaustive prior art searches using the USPTO database.

## 🎯 Features

- 🤖 **AI-Assisted Patent Writing** - Generate professional patent descriptions using Google Gemini
- 🔍 **Intelligent Term Extraction** - Automatically extract device, technology, and subject terms
- 💡 **Smart Synonym Suggestions** - AI-powered related terms for comprehensive searches
- 📊 **USPTO Database Search** - Search thousands of patent applications with pagination
- 📈 **Real-time Status Monitoring** - Track search progress with automatic updates
- 📥 **CSV Export** - Download comprehensive patent search reports
- ✨ **Beautiful UI** - Modern, responsive interface with shadcn/ui components

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Google Gemini API key ([Get one here](https://ai.google.dev/))
- USPTO API key ([Get one here](https://developer.uspto.gov/))
- Google Cloud Platform account (for production)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd patent-search-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your credentials:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   GOOGLE_CLOUD_PROJECT_ID=your_project_id
   GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Required for Development

- `GEMINI_API_KEY` - Your Google Gemini API key for AI features
- `USPTO_API_KEY` - Your USPTO API key for patent searches

### Required for Production

- `GEMINI_API_KEY` - Google Gemini API key
- `USPTO_API_KEY` - USPTO API key
- `GOOGLE_CLOUD_PROJECT_ID` - Your GCP project ID
- `GOOGLE_CLOUD_LOCATION` - Cloud Run region (default: us-central1)
- `CLOUD_RUN_JOB_NAME` - Name of the Cloud Run Job (default: patent-search-job)
- `GOOGLE_CLOUD_STORAGE_BUCKET` - Cloud Storage bucket for search results
- `GOOGLE_CLOUD_CREDENTIALS` - Service account JSON credentials (as string)

## Deployment to Vercel

### Prerequisites: Set Up Cloud Run Job

Before deploying to Vercel, you need to set up the serverless worker on Google Cloud.
Follow the comprehensive guide in **[CLOUD_RUN_SETUP.md](./CLOUD_RUN_SETUP.md)**.

**Quick summary:**
1. Create Cloud Storage bucket
2. Create service accounts with permissions
3. Build and push Docker container
4. Create Cloud Run Job
5. Test the job

**Why Cloud Run Jobs?**
- ✅ **95% cost savings** vs running a VM 24/7
- ✅ **Serverless** - no infrastructure to manage
- ✅ **Auto-scaling** - handles multiple searches
- ✅ **Pay per execution** - only charged when running

### Step 1: Connect Your Repository

1. Go to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository

### Step 2: Configure Environment Variables

In your Vercel project settings, add these environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `GEMINI_API_KEY` | `your_key_here` | Google Gemini API key |
| `USPTO_API_KEY` | `your_key_here` | USPTO API key for patent searches |
| `GOOGLE_CLOUD_PROJECT_ID` | `your_project_id` | GCP Project ID |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` | Cloud Run region |
| `CLOUD_RUN_JOB_NAME` | `patent-search-job` | Name of your Cloud Run Job |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | `your_bucket_name` | Storage bucket name |
| `GOOGLE_CLOUD_CREDENTIALS` | `{"type":"service_account",...}` | Service account JSON (entire object as string) |

**Important:** For `GOOGLE_CLOUD_CREDENTIALS`, you need to:
1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Copy the ENTIRE JSON content as a single-line string
4. Paste it as the value in Vercel

### Step 3: Deploy

1. Click "Deploy"
2. Vercel will automatically build and deploy your application

## Project Structure

```
patent-search-pro/
├── app/
│   ├── api/                    # API routes
│   │   ├── generate-description/
│   │   ├── extract-terms/
│   │   ├── start-search/
│   │   └── get-status/
│   ├── search/[jobId]/        # Search status page
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               # Main application page
├── components/
│   ├── ui/                    # shadcn components
│   ├── ProvisionalPatentEditor.tsx
│   └── SearchTermChips.tsx
├── lib/
│   └── utils.ts
├── public/
├── .env.example               # Environment variables template
├── .env.local                 # Local environment (not committed)
└── PROGRESS.md               # Development progress tracker
```

## Development Progress

See [PROGRESS.md](./PROGRESS.md) for detailed development progress and task completion status.

## API Routes

### POST /api/generate-description
Generates a provisional patent description from a user prompt using Google Gemini.

### POST /api/extract-terms
Extracts device, technology, and subject terms from patent text.

### POST /api/start-search
Triggers the prior art search worker on Google Compute Engine.

### GET /api/get-status?jobId=xxx
Checks the status of a running prior art search job.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
