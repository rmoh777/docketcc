import { json } from '@sveltejs/kit';
import { Database } from '$lib/database.js';

export async function GET({ locals, platform }) {
	try {
		const session = await locals.getSession();
		const db = new Database(platform?.env);

		// Test database connectivity
		const healthCheck = await db.healthCheck();
		
		// Get user info if logged in
		let userInfo = null;
		let subscriptionCount = 0;
		
		if (session?.user) {
			// Try to find user by Google ID or email
			userInfo = await db.getUserByGoogleId(session.user.sub) || 
			          await db.getUserByEmail(session.user.email);
			
			if (userInfo) {
				const subscriptions = await db.getUserSubscriptions(userInfo.id);
				subscriptionCount = subscriptions.length;
			}
		}

		return json({
			status: 'debug',
			timestamp: new Date().toISOString(),
			database: {
				connected: healthCheck,
				isDevelopment: db.isDevelopment,
				hasBinding: !!platform?.env?.DB
			},
			session: {
				exists: !!session,
				user: session?.user ? {
					email: session.user.email,
					name: session.user.name,
					sub: session.user.sub
				} : null
			},
			userInDatabase: {
				exists: !!userInfo,
				id: userInfo?.id,
				subscriptionCount
			}
		});
	} catch (error) {
		return json({
			status: 'error',
			error: error.message,
			timestamp: new Date().toISOString()
		}, { status: 500 });
	}
} 