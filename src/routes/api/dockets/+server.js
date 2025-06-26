import { json } from '@sveltejs/kit';
import { HARDCODED_DOCKETS } from '$lib/docket-data.js';
import { getUserForAPI } from '$lib/dev-utils.js';
import { mockDb } from '$lib/mock-db.js';

export async function GET({ url, locals, platform }) {
	const query = url.searchParams.get('q')?.toLowerCase() || '';
	console.log('Searching dockets for:', query);

	if (!query) {
		return json({ dockets: [], message: 'No search query provided' });
	}

	try {
		// Search hardcoded dockets by keyword or docket number
		const results = HARDCODED_DOCKETS.filter(docket => {
			const matchesNumber = docket.docket_number.includes(query);
			const matchesTitle = docket.title.toLowerCase().includes(query);
			const matchesKeywords = docket.keywords.some(keyword =>
				keyword.toLowerCase().includes(query)
			);
			return matchesNumber || matchesTitle || matchesKeywords;
		});

		console.log(`Found ${results.length} matching dockets`);

		return json({
			status: 'success',
			dockets: results.slice(0, 10), // Limit to 10 results
			query: query
		});
	} catch (error) {
		console.error('Docket search error:', error);
		return json({
			status: 'error',
			error: error.message,
			dockets: []
		}, { status: 500 });
	}
}

export async function POST({ request, locals, platform, url }) {
	console.log('Creating docket subscription...');

	try {
		// Get user (dev mode or real auth)
		const user = await getUserForAPI(locals, platform, url);
		const { docket_number, frequency = 'daily' } = await request.json();

		// Find the docket in our hardcoded list
		const docketInfo = HARDCODED_DOCKETS.find(d => d.docket_number === docket_number);
		if (!docketInfo) {
			return json({
				status: 'error',
				error: 'Docket not found'
			}, { status: 404 });
		}

		// Determine if we're in dev mode or production
		const isDevMode = url.searchParams.get('dev') === 'true' && 
						 (import.meta.env.DEV || process.env.NODE_ENV === 'development');

		if (isDevMode) {
			// Use mock database for development
			try {
				await mockDb.addDocketSubscription(user.id, docket_number, frequency);
				
				return json({
					status: 'success',
					message: 'Subscription created (development mode)',
					docket: docketInfo
				});
			} catch (error) {
				if (error.requiresUpgrade) {
					return json({
						status: 'error',
						error: error.message,
						requiresUpgrade: true
					}, { status: 403 });
				}
				
				return json({
					status: 'error',
					error: error.message
				}, { status: 400 });
			}
		} else {
			// Use real database for production
			const db = platform.env.DB;
			if (!db) {
				return json({
					status: 'error',
					error: 'Database not available'
				}, { status: 500 });
			}
			
			try {
				// Check if user already has this subscription
				const existing = await db.prepare(`
					SELECT uds.id FROM UserDocketSubscriptions uds
					JOIN Dockets d ON uds.docket_id = d.id
					WHERE uds.user_id = ? AND d.docket_number = ? AND uds.is_active = true
				`).bind(user.id, docket_number).first();
				
				if (existing) {
					return json({
						status: 'error',
						error: 'Already subscribed to this docket'
					}, { status: 400 });
				}
				
				// Check subscription limits (free tier = 1 docket)
				const userSubscriptions = await db.prepare(`
					SELECT COUNT(*) as count FROM UserDocketSubscriptions 
					WHERE user_id = ? AND is_active = true
				`).bind(user.id).first();
				
				if (userSubscriptions.count >= 1) {
					return json({
						status: 'error',
						error: 'Free tier limited to 1 docket',
						requiresUpgrade: true
					}, { status: 403 });
				}
				
				// Create docket in database if it doesn't exist
				await db.prepare(`
					INSERT OR REPLACE INTO Dockets (docket_number, title, bureau, description, created_at)
					VALUES (?, ?, ?, ?, ?)
				`).bind(
					docketInfo.docket_number,
					docketInfo.title,
					docketInfo.bureau,
					docketInfo.description,
					Date.now()
				).run();
				
				// Create subscription
				await db.prepare(`
					INSERT INTO UserDocketSubscriptions (user_id, docket_id, notification_frequency, is_active, created_at)
					SELECT ?, d.id, ?, true, ?
					FROM Dockets d WHERE d.docket_number = ?
				`).bind(user.id, frequency, Date.now(), docket_number).run();
				
				console.log('Subscription created successfully');
				
				return json({
					status: 'success',
					message: 'Subscription created',
					docket: docketInfo
				});
			} catch (error) {
				console.error('Subscription creation failed:', error);
				return json({
					status: 'error',
					error: error.message
				}, { status: 500 });
			}
		}
	} catch (error) {
		console.error('Subscription creation failed:', error);
		
		if (error.message === 'Authentication required') {
			return json({
				status: 'error',
				error: 'Authentication required'
			}, { status: 401 });
		}
		
		return json({
			status: 'error',
			error: error.message
		}, { status: 500 });
	}
}

export async function DELETE({ url, locals, platform }) {
	try {
		const user = await getUserForAPI(locals, platform, url);
		const subscriptionId = url.searchParams.get('id');
		
		if (!subscriptionId) {
			return json({
				status: 'error',
				error: 'Subscription ID required'
			}, { status: 400 });
		}
		
		// Determine if we're in dev mode
		const isDevMode = url.searchParams.get('dev') === 'true' && 
						 (import.meta.env.DEV || process.env.NODE_ENV === 'development');
		
		if (isDevMode) {
			await mockDb.removeDocketSubscription(user.id, subscriptionId);
		} else {
			const db = platform.env.DB;
			if (!db) {
				return json({
					status: 'error',
					error: 'Database not available'
				}, { status: 500 });
			}
			
			await db.prepare(`
				UPDATE UserDocketSubscriptions 
				SET is_active = false 
				WHERE id = ? AND user_id = ?
			`).bind(subscriptionId, user.id).run();
		}
		
		return json({
			status: 'success',
			message: 'Subscription removed'
		});
	} catch (error) {
		console.error('Failed to remove subscription:', error);
		
		if (error.message === 'Authentication required') {
			return json({ error: 'Authentication required' }, { status: 401 });
		}
		
		return json({
			status: 'error',
			error: error.message
		}, { status: 500 });
	}
} 