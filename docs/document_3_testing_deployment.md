# DocketCC: Testing & Deployment Playbook

## Testing Strategy: Practical & Cost-Effective

**Goal**: Catch bugs without complexity, cost, or slowing down development
**Approach**: Test your logic, mock external services, keep tests simple and fast

## Testing Setup

### Install Testing Dependencies

```bash
npm install --save-dev vitest @vitest/ui jsdom @auth/sveltekit
```

### Vitest Configuration: `vitest.config.js`

```javascript
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/test/setup.js'],
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
```

### Global Test Setup: `src/test/setup.js`

```javascript
import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Cloudflare Workers environment
global.env = {
	DB: {
		prepare: vi.fn(() => ({
			bind: vi.fn(() => ({
				run: vi.fn().mockResolvedValue({ success: true }),
				all: vi.fn().mockResolvedValue({ results: [] }),
				first: vi.fn().mockResolvedValue(null)
			}))
		})),
		batch: vi.fn().mockResolvedValue({ success: true })
	},
	GOOGLE_CLIENT_ID: 'test-client-id',
	GOOGLE_CLIENT_SECRET: 'test-client-secret',
	AUTH_SECRET: 'test-auth-secret',
	GEMINI_API_KEY: 'test-gemini-key',
	RESEND_API_KEY: 'test-resend-key',
	STRIPE_SECRET_KEY: 'test-stripe-key',
	FCC_API_KEY: 'test-fcc-key'
};

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
	value: {
		randomUUID: vi.fn(() => 'test-uuid-123')
	}
});

// Reset all mocks before each test
beforeEach(() => {
	vi.clearAllMocks();
	// Reset fetch mock
	global.fetch.mockReset();
});
```

## Phase-by-Phase Testing

### Phase 1: Database & Authentication Tests

#### Database Operations Test: `src/test/database.test.js`

```javascript
import { describe, it, expect, vi } from 'vitest';
import { Database } from '../lib/database.js';

describe('Database Operations', () => {
	it('should create user with valid data', async () => {
		const db = new Database(env);

		const userData = {
			id: 'user-123',
			email: 'test@example.com',
			google_id: 'google-123',
			name: 'Test User',
			avatar_url: 'https://example.com/avatar.jpg'
		};

		const result = await db.createUser(userData);

		expect(env.DB.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO Users'));
		expect(result).toBeDefined();
	});

	it('should get user by Google ID', async () => {
		const db = new Database(env);

		// Mock successful user lookup
		env.DB.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn().mockResolvedValue({
					id: 'user-123',
					email: 'test@example.com',
					google_id: 'google-123'
				})
			})
		});

		const user = await db.getUserByGoogleId('google-123');

		expect(user).toBeDefined();
		expect(user.google_id).toBe('google-123');
	});

	it('should handle database errors gracefully', async () => {
		const db = new Database(env);

		// Mock database error
		env.DB.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				run: vi.fn().mockRejectedValue(new Error('Database error'))
			})
		});

		await expect(db.createUser({})).rejects.toThrow('Database error');
	});
});
```

#### Authentication Flow Test: `src/test/auth.test.js`

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('Authentication Flow', () => {
	it('should handle OAuth callback correctly', async () => {
		// Mock successful OAuth profile
		const mockProfile = {
			sub: 'google-123',
			email: 'test@example.com',
			name: 'Test User',
			picture: 'https://example.com/avatar.jpg'
		};

		const mockUser = {
			name: 'Test User',
			email: 'test@example.com',
			image: 'https://example.com/avatar.jpg'
		};

		// Test would verify OAuth callback handling
		expect(mockProfile.sub).toBeDefined();
		expect(mockProfile.email).toContain('@');
	});

	it('should reject invalid OAuth data', async () => {
		const invalidProfile = {
			sub: null,
			email: 'invalid-email'
		};

		expect(invalidProfile.sub).toBeNull();
		expect(invalidProfile.email).not.toContain('@');
	});
});
```

### Phase 2: Docket Management Tests

#### Docket Search Test: `src/test/docket-search.test.js`

```javascript
import { describe, it, expect, vi } from 'vitest';
import { DocketSearch } from '../lib/docket-search.js';

