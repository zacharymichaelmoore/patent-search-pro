// search-service.js - Main search API
const express = require('express');
const cors = require('cors');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { pipeline } = require('@xenova/transformers');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

let embedder, qdrant, genAI;
let isReady = false;

async function init() {
  console.log('[INIT] Loading embedding model...');
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  
  console.log('[INIT] Connecting to Qdrant...');
  qdrant = new QdrantClient({ url: 'http://localhost:6333' });
  
  console.log('[INIT] Initializing Gemini...');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  isReady = true;
  console.log('[INIT] Service ready!');
}

async function generateEmbedding(text) {
  const output = await embedder(text.slice(0, 5000), {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data);
}

async function analyzePatentBatch(userDescription, patents) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  return Promise.all(patents.map(async (patent) => {
    const prompt = `Analyze prior art risk (0-100):
USER: ${userDescription.slice(0, 1000)}
PATENT: ${patent.title}
ABSTRACT: ${patent.abstract}

JSON: {"score": 85, "level": "High", "reason": "..."}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json\n?/g, '').replace(/```/g, '');
      const json = JSON.parse(text);
      return { ...patent, ...json };
    } catch {
      return { ...patent, score: null, level: 'Unknown', reason: 'Failed' };
    }
  }));
}

app.post('/api/search', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: 'Service not ready' });
  }

  try {
    // LIMITED TO 10 RESULTS FOR TESTING
    const { userDescription, topK = 100 } = req.body;
    console.log(`[SEARCH] Starting for ${topK} results...`);
    
    const start = Date.now();
    
    // Generate query embedding
    const queryVector = await generateEmbedding(userDescription);
    console.log(`[SEARCH] Embedding generated in ${Date.now() - start}ms`);
    
    // Vector search
    const searchResults = await qdrant.search('uspto_patents', {
      vector: queryVector,
      limit: topK,
      with_payload: true,
    });
    console.log(`[SEARCH] Found ${searchResults.length} patents in ${Date.now() - start}ms`);
    
    // For testing: analyze all 10 at once (no batching needed)
    const patents = searchResults.map(r => r.payload);
    const analyzedPatents = await analyzePatentBatch(userDescription, patents);
    
    /* PRODUCTION BATCHING (for 100+ results - commented out for testing):
    const analyzedPatents = [];
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < searchResults.length; i += BATCH_SIZE) {
      const batch = searchResults.slice(i, i + BATCH_SIZE);
      const patents = batch.map(r => r.payload);
      const analyzed = await analyzePatentBatch(userDescription, patents);
      analyzedPatents.push(...analyzed);
      console.log(`[SEARCH] Analyzed ${i + batch.length}/${searchResults.length}`);
    }
    */
    
    analyzedPatents.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    console.log(`[SEARCH] Complete in ${Date.now() - start}ms`);
    
    res.json({
      success: true,
      count: analyzedPatents.length,
      durationMs: Date.now() - start,
      results: analyzedPatents,
    });
    
  } catch (error) {
    console.error('[ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: isReady ? 'ready' : 'initializing' });
});

init().then(() => {
  app.listen(8080, '0.0.0.0', () => {
    console.log('[SERVER] Listening on port 8080');
  });
});
