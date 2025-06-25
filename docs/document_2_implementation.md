# DocketCC: Development Implementation Guide

## Development Phases & Dependencies

**Build Order**: Each phase must be completed before moving to the next. Dependencies are clearly marked.

## Phase 1: Foundation (Days 1-3)

### 1.1 Database Setup & Migrations

**Dependencies**: None - Start here
**Files to create**: `schema.sql`, `migrations/001_initial.sql`

```sql
-- migrations/001_initial.sql
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    google_id TEXT UNIQUE,
    name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'pro')),
    stripe_customer_id TEXT,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
);

CREATE TABLE Dockets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docket_number TEXT NOT NULL UNIQUE,
    title TEXT,
    bureau TEXT,
    description TEXT,
    status TEXT,
    created_at INTEGER NOT NULL
);

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
    processing_status TEXT DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processed', 'failed')),
    FOREIGN KEY (docket_id) REFERENCES Dockets(id)
);

-- Performance indexes
CREATE INDEX idx_filings_docket_filed ON Filings(docket_id, filed_at DESC);
CREATE INDEX idx_subscriptions_user_active ON UserDocketSubscriptions(user_id, is_active);
CREATE INDEX idx_filings_processing_status ON Filings(processing_status, fetched_at);
```

**Database Operations Helper**: `src/lib/database.js`

```javascript
export class Database {
	constructor(env) {
		this.db = env.DB;
	}

	async createUser(userData) {
		const { id, email, google_id, name, avatar_url } = userData;
		const stmt = this.db.prepare(`
      INSERT INTO Users (id, email, google_id, name, avatar_url, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
		return await stmt.bind(id, email, google_id, name, avatar_url, Date.now(), Date.now()).run();
	}

	async getUserById(id) {
		const stmt = this.db.prepare('SELECT * FROM Users WHERE id = ?');
		return await stmt.bind(id).first();
	}

	async getUserByGoogleId(google_id) {
		const stmt = this.db.prepare('SELECT * FROM Users WHERE google_id = ?');
		return await stmt.bind(google_id).first();
	}

	async updateUserLogin(id) {
		const stmt = this.db.prepare('UPDATE Users SET last_login_at = ? WHERE id = ?');
		return await stmt.bind(Date.now(), id).run();
	}
}
```

### 1.2 Google OAuth Implementation

**Dependencies**: Database setup complete
**Files to create**: `src/lib/auth.js`, `src/routes/auth/+page.server.js`

**OAuth Setup**: `src/lib/auth.js`

```javascript
import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { Database } from './database.js';

