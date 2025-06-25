# Phase 3 Setup: Data Pipeline Implementation

## Overview

Phase 3 implements the complete data pipeline for DocketCC, including:

1. **FCC API Integration** - Fetches new filings from FCC ECFS API
2. **Gemini AI Integration** - Processes documents and generates summaries
3. **Ingestion Worker** - Automated cron job that runs every 15 minutes

## ✅ Implementation Status

All Phase 3 components have been implemented:

- ✅ `FCCAPIClient` class in `src/lib/fcc-api.js`
- ✅ `GeminiProcessor` class in `src/lib/gemini.js`
- ✅ Ingestion worker in `src/workers/ingestion.js`
- ✅ Main worker handler in `src/workers/main.js`
- ✅ Database methods for filing storage
- ✅ Cron job configuration in `wrangler.toml`

## 🔧 Required Environment Variables

Set these in your Cloudflare dashboard or via `wrangler secret put`:

```bash
# FCC API Access
wrangler secret put FCC_API_KEY

# Gemini AI Access
wrangler secret put GEMINI_API_KEY

# Authentication (from Phase 2)
wrangler secret put AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

# Stripe (from Phase 2)
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

## 🗄️ Database Configuration

The database already includes the necessary tables from Phase 1:

```sql
-- Filings table (already exists)
CREATE TABLE Filings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fcc_filing_id TEXT NOT NULL UNIQUE,
    docket_id INTEGER NOT NULL,
    title TEXT,
    author TEXT,
    author_organization TEXT,
    filing_url TEXT,
    document_urls TEXT,
    filed_at INTEGER,
    fetched_at INTEGER NOT NULL,
    summary TEXT,
    summary_generated_at INTEGER,
    processing_status TEXT DEFAULT 'pending',
    FOREIGN KEY (docket_id) REFERENCES Dockets(id)
);
```

## 🚀 Deployment Steps

### 1. Test the Implementation

```bash
# Run the Phase 3 test script
node scripts/test-phase3.js
```

### 2. Deploy to Cloudflare Workers

```bash
# Deploy to development
wrangler deploy --env development

# Deploy to production
wrangler deploy --env production
```

### 3. Configure Cron Triggers

The cron triggers are already configured in `wrangler.toml`:

- **Every 15 minutes**: Ingestion worker fetches new filings
- **Every hour**: Notification worker (Phase 4)

### 4. Verify Deployment

```bash
# Test the ingestion worker manually
curl -X POST https://your-worker.your-subdomain.workers.dev/trigger-ingestion

# Check worker logs
wrangler tail --env production
```

## 📊 How It Works

### Ingestion Flow

1. **Cron Trigger**: Every 15 minutes, Cloudflare triggers the ingestion worker
2. **Active Dockets**: Worker fetches all dockets with active user subscriptions
3. **FCC API**: For each docket, fetches new filings since last run
4. **Gemini AI**: Processes document URLs and generates summaries
5. **Database**: Stores processed filings with summaries

### Rate Limiting

- **FCC API**: 1 second delay between filings, 2 seconds between dockets
- **Gemini API**: 30 second timeout per document, processes max 2 documents per filing
- **Graceful Degradation**: Continues processing even if some filings fail

## 🔍 Monitoring

### Worker Logs

```bash
# View real-time logs
wrangler tail --env production

# View logs for specific worker
wrangler tail --env production --format json
```

### Key Metrics to Monitor

- **Filings processed per run**: Should be > 0 for active dockets
- **Processing success rate**: Should be > 90%
- **API error rates**: Should be < 5%
- **Processing time**: Ingestion should complete within 10 minutes

## 🛠️ Troubleshooting

### Common Issues

1. **No filings found**: 
   - Check if users have active docket subscriptions
   - Verify FCC API key is valid

2. **Gemini AI errors**:
   - Check GEMINI_API_KEY is set correctly
   - Monitor API quotas and billing

3. **Database errors**:
   - Verify D1 database is properly configured
   - Check for schema migrations

### Manual Testing

```bash
# Test FCC API directly
curl "https://publicapi.fcc.gov/ecfs/filings?proceedings.name=17-108&api_key=YOUR_KEY&limit=5"

# Test ingestion worker
curl -X POST https://your-worker.workers.dev/trigger-ingestion
```

## 📈 Performance Optimization

### Recommended Settings

- **Worker CPU time**: 30 seconds (sufficient for most runs)
- **Memory**: 128MB (default is adequate)
- **Concurrent requests**: Handled automatically by Cloudflare

### Cost Optimization

- **FCC API**: Free (rate limited)
- **Gemini AI**: ~$0.075 per 1M tokens (estimate $0.15 per 1000 filings)
- **Cloudflare Workers**: $5/month for 10M requests

## 🔄 Next Steps

After Phase 3 is successfully deployed:

1. **Phase 4**: Email notifications to users
2. **Monitoring**: Set up alerts for failed ingestion runs
3. **Scaling**: Add more dockets based on user demand
4. **Analytics**: Track user engagement with summaries

## 📚 Additional Resources

- [FCC ECFS API Documentation](https://www.fcc.gov/ecfs/help/api)
- [Google Gemini API Documentation](https://developers.google.com/generative-ai/docs)
- [Cloudflare Workers Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/) 