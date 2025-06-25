import { json } from '@sveltejs/kit';
import { DocketSearch } from '$lib/docket-search.js';
import { Database } from '$lib/database.js';

export async function GET({ url, locals, platform }) {
	const session = await locals.auth();
	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const action = url.searchParams.get('action');
	const query = url.searchParams.get('q');

	try {
		const docketSearch = new DocketSearch(platform.env);

		if (action === 'search' && query) {
			// Simple keyword search - exact matches only
			const results = await docketSearch.searchDockets(query);
			return json({ dockets: results });
		}

		return json({ error: 'Missing action or query parameter' }, { status: 400 });
	} catch (error) {
		console.error('Docket search error:', error);
		return json({ error: 'Search failed' }, { status: 500 });
	}
}

export async function POST({ request, locals, platform }) {
	const session = await locals.auth();
	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { docket_number, frequency = 'daily' } = await request.json();

		if (!/^\d{2}-\d+$/.test(docket_number)) {
			return json({ error: 'Invalid docket number format' }, { status: 400 });
		}

		if (!['daily', 'weekly', 'hourly'].includes(frequency)) {
			return json({ error: 'Invalid notification frequency' }, { status: 400 });
		}

		const db = new Database(platform.env);

		// Check subscription limits for free tier
		const user = await db.getUserById(session.user.id);
		if (user.subscription_tier === 'free') {
			const existingSubscriptions = await db.getUserSubscriptions(session.user.id);
			if (existingSubscriptions.length >= 1) {
				return json(
					{
						error: 'Free tier limited to 1 docket subscription',
						requiresUpgrade: true
					},
					{ status: 403 }
				);
			}
		}

		// Check if user is already subscribed to this docket
		const existingSubscription = await db.getUserDocketSubscription(session.user.id, docket_number);
		if (existingSubscription) {
			return json(
				{ error: 'Already subscribed to this docket' },
				{ status: 409 }
			);
		}

		// Fetch and add docket info if it doesn't exist
		const docketSearch = new DocketSearch(platform.env);
		const docketInfo = await docketSearch.fetchDocketInfo(docket_number);
		if (docketInfo) {
			await docketSearch.addDocketToDatabase(docketInfo);
		}

		// Get docket ID from database
		const docket = await db.getDocketByNumber(docket_number);
		if (!docket) {
			return json({ error: 'Failed to create or find docket' }, { status: 500 });
		}

		// Create subscription
		const subscription = await db.addDocketSubscription(session.user.id, docket.id, frequency);

		return json({ 
			success: true, 
			subscription: {
				id: subscription.id,
				docket_number: docket_number,
				docket_title: docket.title,
				frequency: frequency,
				created_at: subscription.created_at
			}
		});
	} catch (error) {
		console.error('Add docket subscription error:', error);
		return json({ error: 'Failed to add docket subscription' }, { status: 500 });
	}
}

export async function DELETE({ url, locals, platform }) {
	const session = await locals.auth();
	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const subscriptionId = url.searchParams.get('id');
		if (!subscriptionId) {
			return json({ error: 'Subscription ID required' }, { status: 400 });
		}

		const db = new Database(platform.env);

		// Verify the subscription belongs to the current user
		const subscription = await db.getSubscriptionById(subscriptionId);
		if (!subscription || subscription.user_id !== session.user.id) {
			return json({ error: 'Subscription not found' }, { status: 404 });
		}

		// Delete the subscription
		await db.removeSubscription(subscriptionId);

		return json({ success: true });
	} catch (error) {
		console.error('Remove subscription error:', error);
		return json({ error: 'Failed to remove subscription' }, { status: 500 });
	}
} 