export const { handle, signIn, signOut } = SvelteKitAuth(async (event) => {
	const db = new Database(event.platform.env);

	return {
		providers: [
			Google({
				clientId: event.platform?.env.GOOGLE_CLIENT_ID,
				clientSecret: event.platform?.env.GOOGLE_CLIENT_SECRET,
				authorization: {
					params: {
						scope: 'openid email profile',
						access_type: 'offline',
						prompt: 'select_account'
					}
				}
			})
		],
		secret: event.platform?.env.AUTH_SECRET,
		trustHost: true,
		callbacks: {
			async signIn({ user, account, profile }) {
				try {
					// Check if user exists
					let existingUser = await db.getUserByGoogleId(profile.sub);

					if (!existingUser) {
						// Create new user
						const newUser = {
							id: crypto.randomUUID(),
							email: profile.email,
							google_id: profile.sub,
							name: profile.name,
							avatar_url: profile.picture
						};
						await db.createUser(newUser);
					} else {
						// Update last login
						await db.updateUserLogin(existingUser.id);
					}

					return true;
				} catch (error) {
					console.error('Sign in error:', error);
					return false;
				}
			},
			async session({ session, token }) {
				if (token?.sub) {
					const user = await db.getUserByGoogleId(token.sub);
					if (user) {
						session.user.id = user.id;
						session.user.subscription_tier = user.subscription_tier;
					}
				}
				return session;
			}
		}
	};
});
```

**Login Page**: `src/routes/auth/login/+page.svelte`

```svelte
<script>
	import { signIn } from '@auth/sveltekit/client';
	import { page } from '$app/stores';

	async function handleGoogleLogin() {
		await signIn('google', {
			callbackUrl: $page.url.searchParams.get('callbackUrl') || '/dashboard'
		});
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			<h2 class="mt-6 text-3xl font-extrabold text-gray-900">Welcome to DocketCC</h2>
			<p class="mt-2 text-sm text-gray-600">Monitor FCC filings with AI-powered summaries</p>
		</div>

		<button
			on:click={handleGoogleLogin}
			class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
		>
			<svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
				<!-- Google icon SVG -->
			</svg>
			Continue with Google
		</button>
	</div>
</div>
```

**App Layout with Auth**: `src/app.html`

```html
<!DOCTYPE html>
<html lang="en" %sveltekit.theme%>
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="%sveltekit.assets%/favicon.png" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>DocketCC - FCC Filing Monitor</title>
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover" class="bg-gray-50">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

## Phase 2: User Experience (Days 4-8)

### 2.1 Dashboard Frontend

**Dependencies**: Authentication working
**Files to create**: `src/routes/dashboard/+layout.svelte`, `src/routes/dashboard/+page.svelte`

**Protected Dashboard Layout**: `src/routes/dashboard/+layout.server.js`

```javascript
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	const session = await locals.getSession();

	if (!session?.user) {
		throw redirect(302, '/auth/login');
	}

	return {
		user: session.user
	};
}
```

**Dashboard Layout**: `src/routes/dashboard/+layout.svelte`

```svelte
<script>
	import { signOut } from '@auth/sveltekit/client';
	import { page } from '$app/stores';

	export let data;

	async function handleSignOut() {
		await signOut({ callbackUrl: '/' });
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Navigation -->
	<nav class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<h1 class="text-xl font-semibold">DocketCC</h1>
				</div>

				<div class="flex items-center space-x-4">
					<div class="flex items-center space-x-2">
						<img class="h-8 w-8 rounded-full" src={data.user.image} alt={data.user.name} />
						<span class="text-sm text-gray-700">{data.user.name}</span>
						{#if data.user.subscription_tier === 'pro'}
							<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">PRO</span>
						{/if}
					</div>

					<button on:click={handleSignOut} class="text-sm text-gray-500 hover:text-gray-700">
						Sign out
					</button>
				</div>
			</div>
		</div>
	</nav>

	<!-- Main content -->
	<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
		<slot />
	</main>
</div>
```

### 2.2 Docket Management System

**Dependencies**: Dashboard layout complete
**Files to create**: `src/lib/docket-search.js`, `src/routes/api/dockets/+server.js`

**Docket Search Logic**: `src/lib/docket-search.js`

```javascript
import { Database } from './database.js';

// Curated keyword to docket mapping
const DOCKET_KEYWORDS = {
	lifeline: ['11-42', '17-287'],
	broadband: ['17-108', '18-143', '14-58'],
	'net neutrality': ['17-108'],
	rural: ['10-90', '17-287'],
	accessibility: ['10-213', '13-46'],
	'emergency alert': ['15-91', '04-296'],
	robocalls: ['17-59', '02-278'],
	spectrum: ['12-268', '18-295']
};

export class DocketSearch {
	constructor(env) {
		this.db = new Database(env);
		this.fccApiKey = env.FCC_API_KEY;
	}

	async searchDockets(query) {
		const results = [];
		const seen = new Set();

		// 1. Check if it's a docket number format (XX-XXX)
		if (/^\d{2}-\d+$/.test(query.trim())) {
			const docket = await this.fetchDocketInfo(query.trim());
			if (docket) {
				results.push(docket);
				seen.add(docket.docket_number);
			}
		}

		// 2. Search keyword mapping
		const searchTerms = query.toLowerCase().split(/\s+/);
		for (const term of searchTerms) {
			if (DOCKET_KEYWORDS[term]) {
				for (const docketNum of DOCKET_KEYWORDS[term]) {
					if (!seen.has(docketNum)) {
						const docket = await this.fetchDocketInfo(docketNum);
						if (docket) {
							results.push(docket);
							seen.add(docketNum);
						}
					}
				}
			}
		}

		// 3. Search local database
		const dbResults = await this.searchLocalDockets(query);
		for (const docket of dbResults) {
			if (!seen.has(docket.docket_number)) {
				results.push(docket);
				seen.add(docket.docket_number);
			}
		}

		return results.slice(0, 10); // Limit results
	}

	async fetchDocketInfo(docketNumber) {
		try {
			const url = `https://publicapi.fcc.gov/ecfs/proceedings?proceedings.name=${docketNumber}&api_key=${this.fccApiKey}`;
			const response = await fetch(url);

			if (!response.ok) return null;

			const data = await response.json();
			if (data.proceedings && data.proceedings.length > 0) {
				const proc = data.proceedings[0];
				return {
					docket_number: proc.name,
					title: proc.subject || 'No title available',
					bureau: proc.bureau_name,
					description: proc.subject,
					status: proc.status || 'unknown'
				};
			}
		} catch (error) {
			console.error(`Error fetching docket ${docketNumber}:`, error);
		}
		return null;
	}

	async searchLocalDockets(query) {
		const stmt = this.db.db.prepare(`
      SELECT * FROM Dockets 
      WHERE title LIKE ? OR description LIKE ? OR docket_number LIKE ?
      ORDER BY created_at DESC LIMIT 5
    `);
		const searchPattern = `%${query}%`;
		const result = await stmt.bind(searchPattern, searchPattern, searchPattern).all();
		return result.results || [];
	}

	async addDocketToDatabase(docketInfo) {
		const stmt = this.db.db.prepare(`
      INSERT OR REPLACE INTO Dockets (docket_number, title, bureau, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
		return await stmt
			.bind(
				docketInfo.docket_number,
				docketInfo.title,
				docketInfo.bureau,
				docketInfo.description,
				docketInfo.status,
				Date.now()
			)
			.run();
	}
}
```

**Docket API Endpoints**: `src/routes/api/dockets/+server.js`

```javascript
import { json } from '@sveltejs/kit';
import { DocketSearch } from '$lib/docket-search.js';
import { Database } from '$lib/database.js';

export async function GET({ url, locals, platform }) {
	const session = await locals.getSession();
	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const query = url.searchParams.get('q');
	if (!query) {
		return json({ error: 'Query parameter required' }, { status: 400 });
	}

	try {
		const docketSearch = new DocketSearch(platform.env);
		const results = await docketSearch.searchDockets(query);

		return json({ dockets: results });
	} catch (error) {
		console.error('Docket search error:', error);
		return json({ error: 'Search failed' }, { status: 500 });
	}
}

export async function POST({ request, locals, platform }) {
	const session = await locals.getSession();
	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { docket_number, frequency = 'daily' } = await request.json();

		if (!/^\d{2}-\d+$/.test(docket_number)) {
			return json({ error: 'Invalid docket number format' }, { status: 400 });
		}

		const db = new Database(platform.env);

		// Check subscription limits
		const user = await db.getUserById(session.user.id);
		if (user.subscription_tier === 'free') {
			const existingSubscriptions = await db.getUserSubscriptions(session.user.id);
			if (existingSubscriptions.length >= 1) {
				return json(
					{
						error: 'Free tier limited to 1 docket',
						requiresUpgrade: true
					},
					{ status: 403 }
				);
			}
		}

		// Add docket if it doesn't exist
		const docketSearch = new DocketSearch(platform.env);
		const docketInfo = await docketSearch.fetchDocketInfo(docket_number);
		if (docketInfo) {
			await docketSearch.addDocketToDatabase(docketInfo);
		}

		// Subscribe user to docket
		const result = await db.addDocketSubscription(session.user.id, docket_number, frequency);

		return json({ success: true, subscription: result });
	} catch (error) {
		console.error('Add docket error:', error);
		return json({ error: 'Failed to add docket' }, { status: 500 });
	}
}
```

**Main Dashboard Page**: `src/routes/dashboard/+page.svelte`

```svelte
<script>
	import { onMount } from 'svelte';
	import DocketSearch from '$lib/components/DocketSearch.svelte';
	import DocketList from '$lib/components/DocketList.svelte';
	import UpgradeModal from '$lib/components/UpgradeModal.svelte';

	export let data;

	let userDockets = [];
	let showUpgradeModal = false;

	onMount(async () => {
		await loadUserDockets();
	});

	async function loadUserDockets() {
		try {
			const response = await fetch('/api/subscriptions');
			if (response.ok) {
				const result = await response.json();
				userDockets = result.subscriptions;
			}
		} catch (error) {
			console.error('Failed to load dockets:', error);
		}
	}

	async function handleDocketAdd(event) {
		const { docket_number, frequency } = event.detail;

		try {
			const response = await fetch('/api/dockets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ docket_number, frequency })
			});

			const result = await response.json();

			if (response.ok) {
				await loadUserDockets();
			} else if (result.requiresUpgrade) {
				showUpgradeModal = true;
			} else {
				alert(result.error);
			}
		} catch (error) {
			console.error('Failed to add docket:', error);
		}
	}
</script>

<div class="space-y-6">
	<div class="bg-white overflow-hidden shadow rounded-lg">
		<div class="px-4 py-5 sm:p-6">
			<h3 class="text-lg leading-6 font-medium text-gray-900">Add Docket Subscription</h3>
			<div class="mt-5">
				<DocketSearch on:docketAdd={handleDocketAdd} />
			</div>
		</div>
	</div>

	<div class="bg-white overflow-hidden shadow rounded-lg">
		<div class="px-4 py-5 sm:p-6">
			<h3 class="text-lg leading-6 font-medium text-gray-900">
				Your Subscriptions ({userDockets.length})
				{#if data.user.subscription_tier === 'free'}
					<span class="text-sm text-gray-500">/ 1 (Free Tier)</span>
				{/if}
			</h3>
			<div class="mt-5">
				<DocketList {userDockets} on:docketRemove={loadUserDockets} />
			</div>
		</div>
	</div>
</div>

{#if showUpgradeModal}
	<UpgradeModal on:close={() => (showUpgradeModal = false)} />
{/if}
```

### 2.3 Stripe Pro Upgrade Flow

**Dependencies**: Docket management working
**Files to create**: `src/lib/stripe.js`, `src/routes/api/webhooks/stripe/+server.js`

**Stripe Integration**: `src/lib/stripe.js`

```javascript
export class StripeIntegration {
	constructor(env) {
		this.stripeKey = env.STRIPE_SECRET_KEY;
		this.webhookSecret = env.STRIPE_WEBHOOK_SECRET;
	}

	async createCheckoutSession(userId, userEmail) {
		try {
			const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.stripeKey}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					'payment_method_types[0]': 'card',
					mode: 'subscription',
					customer_email: userEmail,
					client_reference_id: userId,
					'line_items[0][price]': 'price_your_price_id', // Replace with actual Stripe price ID
					'line_items[0][quantity]': '1',
					success_url: 'https://docketcc.com/dashboard?upgraded=true',
					cancel_url: 'https://docketcc.com/dashboard'
				})
			});

			if (!response.ok) {
				throw new Error('Stripe checkout creation failed');
			}

			const session = await response.json();
			return session.url;
		} catch (error) {
			console.error('Stripe error:', error);
			throw error;
		}
	}

	async handleWebhook(request) {
		try {
			const body = await request.text();
			const sig = request.headers.get('stripe-signature');

			// In production, verify webhook signature here
			const event = JSON.parse(body);

			return event;
		} catch (error) {
			console.error('Webhook verification failed:', error);
			throw error;
		}
	}
}
```

## Phase 3: Data Pipeline (Days 9-12)

### 3.1 FCC API Integration

**Dependencies**: Database and docket management complete
**Files to create**: `src/lib/fcc-api.js`, `src/workers/ingestion.js`

**FCC API Client**: `src/lib/fcc-api.js`

```javascript
export class FCCAPIClient {
	constructor(env) {
		this.apiKey = env.FCC_API_KEY;
		this.baseUrl = 'https://publicapi.fcc.gov/ecfs';
	}

	async fetchDocketFilings(docketNumber, sinceDate = null) {
		try {
			const params = new URLSearchParams({
				'proceedings.name': docketNumber,
				limit: '250',
				sort: 'date_disseminated,DESC',
				api_key: this.apiKey
			});

			if (sinceDate) {
				params.append('date_disseminated', `>=${sinceDate}`);
			}

			const response = await fetch(`${this.baseUrl}/filings?${params}`);

			if (response.status === 429) {
				// Rate limited - wait and return empty
				console.log(`Rate limited for docket ${docketNumber}`);
				return [];
			}

			if (!response.ok) {
				console.log(`FCC API error for docket ${docketNumber}: ${response.status}`);
				return [];
			}

			const data = await response.json();
			return data.filings || [];
		} catch (error) {
			console.log(`Network error for docket ${docketNumber}:`, error.message);
			return [];
		}
	}

	parseFilingData(filing) {
		// Extract document URLs from filing
		const documentUrls = [];

		if (filing.attachments && filing.attachments.length > 0) {
			for (const attachment of filing.attachments) {
				if (attachment.clean_file_name) {
					documentUrls.push(
						`https://ecfs.fcc.gov/api/filing/${filing.id_submission}/download/${attachment.clean_file_name}`
					);
				}
			}
		}

		return {
			fcc_filing_id: filing.id_submission,
			title: filing.brief_comment_text || 'Filing',
			author: filing.contact_email || 'Unknown',
			author_organization: filing.lawfirm_name || filing.organization_name || null,
			filing_url: `https://www.fcc.gov/ecfs/filing/${filing.id_submission}`,
			document_urls: JSON.stringify(documentUrls),
			filed_at: new Date(filing.date_disseminated).getTime()
		};
	}
}
```

### 3.2 Gemini AI Integration

**Dependencies**: FCC API integration complete
**Files to create**: `src/lib/gemini.js`

**Gemini Document Processor**: `src/lib/gemini.js`

```javascript
export class GeminiProcessor {
	constructor(env) {
		this.apiKey = env.GEMINI_API_KEY;
		this.apiUrl =
			'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
	}