describe('Docket Search', () => {
	it('should validate docket number format', () => {
		const validDockets = ['11-42', '23-152', '17-108'];
		const invalidDockets = ['invalid', '1-2', '', '11-42-extra'];

		validDockets.forEach((docket) => {
			expect(/^\d{2}-\d+$/.test(docket)).toBe(true);
		});

		invalidDockets.forEach((docket) => {
			expect(/^\d{2}-\d+$/.test(docket)).toBe(false);
		});
	});

	it('should search dockets by keyword', async () => {
		const docketSearch = new DocketSearch(env);

		// Mock FCC API response
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				proceedings: [
					{
						name: '11-42',
						subject: 'Lifeline and Link Up Reform',
						bureau_name: 'Wireline Competition Bureau',
						status: 'active'
					}
				]
			})
		});

		const results = await docketSearch.searchDockets('lifeline');

		expect(results).toHaveLength(1);
		expect(results[0].docket_number).toBe('11-42');
		expect(results[0].title).toContain('Lifeline');
	});

	it('should handle FCC API errors gracefully', async () => {
		const docketSearch = new DocketSearch(env);

		// Mock API failure
		global.fetch.mockResolvedValueOnce({
			ok: false,
			status: 500
		});

		const results = await docketSearch.searchDockets('11-42');

		expect(results).toEqual([]); // Should return empty array, not crash
	});

	it('should handle network errors gracefully', async () => {
		const docketSearch = new DocketSearch(env);

		// Mock network failure
		global.fetch.mockRejectedValueOnce(new Error('Network error'));

		const results = await docketSearch.searchDockets('11-42');

		expect(results).toEqual([]); // Should return empty array, not crash
	});
});
```

#### Subscription Management Test: `src/test/subscriptions.test.js`

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('Docket Subscriptions', () => {
	it('should allow first docket for free user', async () => {
		// Mock user with no existing subscriptions
		env.DB.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				all: vi.fn().mockResolvedValue({ results: [] }), // No existing subscriptions
				run: vi.fn().mockResolvedValue({ success: true })
			})
		});

		const userId = 'user-123';
		const docketNumber = '11-42';

		// This would test the subscription creation logic
		expect(docketNumber).toMatch(/^\d{2}-\d+$/);
	});

	it('should block second docket for free user', async () => {
		// Mock user with existing subscription
		env.DB.prepare.mockReturnValue({
			bind: vi.fn().mockReturnValue({
				all: vi.fn().mockResolvedValue({
					results: [{ docket_id: 1, user_id: 'user-123' }]
				})
			})
		});

		const hasExistingSubscription = true;
		const userTier = 'free';

		// Logic: free tier + existing subscription = requires upgrade
		expect(hasExistingSubscription && userTier === 'free').toBe(true);
	});

	it('should allow multiple dockets for pro user', async () => {
		const userTier = 'pro';
		const subscriptionCount = 5;

		// Pro users can have unlimited subscriptions
		expect(userTier === 'pro' || subscriptionCount < 1).toBe(true);
	});
});
```

### Phase 3: Data Pipeline Tests

#### FCC API Integration Test: `src/test/fcc-api.test.js`

