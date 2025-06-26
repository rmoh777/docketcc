import { json } from '@sveltejs/kit';
import { HARDCODED_DOCKETS } from '$lib/docket-data.js';

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

export async function POST({ request, locals, platform }) {
	console.log('Creating docket subscription...');

	try {
		const { docket_number, frequency = 'daily' } = await request.json();
		const db = platform.env.DB;

		// For now, use test user (we'll add real auth later)
		const testUserId = 'test-user-123';

		// Check if user already has this subscription
		const existing = await db.prepare(`
			SELECT uds.id FROM UserDocketSubscriptions uds
			JOIN Dockets d ON uds.docket_id = d.id
			WHERE uds.user_id = ? AND d.docket_number = ? AND uds.is_active = true
		`).bind(testUserId, docket_number).first();

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
		`).bind(testUserId).first();

		if (userSubscriptions.count >= 1) {
			return json({
				status: 'error',
				error: 'Free tier limited to 1 docket',
				requiresUpgrade: true
			}, { status: 403 });
		}

		// Find the docket in our hardcoded list
		const docketInfo = HARDCODED_DOCKETS.find(d => d.docket_number === docket_number);
		if (!docketInfo) {
			return json({
				status: 'error',
				error: 'Docket not found'
			}, { status: 404 });
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
		`).bind(testUserId, frequency, Date.now(), docket_number).run();

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