	async generateSummary(documentUrls, filingTitle) {
		// Try to process the first available document
		const urls = JSON.parse(documentUrls || '[]');

		if (urls.length === 0) {
			return 'No document available for summarization.';
		}

		for (const url of urls.slice(0, 2)) {
			// Try first 2 documents
			try {
				const summary = await this.processDocumentFromUrl(url, filingTitle);
				if (summary && summary !== 'Document processing failed.') {
					return summary;
				}
			} catch (error) {
				console.log(`Failed to process document ${url}:`, error.message);
				continue;
			}
		}

		return 'Summary could not be generated - please check original filing.';
	}

	async processDocumentFromUrl(documentUrl, filingTitle) {
		try {
			const prompt = `
Analyze this FCC filing document and provide a 2-4 sentence summary that:
1. Identifies the key regulatory issue or request
2. States the filer's position or requested action  
3. Notes any deadlines or procedural requirements
4. Avoids technical jargon for general audiences

Filing title: ${filingTitle}
Document URL: ${documentUrl}

Please provide only the summary, no additional commentary.
`;

			const requestBody = {
				contents: [
					{
						parts: [
							{
								fileData: {
									fileUri: documentUrl,
									mimeType: 'application/pdf'
								}
							},
							{
								text: prompt
							}
						]
					}
				]
			};

			const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody),
				signal: AbortSignal.timeout(30000) // 30 second timeout
			});

			if (!response.ok) {
				console.log('Gemini API failed:', response.status);
				return 'Summary temporarily unavailable - please check original filing.';
			}

			const data = await response.json();

			if (data.candidates && data.candidates[0] && data.candidates[0].content) {
				return data.candidates[0].content.parts[0].text.trim();
			}

			return 'Summary could not be generated - please check original filing.';
		} catch (error) {
			console.log('Gemini processing error:', error.message);
			return 'Summary could not be generated - please check original filing.';
		}
	}
}
```

### 3.3 Ingestion Worker (Cron Job)

**Dependencies**: FCC API and Gemini integration complete
**Files to create**: `src/workers/ingestion.js`

**Ingestion Cron Worker**: `src/workers/ingestion.js`

```javascript
import { Database } from '../lib/database.js';
import { FCCAPIClient } from '../lib/fcc-api.js';
import { GeminiProcessor } from '../lib/gemini.js';

