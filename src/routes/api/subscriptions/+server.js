import { json } from '@sveltejs/kit';

export async function GET({ locals, platform }) {
	try {
		const session = await locals.auth();
		if (!session?.user?.email) {
			return json({
				status: 'error',
				error: 'Authentication required'
			}, { status: 401 });
		}

		const db = platform.env.DB;
		const userEmail = session.user.email;

		// Get user's subscriptions from production database
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
		`).bind(userEmail).all();

		const subscriptions = result.results || [];
		console.log(`Fetched ${subscriptions.length} subscriptions for ${userEmail}`);

		return json({
			status: 'success',
			subscriptions: subscriptions,
			count: subscriptions.length,
			user_id: userEmail,
			mode: 'production',
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error('Failed to fetch subscriptions:', error);
		return json({
			status: 'error',
			error: error.message,
			subscriptions: [],
			count: 0
		}, { status: 500 });
	}
} 