const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { pipeline } = require('@xenova/transformers');
const { XMLParser } = require('fast-xml-parser');
const cliProgress = require('cli-progress');

let embedder;

// --- CONFIGURATION ---
const DATA_DIR = '/mnt/storage_pool/uspto-data';
// --- END CONFIGURATION ---

const STATE_FILE = path.join(DATA_DIR, '.vectorization_state.json');
const CHECKPOINT_INTERVAL = 100; // Save state every 100 files to reduce disk I/O

// Helper function to find all files recursively
async function getRecursiveXmlFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      return getRecursiveXmlFiles(res);
    } else if (res.toLowerCase().endsWith('.xml')) { // Case-insensitive check
      return res; // Return the full path
    }
    return [];
  }));
  return Array.prototype.concat(...files);
}

class StateManager {
  constructor() {
    this.state = {
      processedFiles: new Set(),
      lastProcessedFile: null,
      totalPatentsProcessed: 0,
      collectionCreated: false,
      startTime: null,
      lastCheckpoint: null
    };
    this.loadState();
  }

  loadState() {
    if (fsSync.existsSync(STATE_FILE)) {
      try {
        const data = JSON.parse(fsSync.readFileSync(STATE_FILE, 'utf8'));
        this.state.processedFiles = new Set(data.processedFiles || []);
        this.state.lastProcessedFile = data.lastProcessedFile;
        this.state.totalPatentsProcessed = data.totalPatentsProcessed || 0;
        this.state.collectionCreated = data.collectionCreated || false;
        this.state.startTime = data.startTime;
        this.state.lastCheckpoint = data.lastCheckpoint;
        console.log(`Loaded state: ${this.state.processedFiles.size} files already processed`);
        console.log(`Total patents processed so far: ${this.state.totalPatentsProcessed}`);
      } catch (err) {
        console.error('Failed to load state file, starting fresh:', err.message);
      }
    }
  }

  saveState() {
    const data = {
      processedFiles: Array.from(this.state.processedFiles),
      lastProcessedFile: this.state.lastProcessedFile,
      totalPatentsProcessed: this.state.totalPatentsProcessed,
      collectionCreated: this.state.collectionCreated,
      startTime: this.state.startTime,
      lastCheckpoint: new Date().toISOString()
    };
    fsSync.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  }

  isProcessed(filename) {
    return this.state.processedFiles.has(filename);
  }

  markProcessed(filename, patentCount) {
    this.state.processedFiles.add(filename);
    this.state.lastProcessedFile = filename;
    this.state.totalPatentsProcessed += patentCount;
  }

  setCollectionCreated() {
    this.state.collectionCreated = true;
    this.saveState();
  }

  setStartTime() {
    if (!this.state.startTime) {
      this.state.startTime = new Date().toISOString();
    }
  }
}

async function initEmbedder() {
  console.log('Loading embedding model...');
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('Model ready!');
}

async function parsePatentXML(xmlContent) {
  function flattenClaimText(obj) {
    if (typeof obj === 'string') { return obj.trim(); }
    if (obj === null || typeof obj !== 'object') { return ''; }

    let text = '';
    if (obj['#text']) {
      text += obj['#text'].trim() + ' ';
    }
    if (obj['claim-text']) {
      const nested = Array.isArray(obj['claim-text']) ? obj['claim-text'] : [obj['claim-text']];
      for (const item of nested) {
        text += flattenClaimText(item) + ' ';
      }
    }
    return text;
  }

  const parser = new XMLParser({ ignoreAttributes: true, textNodeName: "#text" });
  const data = parser.parse(xmlContent);
  const patents = [];
  const doc = data['us-patent-application'];
  
  if (!doc) {
    return patents;
  }

  const bibData = doc['us-bibliographic-data-application'];
  if (!bibData) {
    console.error("Could not find <us-bibliographic-data-application> in patent record.");
    return patents;
  }

  try {
    const claimsArray = Array.isArray(doc.claims?.claim) 
      ? doc.claims.claim 
      : [doc.claims?.claim].filter(Boolean);
    const claimsText = claimsArray
      .map(c => flattenClaimText(c['claim-text']))
      .join(' ')
      .replace(/\s\s+/g, ' ')
      .trim();

    patents.push({
      id: bibData['publication-reference']?.['document-id']?.['doc-number'],
      title: bibData['invention-title'],
      filingDate: bibData['application-reference']?.['document-id']?.date,
      abstract: doc.abstract?.p || '',
      claims: claimsText,
    });
  } catch (err) {
    console.error('Failed to parse a patent record, skipping:', err.message);
  }
  return patents;
}

