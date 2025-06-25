# DocketCC: Architecture & Setup Guide

## System Overview

DocketCC transforms FCC filing monitoring into an intelligent, automated service. Users subscribe to dockets via a dashboard, receive AI-summarized email digests, and can upgrade from free (1 docket) to Pro ($2.99/month, unlimited dockets).

### The Four Core Systems

```
🌐 Dashboard (Control Panel)
├── User authentication (Google OAuth)
├── Docket subscription management
├── Pro upgrade flow ($2.99/month)
└── Admin analytics dashboard

🔄 Ingestion Engine (Collector)
├── Runs every 15 minutes via cron
├── Fetches new filings from FCC ECFS API
├── Processes documents with Gemini AI
└── Stores summaries in database

📧 Notification System (Mailroom)
├── Runs every hour via cron
├── Compiles email digests per user
├── Sends via Resend API
└── Tracks delivery and engagement

🤖 AI Brain (Summarizer)
├── Processes PDF/Word documents from URLs
├── Google Gemini 1.5 Flash API
├── Generates 2-4 sentence summaries
└── Handles processing failures gracefully
```

## Tech Stack Decisions

### Core Infrastructure: Cloudflare Ecosystem

- **Serverless Functions**: Cloudflare Workers (free tier: 100k requests/day)
- **Database**: Cloudflare D1 SQL (free tier: 5 GB storage)
- **Frontend Hosting**: Cloudflare Pages (unlimited static sites)
- **CDN & Security**: Cloudflare global network (automatic SSL)

### Authentication: Google OAuth (Recommended)

- **Why OAuth over email/password**: Better UX, no password storage, Google mandate by March 2025
- **Implementation**: Auth.js with SvelteKit
- **Session Storage**: Cloudflare KV (free tier: 10 GB)
- **Security**: HTTPS required, separate dev/prod OAuth clients

### External APIs

- **AI Processing**: Google Gemini 1.5 Flash ($0.075 per 1M input tokens)
- **Email Delivery**: Resend (free tier: 3k emails/month)
- **Payment Processing**: Stripe ($2.99/month subscriptions)
- **Data Source**: FCC ECFS API (free with registration)

### Frontend Framework: SvelteKit

- **Why SvelteKit**: Excellent Cloudflare Workers integration, smaller bundle size
- **Alternative**: Remix (also well-supported)
- **UI Components**: TailwindCSS for styling

## Database Schema Design

```sql
-- Core user management
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    google_id TEXT UNIQUE,  -- OAuth integration
    name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'pro')),
    stripe_customer_id TEXT,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
);

-- Docket registry with search optimization
CREATE TABLE Dockets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docket_number TEXT NOT NULL UNIQUE,
    title TEXT,
    bureau TEXT,
    description TEXT,
    status TEXT,
    created_at INTEGER NOT NULL
);

-- User subscriptions with frequency preferences
CREATE TABLE UserDocketSubscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    docket_id INTEGER NOT NULL,
    notification_frequency TEXT NOT NULL CHECK(notification_frequency IN ('daily', 'weekly', 'hourly')),
    last_notified_at INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (docket_id) REFERENCES Dockets(id) ON DELETE CASCADE,
    UNIQUE(user_id, docket_id)
);

-- Filing storage with AI summaries
CREATE TABLE Filings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fcc_filing_id TEXT NOT NULL UNIQUE,
    docket_id INTEGER NOT NULL,
    title TEXT,
    author TEXT,
    author_organization TEXT,
    filing_url TEXT,
    document_urls TEXT, -- JSON array of document URLs
    filed_at INTEGER,
    fetched_at INTEGER NOT NULL,
    summary TEXT,
    summary_generated_at INTEGER,
    processing_status TEXT DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processed', 'failed')),
    FOREIGN KEY (docket_id) REFERENCES Dockets(id)
);

-- Docket search enhancement (keyword mapping)
CREATE TABLE DocketKeywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docket_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    relevance_score INTEGER DEFAULT 1,
    FOREIGN KEY (docket_id) REFERENCES Dockets(id),
    UNIQUE(docket_id, keyword)
);

-- Admin and analytics
CREATE TABLE AdminUsers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'super_admin')),
    granted_at INTEGER NOT NULL,
    granted_by TEXT,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Performance indexes
CREATE INDEX idx_filings_docket_filed ON Filings(docket_id, filed_at DESC);
CREATE INDEX idx_subscriptions_user_active ON UserDocketSubscriptions(user_id, is_active);
CREATE INDEX idx_filings_processing_status ON Filings(processing_status, fetched_at);
CREATE INDEX idx_docket_keywords_keyword ON DocketKeywords(keyword);
```

