// Ingestion Engine Worker
// Phase 3 Implementation - Updated to match specification

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
	},

	async fetch(request, env) {
		// Handle manual trigger via HTTP (for testing)
		if (request.method === 'POST' && new URL(request.url).pathname === '/trigger-ingestion') {
			const result = await this.handleIngestion(env);
			return Response.json(result);
		}
		
		return new Response('Ingestion Worker', { status: 200 });
	},

	async handleIngestion(env) {
		console.log('Starting FCC filing ingestion process...');
		
		try {
			const db = new Database(env);
			const fccApi = new FCCAPIClient(env);
			const gemini = new GeminiProcessor(env);

			// Get all active dockets from user subscriptions
			const activeDockets = await db.getActiveDockets();
			
			if (activeDockets.length === 0) {
				console.log('No active dockets found');
				return { success: true, message: 'No dockets to process' };
			}

			console.log(`Processing ${activeDockets.length} active dockets`);

			let totalNewFilings = 0;
			
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
							totalNewFilings++;

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

			return {
				success: true,
				activeDockets: activeDockets.length,
				newFilings: totalNewFilings,
				message: 'Ingestion completed successfully'
			};

		} catch (error) {
			console.error('Ingestion process failed:', error);
			return {
				success: false,
				error: error.message
			};
		}
	}
}; 