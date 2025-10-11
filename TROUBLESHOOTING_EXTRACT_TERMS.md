# Troubleshooting: extract-terms 500 Error

## Problem
The `/api/extract-terms` endpoint returns a 500 Internal Server Error because it cannot connect to Ollama.

## Root Cause
The endpoint requires Ollama (with llama3.1:8b model) running at `http://localhost:11434`, but it's not installed or running on the production VM.

## Solution Steps

### On Your Production VM

1. **SSH into your VM:**
   ```bash
   gcloud compute ssh your-vm-name --zone=your-zone
   # OR
   ssh your-user@your-vm-ip
   ```

2. **Run the diagnostic script:**
   ```bash
   cd ~/patent-search-pro  # or wherever your code is
   chmod +x check-services.sh
   ./check-services.sh
   ```

3. **Install and setup Ollama:**
   ```bash
   chmod +x setup-ollama-production.sh
   ./setup-ollama-production.sh
   ```

### Alternative: Manual Setup

If the script doesn't work, do it manually:

```bash
# 1. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Start Ollama service
ollama serve &

# 3. Wait a few seconds, then pull the model
ollama pull llama3.1:8b

# 4. Test it
curl http://localhost:11434/api/version

# 5. Test with a prompt
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "test",
  "stream": false
}'
```

### Environment Variables

Make sure your `.env.local` (or environment) has:

```bash
OLLAMA_URL=http://localhost:11434
```

If Ollama is running on a different machine/port, update accordingly:
```bash
OLLAMA_URL=http://192.168.1.100:11434  # example
```

### Restart Your Next.js App

After Ollama is running:

```bash
# If using PM2
pm2 restart all

# Or if running manually
# Stop the current process (Ctrl+C) then:
npm run build
npm run start
```

## Verification

### Test Ollama directly:
```bash
curl http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:8b",
    "prompt": "Extract key terms from this text: A smart sensor device for monitoring temperature",
    "stream": false,
    "format": "json"
  }'
```

### Test the API endpoint:
```bash
curl -X POST https://your-domain.vercel.app/api/extract-terms \
  -H "Content-Type: application/json" \
  -d '{
    "documentText": "A smart sensor device for monitoring temperature and humidity in real-time using IoT technology for healthcare applications."
  }'
```

Expected response:
```json
{
  "deviceTerms": ["sensor", "device"],
  "technologyTerms": ["IoT", "real-time monitoring"],
  "subjectTerms": ["healthcare"]
}
```

## Common Issues

### Issue 1: Ollama not in PATH
```bash
# Add to ~/.bashrc or ~/.profile
export PATH=$PATH:/usr/local/bin

# Or create symlink
sudo ln -s /usr/local/bin/ollama /usr/bin/ollama
```

### Issue 2: Port 11434 blocked
```bash
# Check if port is listening
netstat -tlnp | grep 11434

# Check firewall (if using ufw)
sudo ufw allow 11434

# For GCP, add firewall rule
gcloud compute firewall-rules create allow-ollama \
  --allow tcp:11434 \
  --source-ranges 0.0.0.0/0
```

### Issue 3: Model not downloaded
```bash
# List available models
ollama list

# If llama3.1:8b is missing
ollama pull llama3.1:8b
```

### Issue 4: Out of memory
```bash
# Check memory
free -h

# Ollama with llama3.1:8b needs ~8GB RAM
# If insufficient, use a smaller model:
ollama pull llama3.1:7b
# Or use a larger VM instance
```

### Issue 5: Ollama crashes on startup
```bash
# Check logs
journalctl -u ollama -n 50

# Or if running manually
tail -f /tmp/ollama.log

# Common fix: clear cache
rm -rf ~/.ollama/cache
```

## Architecture Notes

The current setup:
1. User submits text on frontend
2. Frontend calls `/api/extract-terms` (Next.js API route on Vercel)
3. API route calls Ollama (running on your VM) at `localhost:11434`
4. **Problem**: Vercel's Next.js runs in a serverless environment, so "localhost" refers to Vercel's server, not your VM!

### The Real Issue!

If you're deploying to **Vercel**, `localhost` won't work because:
- Vercel runs your API routes in serverless functions
- Your VM with Ollama is on a different machine
- You need to expose Ollama publicly or use a different architecture

## Solutions for Vercel Deployment

### Option A: Run Ollama on the same VM as Next.js (Self-hosted)
Deploy your entire Next.js app on the VM where Ollama runs.

### Option B: Expose Ollama with a reverse proxy (Recommended)
On your VM:

```bash
# Install nginx
sudo apt install nginx

# Configure nginx to proxy Ollama
sudo nano /etc/nginx/sites-available/ollama

# Add:
server {
    listen 80;
    server_name ollama.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

sudo ln -s /etc/nginx/sites-available/ollama /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Then set in Vercel:
```bash
OLLAMA_URL=http://ollama.yourdomain.com
```

### Option C: Use a cloud-hosted LLM API (Easiest)
Replace Ollama with:
- OpenAI API
- Anthropic Claude API  
- Google Gemini API (you already have the key!)

Update `app/api/extract-terms/route.ts` to use Gemini instead of Ollama.

### Option D: Edge function with local Ollama
If Next.js runs on the same server as Ollama (not Vercel), it will work as-is.

## Quick Fix for Now

If you want to keep using Vercel + separate VM:

1. Make Ollama accessible via public IP:
   ```bash
   # On VM, start Ollama with host binding
   OLLAMA_HOST=0.0.0.0:11434 ollama serve
   ```

2. Add firewall rule:
   ```bash
   gcloud compute firewall-rules create allow-ollama \
     --allow tcp:11434 \
     --source-ranges YOUR_VERCEL_IP_RANGES
   ```

3. Set in Vercel environment:
   ```bash
   OLLAMA_URL=http://YOUR_VM_PUBLIC_IP:11434
   ```

⚠️ **Security Warning**: Exposing Ollama publicly without authentication is risky!

## Recommended Architecture

For production, I recommend:

```
[Vercel Frontend] 
      ↓ (HTTPS)
[Vercel API Routes] 
      ↓ (uses GEMINI_API_KEY)
[Google Gemini API] 
```

This removes the Ollama dependency entirely and uses a managed service.

Would you like me to help you migrate from Ollama to Gemini?