async function generateEmbedding(text) {
  const output = await embedder(text.slice(0, 5000), { 
    pooling: 'mean', 
    normalize: true 
  });
  return Array.from(output.data);
}

async function vectorizePatents() {
  const stateManager = new StateManager();
  stateManager.setStartTime();

  await initEmbedder();
  
  const qdrant = new QdrantClient({ url: 'http://localhost:6333' });
  
  if (!stateManager.state.collectionCreated) {
    console.log('Creating collection...');
    try { 
      await qdrant.deleteCollection('uspto_patents'); 
    } catch (err) { /* Collection might not exist, that's fine */ }
    await qdrant.createCollection('uspto_patents', { 
      vectors: { size: 384, distance: 'Cosine' }
    });
    stateManager.setCollectionCreated();
    console.log('Collection created successfully');
  } else {
    console.log('Using existing collection (resuming previous run)');
  }

  console.log('Finding all XML files recursively...');
  const xmlFiles = await getRecursiveXmlFiles(DATA_DIR);
  xmlFiles.sort();
  
  console.log(`Found ${xmlFiles.length} XML files`);
  console.log(`Already processed: ${stateManager.state.processedFiles.size} files`);
  const remainingFiles = xmlFiles.filter(fullPath => !stateManager.isProcessed(path.basename(fullPath)));
  console.log(`Remaining: ${remainingFiles.length} files to process.`);

  // --- PROGRESS BAR SETUP ---
  const progressBar = new cliProgress.SingleBar({
    format: ' {bar} | {percentage}% || {value}/{total} Files || Current: {filename}'
  }, cliProgress.Presets.shades_classic);
  
  if (remainingFiles.length > 0) {
    console.log("\nStarting vectorization...");
    progressBar.start(remainingFiles.length, 0, { filename: "N/A" });
  }
  // --- END PROGRESS BAR SETUP ---

  let filesProcessedInSession = 0;

  for (const fullPath of remainingFiles) {
    const file = path.basename(fullPath); 

    try {
      const content = await fs.readFile(fullPath, 'utf8');
      const patents = await parsePatentXML(content);

      if (patents.length === 0) {
        stateManager.markProcessed(file, 0);
      } else {
        const BATCH_SIZE = 50;
        let filePatentCount = 0;

        for (let i = 0; i < patents.length; i += BATCH_SIZE) {
          const batch = patents.slice(i, i + BATCH_SIZE);
          const points = await Promise.all(batch.map(async (patent) => {
            const text = `${patent.title} ${patent.abstract} ${patent.claims}`;
            const vector = await generateEmbedding(text);
            return { id: patent.id, vector, payload: patent };
          }));
          await qdrant.upsert('uspto_patents', { points });
          filePatentCount += batch.length;
        }
        stateManager.markProcessed(file, filePatentCount);
      }
      
      filesProcessedInSession++;
      
      progressBar.update(filesProcessedInSession, { filename: file });

      if (filesProcessedInSession > 0 && filesProcessedInSession % CHECKPOINT_INTERVAL === 0) {
        stateManager.saveState();
      }

    } catch (err) {
      progressBar.stop(); // Stop the bar to see the error clearly
      console.error(`\n\nERROR processing ${file}:`, err.message);
      console.error(`Will retry this file on next run.\n`);
      continue;
    }
  }

  // --- FINISH PROGRESS BAR ---
  if (remainingFiles.length > 0) {
    progressBar.stop();
  }
  // --- END FINISH PROGRESS BAR ---
  
  stateManager.saveState();

  console.log(`\n====================================================`);
  console.log(`Complete! Vectorized ${stateManager.state.totalPatentsProcessed} patents.`);
  console.log(`Processed ${stateManager.state.processedFiles.size} files total.`);
  console.log(`Session started: ${stateManager.state.startTime}`);
  console.log(`Last checkpoint: ${stateManager.state.lastCheckpoint}`);
  console.log(`====================================================`);
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n\nReceived SIGINT, saving state before exit...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nReceived SIGTERM, saving state before exit...');
  process.exit(0);
});


if (require.main === module) {
  vectorizePatents().catch(console.error);
}