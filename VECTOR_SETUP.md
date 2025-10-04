# Self-Hosted Vector Search Deployment

## Quick Setup (30 minutes)

### 1. Create VM
```bash
gcloud compute instances create patent-search-vm \
  --machine-type=n2-highmem-8 \
  --zone=us-central1-a \
  --boot-disk-size=1TB \
  --boot-disk-type=pd-ssd \
  --tags=http-server

# Allow traffic
gcloud compute firewall-rules create allow-patent-search \
  --allow=tcp:8080 \
  --target-tags=http-server

# SSH in
gcloud compute ssh patent-search-vm --zone=us-central1-a
```

### 2. Setup VM
```bash
# Upload and run setup script
chmod +x vm-setup.sh
./vm-setup.sh

# Install dependencies
cp vm-package.json package.json
npm install
```

### 3. Download USPTO Data
Visit https://bulkdata.uspto.gov/data/patent/application/redbook/fulltext/
Download XML files to `~/patent-search/uspto-data/`

### 4. Vectorize Data (48 hours)
```bash
export GEMINI_API_KEY=your_key
node prepare-data.js
```

### 5. Start Search Service
```bash
export GEMINI_API_KEY=your_key
pm2 start search-service.js
pm2 save
```

### 6. Get VM IP
```bash
gcloud compute instances describe patent-search-vm \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

### 7. Update Vercel
Add to Vercel environment variables:
```
PATENT_SEARCH_VM_URL=http://YOUR_VM_IP:8080
```

## Search Speed
- Vector search: 2-5 seconds
- Gemini analysis (100 patents): 30 seconds
- **Total: ~35 seconds**

## Cost
- VM: ~$400/month (free with credits)
- Per search: $0.01

Done!
