// DocketCC Ingestion Worker - Runs every 15 minutes
// Fetches new FCC filings and generates AI summaries

import { Database } from '../src/lib/database.js';
import { FCCAPIClient } from '../src/lib/fcc-api.js';
import { GeminiProcessor } from '../src/lib/gemini.js';

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
	},

	// Handle manual triggers via HTTP
	async fetch(request, env, ctx) {
		if (request.method === 'POST' && new URL(request.url).pathname === '/trigger') {
			// Manual trigger for testing
			await this.scheduled(null, env, ctx);
			return new Response('Ingestion triggered manually', { status: 200 });
		}
		
		return new Response('DocketCC Ingestion Worker', { status: 200 });
	}
}; 