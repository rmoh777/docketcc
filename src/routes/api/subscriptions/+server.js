import { json } from '@sveltejs/kit';
import { getUserForAPI } from '$lib/dev-utils.js';
import { mockDb } from '$lib/mock-db.js';

export async function GET({ locals, platform, url }) {
	try {
		const user = await getUserForAPI(locals, platform, url);
		
		// Determine if we're in dev mode
		const isDevMode = url.searchParams.get('dev') === 'true' && 
						 (import.meta.env.DEV || process.env.NODE_ENV === 'development');
		
		let subscriptions;
		
		if (isDevMode) {
			// Use mock database for development
			subscriptions = await mockDb.getUserSubscriptions(user.id);
			console.log('🚧 DEV MODE: Fetched subscriptions from mock DB');
		} else {
			// Use real database for production
			const db = platform.env.DB;
			if (!db) {
				return json({
					status: 'error',
					error: 'Database not available'
				}, { status: 500 });
			}
			
			const result = await db.prepare(`
				SELECT 
					uds.id,
					uds.notification_frequency,
					uds.created_at,
					uds.last_notified_at,
					d.docket_number,
					d.title,
					d.bureau,
					d.description,
					d.status
				FROM UserDocketSubscriptions uds
				JOIN Dockets d ON uds.docket_id = d.id
				WHERE uds.user_id = ? AND uds.is_active = true
				ORDER BY uds.created_at DESC
			`).bind(user.id).all();
			
			subscriptions = result.results || [];
			console.log(`Fetched ${subscriptions.length} subscriptions from database`);
		}
		
		return json({
			status: 'success',
			subscriptions: subscriptions || [],
			count: subscriptions?.length || 0,
			user_id: user.id,
			mode: isDevMode ? 'development' : 'production',
			timestamp: new Date().toISOString()
		});
		
	} catch (error) {
		console.error('Failed to fetch subscriptions:', error);
		
		if (error.message === 'Authentication required') {
			return json({
				status: 'error',
				error: 'Authentication required'
			}, { status: 401 });
		}
		
		return json({
			status: 'error',
			error: error.message,
			subscriptions: [],
			count: 0
		}, { status: 500 });
	}
} 