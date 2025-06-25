// Main Worker - combines SvelteKit app with Phase 3 cron jobs
import { Server } from '../../.svelte-kit/output/server/index.js';
import { manifest } from '../../.svelte-kit/cloudflare-tmp/manifest.js';
import ingestionWorker from './ingestion.js';
import notificationWorker from './notifications.js';

// Initialize SvelteKit server
const server = new Server(manifest);

export default {
	async fetch(request, env, ctx) {
		// Initialize SvelteKit with environment
		await server.init({ env });

		// Handle Phase 3 worker endpoints
		const url = new URL(request.url);
		
		// Handle ingestion worker HTTP triggers
		if (url.pathname === '/trigger-ingestion') {
			return await ingestionWorker.fetch(request, env, ctx);
		}
		
		// Handle notification worker HTTP triggers
		if (url.pathname === '/trigger-notifications') {
			return await notificationWorker.fetch(request, env, ctx);
		}
		
		// Handle Phase 3 health check
		if (url.pathname === '/health') {
			return new Response(JSON.stringify({
				status: 'healthy',
				phase: 'Phase 3 - Data Pipeline + Dashboard',
				timestamp: new Date().toISOString(),
				features: [
					'SvelteKit Dashboard',
					'User Authentication',
					'FCC API Integration',
					'Gemini AI Processing',
					'Automated Ingestion',
					'D1 Database'
				]
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		// Default to SvelteKit app for everything else
		return server.respond(request, {
			platform: { env, ctx, caches },
			getClientAddress() {
				return request.headers.get('CF-Connecting-IP');
			}
		});
	},

	async scheduled(event, env, ctx) {
		// Handle scheduled events based on cron expression
		if (event.cron === '*/15 * * * *') {
			// Ingestion worker - every 15 minutes
			console.log('Running ingestion worker cron job');
			await ingestionWorker.scheduled(event, env, ctx);
		} else if (event.cron === '0 * * * *') {
			// Notification worker - every hour
			console.log('Running notification worker cron job');
			await notificationWorker.scheduled(event, env, ctx);
		}
	}
}; 