export default {
	async scheduled(event, env, ctx) {
		console.log('Starting ingestion worker...');

		try {
			const db = new Database(env);
			const fccApi = new FCCAPIClient(env);
			const gemini = new GeminiProcessor(env);

			// Get all active dockets being monitored
			const activeDockets = await db.getActiveDockets();
			console.log(`Found ${activeDockets.length} active dockets to monitor`);

			let totalProcessed = 0;

			for (const docket of activeDockets) {
				try {
					// Get the latest filing date for this docket
					const lastFiling = await db.getLatestFilingDate(docket.docket_number);
					const sinceDate = lastFiling ? new Date(lastFiling).toISOString().split('T')[0] : null;

					// Fetch new filings
					const filings = await fccApi.fetchDocketFilings(docket.docket_number, sinceDate);
					console.log(`Found ${filings.length} new filings for docket ${docket.docket_number}`);

					for (const filing of filings) {
						try {
							// Check if we already have this filing
							const existingFiling = await db.getFilingById(filing.id_submission);
							if (existingFiling) continue;

							// Parse filing data
							const filingData = fccApi.parseFilingData(filing);
							filingData.docket_id = docket.id;

							// Generate AI summary
							let summary = 'Processing...';
							if (filingData.document_urls && filingData.document_urls !== '[]') {
								summary = await gemini.generateSummary(filingData.document_urls, filingData.title);
							}

							filingData.summary = summary;
							filingData.summary_generated_at = Date.now();
							filingData.processing_status = 'processed';
							filingData.fetched_at = Date.now();

							// Store in database
							await db.createFiling(filingData);
							totalProcessed++;

							// Rate limiting delay
							await new Promise((resolve) => setTimeout(resolve, 1000));
						} catch (error) {
							console.error(`Error processing filing ${filing.id_submission}:`, error);
							continue;
						}
					}

					// Delay between dockets to respect rate limits
					await new Promise((resolve) => setTimeout(resolve, 2000));
				} catch (error) {
					console.error(`Error processing docket ${docket.docket_number}:`, error);
					continue;
				}
			}

			console.log(`Ingestion completed. Processed ${totalProcessed} new filings.`);
		} catch (error) {
			console.error('Ingestion worker failed:', error);
		}
	}
};
```

**Additional Database Methods**: Add to `src/lib/database.js`

```javascript
// Add these methods to the Database class