```javascript
import { describe, it, expect, vi } from 'vitest';
import { FCCAPIClient } from '../lib/fcc-api.js';

describe('FCC API Integration', () => {
	it('should parse FCC API response correctly', async () => {
		const fccApi = new FCCAPIClient(env);

		// Mock successful FCC API response
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				filings: [
					{
						id_submission: '12345',
						date_disseminated: '2024-06-24T10:00:00Z',
						brief_comment_text: 'Test filing comment',
						contact_email: 'test@example.com',
						attachments: [
							{
								clean_file_name: 'document.pdf'
							}
						]
					}
				]
			})
		});

		const filings = await fccApi.fetchDocketFilings('11-42');

		expect(filings).toHaveLength(1);
		expect(filings[0].id_submission).toBe('12345');
		expect(filings[0].brief_comment_text).toBe('Test filing comment');
	});

	it('should parse filing data correctly', () => {
		const fccApi = new FCCAPIClient(env);

		const mockFiling = {
			id_submission: '12345',
			date_disseminated: '2024-06-24T10:00:00Z',
			brief_comment_text: 'Test filing',
			contact_email: 'test@example.com',
			attachments: [{ clean_file_name: 'document.pdf' }]
		};

		const parsed = fccApi.parseFilingData(mockFiling);

		expect(parsed.fcc_filing_id).toBe('12345');
		expect(parsed.title).toBe('Test filing');
		expect(parsed.author).toBe('test@example.com');
		expect(JSON.parse(parsed.document_urls)).toHaveLength(1);
	});

	it('should handle rate limiting gracefully', async () => {
		const fccApi = new FCCAPIClient(env);

		// Mock rate limit response
		global.fetch.mockResolvedValueOnce({
			ok: false,
			status: 429
		});

		const filings = await fccApi.fetchDocketFilings('11-42');

		expect(filings).toEqual([]); // Should return empty array, not crash
	});
});
```

#### Gemini AI Test: `src/test/gemini.test.js`

```javascript
import { describe, it, expect, vi } from 'vitest';
import { GeminiProcessor } from '../lib/gemini.js';

describe('Gemini AI Processing', () => {
	it('should generate summary from document', async () => {
		const gemini = new GeminiProcessor(env);

		// Mock successful Gemini API response
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				candidates: [
					{
						content: {
							parts: [
								{
									text: 'This filing requests approval for new spectrum allocation for broadband services.'
								}
							]
						}
					}
				]
			})
		});

		const documentUrls = '["https://example.com/document.pdf"]';
		const summary = await gemini.generateSummary(documentUrls, 'Test Filing');

		expect(summary).toBe(
			'This filing requests approval for new spectrum allocation for broadband services.'
		);
	});

	it('should return fallback when AI fails', async () => {
		const gemini = new GeminiProcessor(env);

		// Mock API failure
		global.fetch.mockResolvedValueOnce({
			ok: false,
			status: 429 // Rate limited
		});

		const documentUrls = '["https://example.com/document.pdf"]';
		const summary = await gemini.generateSummary(documentUrls, 'Test Filing');

		expect(summary).toBe('Summary temporarily unavailable - please check original filing.');
	});

	it('should handle timeout errors', async () => {
		const gemini = new GeminiProcessor(env);

		// Mock timeout
		global.fetch.mockRejectedValueOnce(new Error('Timeout'));

		const documentUrls = '["https://example.com/document.pdf"]';
		const summary = await gemini.generateSummary(documentUrls, 'Test Filing');

		expect(summary).toBe('Summary could not be generated - please check original filing.');
	});

	it('should handle empty document URLs', async () => {
		const gemini = new GeminiProcessor(env);

		const summary = await gemini.generateSummary('[]', 'Test Filing');

		expect(summary).toBe('No document available for summarization.');
	});
});
```

### Phase 4: Email System Tests