## Project Structure (Single Repository)

```
docketcc/
├── src/
│   ├── lib/
│   │   ├── auth.js                 # Google OAuth setup
│   │   ├── database.js             # D1 database operations
│   │   ├── email.js                # Email template system
│   │   ├── fcc-api.js              # ECFS API integration
│   │   ├── gemini.js               # AI document processing
│   │   ├── stripe.js               # Payment processing
│   │   ├── validation.js           # Input validation schemas
│   │   └── docket-search.js        # Hybrid docket search
│   ├── routes/
│   │   ├── auth/
│   │   │   ├── login/+page.svelte
│   │   │   ├── callback/+page.server.js
│   │   │   └── logout/+page.server.js
│   │   ├── dashboard/
│   │   │   ├── +layout.svelte
│   │   │   ├── +page.svelte        # Main dashboard
│   │   │   ├── dockets/+page.svelte
│   │   │   └── settings/+page.svelte
│   │   ├── admin/
│   │   │   ├── +layout.server.js   # Admin auth check
│   │   │   ├── +page.svelte        # Admin overview
│   │   │   ├── users/+page.svelte
│   │   │   └── analytics/+page.svelte
│   │   ├── api/
│   │   │   ├── dockets/+server.js  # Docket CRUD
│   │   │   ├── search/+server.js   # Docket search
│   │   │   └── webhooks/stripe/+server.js
│   │   └── upgrade/+page.svelte    # Pro upgrade flow
│   ├── workers/
│   │   ├── ingestion.js            # Cron: FCC data collection
│   │   ├── notifications.js        # Cron: Email sending
│   │   └── main.js                 # Main web worker
│   ├── components/
│   │   ├── DocketList.svelte
│   │   ├── UpgradeModal.svelte
│   │   ├── FileUpload.svelte
│   │   └── AdminChart.svelte
│   └── test/
│       ├── setup.js                # Test configuration
│       ├── auth.test.js
│       ├── dockets.test.js
│       ├── fcc-api.test.js
│       ├── gemini.test.js
│       └── email.test.js
├── wrangler.toml                   # Cloudflare Workers config
├── package.json
├── vitest.config.js               # Testing setup
├── tailwind.config.js
├── schema.sql                     # Database schema
└── migrations/
    ├── 001_initial.sql
    ├── 002_add_keywords.sql
    └── 003_add_admin.sql
```

## Environment Configuration

### Development Environment

```bash
# .env (local development)
ENVIRONMENT=development
PUBLIC_BASE_URL=http://localhost:5173

# Google OAuth (development)
GOOGLE_CLIENT_ID=your-dev-client-id
GOOGLE_CLIENT_SECRET=your-dev-secret
AUTH_SECRET=your-32-char-secret

# API Keys (use DEMO_KEY for testing)
FCC_API_KEY=DEMO_KEY
GEMINI_API_KEY=your-gemini-key
RESEND_API_KEY=your-resend-key
STRIPE_SECRET_KEY=sk_test_...

# Database
DATABASE_URL=your-local-d1-url
```

### Production Environment (Cloudflare Workers)

