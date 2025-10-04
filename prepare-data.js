// prepare-data.js - One-time data preparation
const fs = require('fs').promises;
const { QdrantClient } = require('@qdrant/js-client-rest');
const { pipeline } = require('@xenova/transformers');
const { XMLParser } = require('fast-xml-parser');
const https = require('https');
const zlib = require('zlib');
const { pipeline: streamPipeline } = require('stream/promises');
const { createWriteStream } = require('fs');

let embedder;

async function initEmbedder() {
  console.log('Loading embedding model (MiniLM-L6-v2)...');
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('Model ready!');
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      const file = createWriteStream(dest);
      streamPipeline(response, file).then(resolve).catch(reject);
    }).on('error', reject);
  });
}

async function parsePatentXML(xmlContent) {
  const parser = new XMLParser({ ignoreAttributes: false });
  const data = parser.parse(xmlContent);
  
  // Handle USPTO XML structure
  const patents = [];
  const docs = data['us-patent-grant'] || data['us-patent-application'];
  
  if (!docs) return patents;
  
  const patentArray = Array.isArray(docs) ? docs : [docs];
  
  for (const doc of patentArray) {
    try {
      patents.push({
        id: doc['application-reference']?.['document-id']?.['doc-number'] || 
            doc['publication-reference']?.['document-id']?.['doc-number'],
        title: doc['invention-title']?.['#text'] || doc['invention-title'],
        abstract: doc.abstract?.p || '',
        claims: Array.isArray(doc.claims?.claim) 
          ? doc.claims.claim.map(c => c['claim-text']).join(' ')
          : doc.claims?.claim?.['claim-text'] || '',
        filingDate: doc['application-reference']?.['document-id']?.date,
        status: doc['application-status'],
      });
    } catch (err) {
      console.error('Parse error:', err);
    }
  }
  
  return patents;
}

async function generateEmbedding(text) {
  const output = await embedder(text.slice(0, 5000), {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data);
}

async function vectorizePatents() {
  await initEmbedder();
  
  const qdrant = new QdrantClient({ url: 'http://localhost:6333' });
  
  // Create collection
  console.log('Creating Qdrant collection...');
  try {
    await qdrant.deleteCollection('uspto_patents');
  } catch {}
  
  await qdrant.createCollection('uspto_patents', {
    vectors: {
      size: 384,
      distance: 'Cosine'
    }
  });
  
  console.log('Processing XML files...');
  const files = await fs.readdir('./uspto-data');
  const xmlFiles = files.filter(f => f.endsWith('.xml'));
  
  let totalProcessed = 0;
  
  for (const file of xmlFiles) {
    console.log(`Processing ${file}...`);
    const content = await fs.readFile(`./uspto-data/${file}`, 'utf8');
    const patents = await parsePatentXML(content);
    
    const BATCH_SIZE = 50;
    for (let i = 0; i < patents.length; i += BATCH_SIZE) {
      const batch = patents.slice(i, i + BATCH_SIZE);
      
      const points = await Promise.all(batch.map(async (patent) => {
        const text = `${patent.title} ${patent.abstract} ${patent.claims}`;
        const vector = await generateEmbedding(text);
        
        return {
          id: patent.id,
          vector,
          payload: patent
        };
      }));
      
      await qdrant.upsert('uspto_patents', { points });
      totalProcessed += batch.length;
      
      if (totalProcessed % 500 === 0) {
        console.log(`Processed ${totalProcessed} patents...`);
      }
    }
  }
  
  console.log(`Complete! Vectorized ${totalProcessed} patents.`);
}

// Download sample USPTO data (or use your bulk data)
async function downloadSampleData() {
  console.log('Download USPTO bulk data from: https://bulkdata.uspto.gov/');
  console.log('Place XML files in ./uspto-data/');
}

if (require.main === module) {
  vectorizePatents().catch(console.error);
}