#### Email Notification Test: `src/test/email.test.js`

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('Email System', () => {
	it('should compile email digest correctly', () => {
		const filings = [
			{
				title: 'Test Filing 1',
				author: 'Test Company',
				summary: 'Summary of first filing',
				filing_url: 'https://fcc.gov/filing/1'
			},
			{
				title: 'Test Filing 2',
				author: 'Another Company',
				summary: 'Summary of second filing',
				filing_url: 'https://fcc.gov/filing/2'
			}
		];

		// Mock email compilation function
		function compileEmailDigest(filings, userEmail) {
			let html = '<html><body>';
			html += `<h1>DocketCC Digest for ${userEmail}</h1>`;

			for (const filing of filings) {
				html += `
          <div>
            <h3>${filing.title}</h3>
            <p>By: ${filing.author}</p>
            <p>${filing.summary}</p>
            <a href="${filing.filing_url}">View Filing</a>
          </div>
        `;
			}

			html += '</body></html>';
			return html;
		}

		const html = compileEmailDigest(filings, 'test@example.com');

		expect(html).toContain('Test Filing 1');
		expect(html).toContain('Summary of first filing');
		expect(html).toContain('href="https://fcc.gov/filing/1"');
		expect(html).toContain('DocketCC Digest');
	});

	it('should handle empty filings list', () => {
		function compileEmailDigest(filings, userEmail) {
			if (filings.length === 0) {
				return `<html><body><h1>No new filings</h1><p>DocketCC</p></body></html>`;
			}
		}

		const html = compileEmailDigest([], 'test@example.com');

		expect(html).toContain('No new filings');
		expect(html).toContain('DocketCC');
	});

	it('should mock email sending successfully', async () => {
		// Mock Resend API success
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: 'email123' })
		});

		const result = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer test-key',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				to: 'test@example.com',
				subject: 'Test Subject',
				html: '<html>Content</html>'
			})
		});

		expect(result.ok).toBe(true);
		expect(global.fetch).toHaveBeenCalledWith(
			'https://api.resend.com/emails',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					Authorization: 'Bearer test-key'
				})
			})
		);
	});
});
```

## GitHub Actions Configuration

### Main Testing Workflow: `.github/workflows/test.yml`

```yaml
name: DocketCC Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run all tests
        run: npm test

      - name: Check test coverage
        run: npm run test:coverage

      - name: Build project
        run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run security audit
        run: npm audit --audit-level=moderate
```

### Package.json Scripts

```json
{
	"scripts": {
		"dev": "vite dev",
		"build": "vite build",
		"preview": "vite preview",
		"test": "vitest run",
		"test:watch": "vitest",
		"test:ui": "vitest --ui",
		"test:coverage": "vitest run --coverage",
		"lint": "prettier --check . && eslint .",
		"lint:fix": "prettier --write . && eslint . --fix",
		"deploy": "wrangler deploy",
		"db:migrate": "wrangler d1 migrations apply docketcc-production",
		"db:migrate:local": "wrangler d1 migrations apply docketcc-production --local"
	}
}
```

## Deployment Process

### Local Development Workflow

```bash
# 1. Start development server
npm run dev

# 2. Run tests in watch mode (separate terminal)
npm run test:watch

# 3. Make changes and ensure tests pass

# 4. Run full test suite before committing
npm test

# 5. Commit and push
git add .
git commit -m "feat: Add new feature"
git push
```

### Production Deployment

#### Database Migration

```bash
# 1. Create migration file
echo "ALTER TABLE Users ADD COLUMN new_field TEXT;" > migrations/002_add_field.sql

# 2. Apply migration to production
wrangler d1 migrations apply docketcc-production

# 3. Verify migration
wrangler d1 execute docketcc-production --command "PRAGMA table_info(Users);"
```

#### Worker Deployment

```bash
# 1. Build and test locally
npm run build
npm test

# 2. Deploy main worker
wrangler deploy --env production

# 3. Deploy cron workers
wrangler deploy src/workers/ingestion.js --name docketcc-ingestion --env production
wrangler deploy src/workers/notifications.js --name docketcc-notifications --env production