```toml
# wrangler.toml
name = "docketcc"
main = "src/workers/main.js"
compatibility_date = "2024-06-24"

[env.production]
name = "docketcc-prod"
vars = {
  ENVIRONMENT = "production",
  PUBLIC_BASE_URL = "https://docketcc.com"
}

[[env.production.d1_databases]]
binding = "DB"
database_name = "docketcc-production"
database_id = "your-d1-id"

[[env.production.kv_namespaces]]
binding = "KV"
id = "your-kv-id"

# Cron workers
[[workers]]
name = "docketcc-ingestion"
script = "src/workers/ingestion.js"
cron = ["*/15 * * * *"]  # Every 15 minutes

[[workers]]
name = "docketcc-notifications"
script = "src/workers/notifications.js"
cron = ["0 * * * *"]     # Every hour
```

## Hybrid Docket Search Strategy

### The Challenge

FCC ECFS API only supports exact docket number searches, not keyword/name searches like "Lifeline" → docket numbers.

### Solution: Multi-Layer Search

```javascript
// 1. Local keyword database
const DOCKET_KEYWORDS = {
	lifeline: ['11-42', '17-287'],
	broadband: ['17-108', '18-143'],
	'net neutrality': ['17-108'],
	rural: ['10-90', '17-287']
};

// 2. Hybrid search function
async function searchDockets(query) {
	const results = [];

	// Check if it's a docket number format (XX-XXX)
	if (/^\d{2}-\d+$/.test(query)) {
		const docket = await getDocketInfo(query);
		if (docket) results.push(docket);
	}

	// Search local keyword mapping
	const keywords = query.toLowerCase().split(' ');
	for (const keyword of keywords) {
		if (DOCKET_KEYWORDS[keyword]) {
			for (const docketNum of DOCKET_KEYWORDS[keyword]) {
				const docket = await getDocketInfo(docketNum);
				if (docket) results.push(docket);
			}
		}
	}

	// Search database for partial matches
	const dbResults = await searchDocketDatabase(query);
	results.push(...dbResults);

	return deduplicateResults(results);
}
```

## Development Philosophy

### Keep It Simple

- **Start with basic functionality, enhance incrementally**
- **Use proven libraries and patterns**
- **Avoid over-engineering for MVP**
- **Fail gracefully with useful error messages**

### Error Handling Strategy

- **Single attempt for external APIs with fallbacks**
- **Log errors and continue processing**
- **Use simple fallback messages for users**
- **Don't block entire operations for single failures**

### Cost Optimization

- **Leverage free tiers aggressively**
- **Cache frequently accessed data**
- **Batch processing where possible**
- **Monitor usage and optimize hot paths**

## Security Considerations

### OAuth Security

- **Use HTTPS everywhere in production**
- **Separate OAuth clients for dev/staging/production**
- **Implement proper CSRF protection**
- **Validate all OAuth tokens server-side**

### API Security

- **Store all secrets in Cloudflare environment variables**
- **Implement rate limiting on public endpoints**
- **Validate all user inputs**
- **Use parameterized database queries**

### Data Protection

- **No storage of OAuth access tokens**
- **Encrypt sensitive data at rest**
- **Implement proper session management**
- **Regular security audits of dependencies**

## Cost Estimates (Monthly)

### Free Tier Usage

- **Cloudflare Workers**: 100k requests/day = ~3M/month (covered)
- **Cloudflare D1**: 5GB storage, 25M read/write operations (covered)
- **Google OAuth**: Free for standard usage
- **Resend**: 3k emails/month (covered for MVP)
- **FCC ECFS API**: Free with registration

### Paid Tier Estimates

- **Gemini API**: ~$1-10/month depending on document volume
- **Stripe**: 2.9% + $0.30 per transaction
- **Cloudflare overages**: $0.50 per million requests beyond free tier

**Total MVP costs: $1-15/month with room to scale**

## Next Steps

1. **Create Cursor project** with this structure
2. **Set up Google OAuth** following Auth.js documentation
3. **Initialize database schema** with migration scripts
4. **Implement basic authentication flow**
5. **Build docket search with keyword mapping**
6. **Add FCC API integration**
7. **Integrate Gemini document processing**
8. **Set up email notification system**

This architecture provides a solid foundation for rapid development while maintaining scalability and cost-effectiveness.
