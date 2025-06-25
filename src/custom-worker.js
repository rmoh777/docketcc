import svelteWorker from '../.svelte-kit/cloudflare/_worker.js';
import { Database } from './lib/database.js';
import { FCCAPIClient } from './lib/fcc-api.js';
import { GeminiProcessor } from './lib/gemini.js';

// Phase 3 Ingestion Worker Logic
async function runIngestionWorker(env) {
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

// Phase 3 Notification Worker Logic
async function runNotificationWorker(env) {
	console.log('Starting notification worker...');
	// TODO: Implement email notifications
	// This would send digest emails to users based on their notification preferences
}

// Combined Worker Export
export default {
	async fetch(request, env, ctx) {
		// Handle special endpoints for manual triggers
		const url = new URL(request.url);
		
		if (url.pathname === '/health') {
			return new Response(JSON.stringify({
				status: 'healthy',
				timestamp: new Date().toISOString(),
				phase3: 'active'
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		if (url.pathname === '/trigger-ingestion') {
			ctx.waitUntil(runIngestionWorker(env));
			return new Response(JSON.stringify({
				message: 'Ingestion worker triggered',
				timestamp: new Date().toISOString()
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Delegate all other requests to SvelteKit
		return svelteWorker.default.fetch(request, env, ctx);
	},

	async scheduled(event, env, ctx) {
		console.log('Running scheduled worker:', event.cron);
		
		// Run ingestion every 15 minutes
		if (event.cron === '*/15 * * * *') {
			console.log('Running ingestion worker cron job');
			await runIngestionWorker(env);
		}
		
		// Run notifications every hour
		if (event.cron === '0 * * * *') {
			console.log('Running notification worker cron job');
			await runNotificationWorker(env);
		}
	}
}; 