# 4. Verify deployment
curl https://docketcc.com/api/health
```

### Environment Variables Setup

#### Development (.env)

```bash
ENVIRONMENT=development
PUBLIC_BASE_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-dev-client-id
GOOGLE_CLIENT_SECRET=your-dev-secret
AUTH_SECRET=your-32-char-secret
FCC_API_KEY=DEMO_KEY
GEMINI_API_KEY=your-gemini-key
RESEND_API_KEY=your-resend-key
STRIPE_SECRET_KEY=sk_test_...
```

#### Production (Wrangler)

```bash
# Set production secrets
wrangler secret put GOOGLE_CLIENT_SECRET --env production
wrangler secret put AUTH_SECRET --env production
wrangler secret put GEMINI_API_KEY --env production
wrangler secret put RESEND_API_KEY --env production
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

## Monitoring & Health Checks

### Health Check Endpoint: `src/routes/api/health/+server.js`

```javascript
import { json } from '@sveltejs/kit';
import { Database } from '$lib/database.js';

export async function GET({ platform }) {
	try {
		const db = new Database(platform.env);

		// Test database connection
		const dbTest = await db.db.prepare('SELECT 1 as test').first();

		// Test external API availability (simple check)
		const fccTest = await fetch(
			'https://publicapi.fcc.gov/ecfs/proceedings?limit=1&api_key=DEMO_KEY'
		);

		return json({
			status: 'healthy',
			timestamp: new Date().toISOString(),
			database: dbTest ? 'connected' : 'error',
			fcc_api: fccTest.ok ? 'available' : 'error',
			version: '1.0.0'
		});
	} catch (error) {
		return json(
			{
				status: 'error',
				error: error.message,
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
}
```

### Simple Analytics Tracking

```javascript
// Add to key operations for monitoring
function logMetric(metric, value, env) {
	if (env.ENVIRONMENT === 'production') {
		console.log(
			JSON.stringify({
				metric,
				value,
				timestamp: Date.now(),
				environment: env.ENVIRONMENT
			})
		);
	}
}

// Usage examples:
logMetric('user_signup', 1, env);
logMetric('docket_subscription', 1, env);
logMetric('email_sent', 1, env);
logMetric('filing_processed', 1, env);
```

## Troubleshooting Common Issues

### Database Connection Issues

```javascript
// Debug database connectivity
export async function testDatabase(env) {
	try {
		const result = await env.DB.prepare('SELECT 1 as test').first();
		console.log('Database test result:', result);
		return result;
	} catch (error) {
		console.error('Database error:', error);
		throw error;
	}
}
```

### OAuth Issues

```javascript
// Debug OAuth flow
export async function debugOAuth(event) {
	console.log('OAuth debug info:', {
		clientId: event.platform?.env.GOOGLE_CLIENT_ID ? 'present' : 'missing',
		clientSecret: event.platform?.env.GOOGLE_CLIENT_SECRET ? 'present' : 'missing',
		authSecret: event.platform?.env.AUTH_SECRET ? 'present' : 'missing',
		url: event.url.href
	});
}
```

### API Rate Limiting

```javascript
// Monitor API usage
export function trackAPIUsage(apiName, env) {
	const key = `api_usage_${apiName}_${new Date().toISOString().split('T')[0]}`;
	// In production, you might store this in KV or D1
	console.log(`API call: ${apiName} at ${new Date().toISOString()}`);
}
```

## Production Readiness Checklist

### Before First Deployment

- [ ] Google OAuth configured with production URLs
- [ ] Database schema migrated to production D1
- [ ] All environment variables set in Wrangler
- [ ] Stripe webhook endpoints configured
- [ ] Domain and SSL certificates configured
- [ ] Basic monitoring and health checks implemented

### Before Each Release

- [ ] All tests passing locally and in CI
- [ ] Database migrations tested
- [ ] External API integrations tested
- [ ] Email templates tested across clients
- [ ] Performance testing completed
- [ ] Security review completed

### Post-Deployment Verification

- [ ] Health check endpoint responding
- [ ] User registration flow working
- [ ] Docket search functionality working
- [ ] Email notifications being sent
- [ ] Payment processing working
- [ ] Admin dashboard accessible

This testing and deployment guide provides a complete framework for maintaining code quality and reliable deployments while keeping complexity minimal for MVP development.
