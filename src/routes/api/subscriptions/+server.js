import { json } from '@sveltejs/kit';
import { Database } from '$lib/database.js';

export async function GET({ locals, platform }) {
	const session = await locals.auth();
	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const db = new Database(platform.env);
		const subscriptions = await db.getUserSubscriptions(session.user.id);

		return json({ 
			subscriptions: subscriptions.map(sub => ({
				id: sub.id,
				docket_number: sub.docket_number,
				docket_title: sub.title,
				docket_bureau: sub.bureau,
				notification_frequency: sub.notification_frequency,
				is_active: sub.is_active,
				created_at: sub.created_at,
				last_notified_at: sub.last_notified_at
			}))
		});
	} catch (error) {
		console.error('Get subscriptions error:', error);
		return json({ error: 'Failed to load subscriptions' }, { status: 500 });
	}
} 