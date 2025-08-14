# Document Pre-processing Migration Guide

## Overview

This guide explains how to migrate from the current real-time document processing system to the new optimized pre-processing architecture that significantly reduces costs and improves performance.

## Architecture Changes

### Before (Current System)
```
Query → Find Company → Process Documents → Answer
```
- Documents processed on every query
- High per-query costs
- Slower response times

### After (Optimized System)
```
Upload → Process Once → Store
Query → Find Company → Search Pre-processed Data → Answer
```
- Documents processed once when uploaded
- Lower per-query costs
- Much faster response times

## Setup Instructions

### 1. Install Dependencies

The system already includes the required dependencies:
- `chromadb` - Vector database for embeddings
- `openai` - For generating embeddings

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```env
# Required: AI Service Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Vector Database (defaults to localhost)
CHROMA_URL=http://localhost:8000

# Optional: Storage paths
UPLOAD_DIR=./uploads
PROCESSED_DIR=./processed
```

### 3. Start ChromaDB (Optional)

If you want to run ChromaDB separately:

```bash
# Install ChromaDB
pip install chromadb

# Start ChromaDB server
chroma run --host localhost --port 8000
```

Note: ChromaDB can also run in-memory mode (default configuration).

### 4. Process Existing Documents

Process your existing documents to enable the optimized system:

```bash
# Process all documents
curl -X POST http://localhost:3000/api/process-documents \
  -H "Content-Type: application/json" \
  -d '{"action": "process_all"}'

# Process documents for specific company
curl -X POST http://localhost:3000/api/process-documents \
  -H "Content-Type: application/json" \
  -d '{"action": "process_batch", "company": "company-name"}'
```

## API Endpoints

### Document Processing

#### Process Documents
- **POST** `/api/process-documents`
- Actions: `process_single`, `process_batch`, `process_all`, `queue_status`, `processed_stats`

#### Background Worker
- **POST** `/api/process-worker`
- Actions: `process_next`, `process_all_pending`, `clear_completed`

### Analysis

#### Optimized Analysis (New)
- **POST** `/api/analyze-optimized`
- Uses pre-processed data for faster responses

#### Migration System
- **POST** `/api/migrate-system`
- Supports parallel comparison and hybrid approach

## Migration Strategy

### Phase 1: Setup and Processing
1. Configure environment variables
2. Process existing documents
3. Monitor processing queue

### Phase 2: Parallel Testing
```javascript
// Test both systems in parallel
const response = await fetch('/api/migrate-system', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "What was the revenue growth?",
    useOptimized: true,
    compareResults: true  // Runs both systems
  })
});
```

### Phase 3: Full Migration
1. Switch to optimized endpoint
2. Monitor performance
3. Disable original system (optional)

## Usage Examples

### Processing Documents

```javascript
// Add single document to processing queue (automatic on upload)
const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

// Process queue item
const workerResponse = await fetch('/api/process-worker', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'process_next' })
});
```

### Optimized Analysis

```javascript
// Use optimized analysis
const analysisResponse = await fetch('/api/analyze-optimized', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "What are the key financial metrics for Q1 2024?",
    context: "Focus on revenue and profitability"
  })
});
```

### Migration Comparison

```javascript
// Compare both systems
const migrationResponse = await fetch('/api/migrate-system', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "Analyze the company's debt levels",
    compareResults: true
  })
});

const { comparison, performanceMetrics } = await migrationResponse.json();
console.log('Speed improvement:', performanceMetrics.speedImprovement);
```

## Performance Benefits

### Cost Reduction
- **Before**: Process documents on every query (high token usage)
- **After**: Process documents once, search pre-processed data (low token usage)
- **Estimated savings**: 60-80% reduction in AI processing costs

### Speed Improvement
- **Before**: 15-30 seconds per query (document processing time)
- **After**: 2-5 seconds per query (search + generation time)
- **Improvement**: 5-10x faster response times

### Scalability
- **Before**: Linear cost increase with query volume
- **After**: Linear cost increase with document volume only

## System Monitoring

### Check Migration Readiness
```bash
curl http://localhost:3000/api/migrate-system?action=readiness
```

### Monitor Processing Queue
```bash
curl http://localhost:3000/api/process-worker?action=status
```

### View Processing Statistics
```bash
curl http://localhost:3000/api/process-documents?action=processed_stats
```

## Troubleshooting

### Common Issues

1. **No processed data found**
   - Run document processing first
   - Check processing queue status

2. **Vector database connection failed**
   - Ensure ChromaDB is running (if using external server)
   - Check CHROMA_URL configuration

3. **Processing queue stuck**
   - Check background worker status
   - Manually trigger processing

### Fallback Strategy

The system automatically falls back to the original method if:
- No processed data is available
- Vector database is unavailable
- Processing fails

## Cost Estimation

### Current System (per 1000 queries)
- Document processing: ~$50-100
- Analysis generation: ~$10-20
- **Total**: ~$60-120

### Optimized System (per 1000 queries)
- Pre-processing (one-time): ~$20-40
- Search + analysis: ~$5-10
- **Total**: ~$5-10 (after initial processing)

**ROI**: Break-even after ~100-200 queries per document

## Next Steps

1. **Immediate**: Process existing documents
2. **Short-term**: Test parallel comparison
3. **Medium-term**: Migrate to optimized system
4. **Long-term**: Monitor and optimize performance

For technical support or questions, refer to the API documentation or check the server logs for detailed error messages.