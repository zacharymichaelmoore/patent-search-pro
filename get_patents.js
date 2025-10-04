// get_patents.js
// Cloud Run Job for USPTO patent searches

const { Storage } = require('@google-cloud/storage');

/**
 * Searches USPTO database with pagination
 */
async function searchUSPTO(query, apiKey) {
  const baseUrl = 'https://api.uspto.gov/api/v1/patent/applications/search';
  const rowsPerPage = 100;
  let allResults = [];
  let totalResults = 0;
  let start = 0;

  try {
    console.log(`Starting USPTO search for: "${query}"`);

    // Initial request to get the total count
    const initialSearchUrl = `${baseUrl}?q=${encodeURIComponent(query)}&rows=1&start=0`;
    const initialResponse = await fetch(initialSearchUrl, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!initialResponse.ok) {
      throw new Error(`API request failed with status ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json();
    totalResults = initialData.count;

    console.log(`Found ${totalResults} total results`);

    if (totalResults === 0) {
      return [];
    }

    // Loop to get all pages of results
    do {
      const searchUrl = `${baseUrl}?q=${encodeURIComponent(query)}&rows=${rowsPerPage}&start=${start}`;
      console.log(`Fetching results ${start}-${start + rowsPerPage} of ${totalResults}`);
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status} on page load.`);
      }

      const data = await response.json();
      if (data.patentFileWrapperDataBag) {
        allResults = allResults.concat(data.patentFileWrapperDataBag);
      }
      start += rowsPerPage;
    } while (allResults.length < totalResults);

    console.log(`Retrieved ${allResults.length} results`);
    return allResults;

  } catch (error) {
    console.error('Error searching USPTO:', error);
    throw error;
  }
}

/**
 * Builds a comprehensive search query from extracted terms
 */
function buildSearchQuery(searchTerms) {
  const { deviceTerms = [], technologyTerms = [], subjectTerms = [] } = searchTerms;
  
  // Combine all terms with OR logic within each category
  // and AND logic between categories for comprehensive results
  const queries = [];
  
  if (deviceTerms.length > 0) {
    queries.push(`(${deviceTerms.join(' OR ')})`);
  }
  
  if (technologyTerms.length > 0) {
    queries.push(`(${technologyTerms.join(' OR ')})`);
  }
  
  if (subjectTerms.length > 0) {
    queries.push(`(${subjectTerms.join(' OR ')})`);
  }
  
  // Join with AND to require at least one match from each category
  return queries.join(' AND ');
}

/**
 * Converts patent results to CSV format
 */
function resultsToCSV(results) {
  if (results.length === 0) {
    return 'No results found';
  }

  const headers = [
    'Application Number',
    'Title',
    'Status',
    'Filing Date',
    'Applicant Name',
    'Inventor Name',
    'Abstract'
  ];

  const rows = results.map(item => {
    const metadata = item.applicationMetaData || {};
    const applicants = item.parties?.applicants || [];
    const inventors = item.parties?.inventors || [];
    
    return [
      item.applicationNumberText || '',
      metadata.inventionTitle || '',
      metadata.applicationStatusDescriptionText || '',
      metadata.filingDate || '',
      applicants.map(a => a.name).join('; ') || '',
      inventors.map(i => i.name).join('; ') || '',
      metadata.inventionSubjectMatter || ''
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Cloud Run Jobs passes dynamic data via environment variables
    const jobId = process.env.JOB_ID || `job-${process.env.CLOUD_RUN_EXECUTION || 'local'}`;
    const searchTermsJson = process.env.SEARCH_TERMS_JSON;

    // Static configuration set as environment variables on the job
    const usptoApiKey = process.env.USPTO_API_KEY;
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

    if (!searchTermsJson || !usptoApiKey || !bucketName) {
      console.error('Missing required environment variables: SEARCH_TERMS_JSON, USPTO_API_KEY, or GOOGLE_CLOUD_STORAGE_BUCKET');
      process.exit(1); // Exit with an error code to fail the job
    }

    console.log(`[${jobId}] Starting patent search...`);

    // Parse search terms
    const searchTerms = JSON.parse(searchTermsJson);
    console.log(`[${jobId}] Search terms:`, searchTerms);

    // Build comprehensive query
    const query = buildSearchQuery(searchTerms);
    console.log(`[${jobId}] Final query: ${query}`);

    // Search USPTO
    const results = await searchUSPTO(query, usptoApiKey);
    console.log(`[${jobId}] Found ${results.length} patents`);

    // Convert to CSV
    const csv = resultsToCSV(results);

    // Upload to Cloud Storage
    const storage = new Storage();
    const bucket = storage.bucket(bucketName);
    const fileName = `${jobId}_report.csv`;
    const file = bucket.file(fileName);

    await file.save(csv, {
      contentType: 'text/csv',
      metadata: {
        cacheControl: 'no-cache',
      },
    });

    console.log(`[${jobId}] Report uploaded to: gs://${bucketName}/${fileName}`);
    console.log(`[${jobId}] Search complete. Results uploaded to bucket: ${bucketName}.`);
    process.exit(0);

  } catch (error) {
    console.error(`An error occurred during the search:`, error);
    process.exit(1); // Exit with non-zero code to mark the job run as failed
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { searchUSPTO, buildSearchQuery, resultsToCSV };