async getActiveDockets() {
  const stmt = this.db.prepare(`
    SELECT DISTINCT d.* FROM Dockets d
    JOIN UserDocketSubscriptions uds ON d.id = uds.docket_id
    WHERE uds.is_active = 1
  `)
  const result = await stmt.all()
  return result.results || []
}

async getLatestFilingDate(docketNumber) {
  const stmt = this.db.prepare(`
    SELECT MAX(filed_at) as latest FROM Filings f
    JOIN Dockets d ON f.docket_id = d.id
    WHERE d.docket_number = ?
  `)
  const result = await stmt.bind(docketNumber).first()
  return result?.latest
}

async getFilingById(fccFilingId) {
  const stmt = this.db.prepare('SELECT * FROM Filings WHERE fcc_filing_id = ?')
  return await stmt.bind(fccFilingId).first()
}

async createFiling(filingData) {
  const stmt = this.db.prepare(`
    INSERT INTO Filings (
      fcc_filing_id, docket_id, title, author, author_organization,
      filing_url, document_urls, filed_at, fetched_at, summary,
      summary_generated_at, processing_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  return await stmt.bind(
    filingData.fcc_filing_id,
    filingData.docket_id,
    filingData.title,
    filingData.author,
    filingData.author_organization,
    filingData.filing_url,
    filingData.document_urls,
    filingData.filed_at,
    filingData.fetched_at,
    filingData.summary,
    filingData.summary_generated_at,
    filingData.processing_status
  ).run()
}
```

This implementation guide provides concrete, copy-paste ready code that Cursor can use to build each phase systematically. Each section builds on the previous one with clear dependencies and error handling patterns that follow our "fail gracefully" philosophy.
