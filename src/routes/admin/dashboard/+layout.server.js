import { redirect } from '@sveltejs/kit';
import { Database } from '$lib/database.js';

export async function load({ locals, platform }) {
	const session = await locals.auth();

	if (!session?.user) {
		throw redirect(302, '/auth/login?callbackUrl=/admin/dashboard');
	}

	// Check admin status - require database for admin access
	let isAdmin = false;
	if (platform?.env?.DB && session.user.id) {
		try {
			const db = new Database(platform.env);
			const user = await db.getUserById(session.user.id);
			isAdmin = user?.is_admin || false;
		} catch (error) {
			console.error('Error checking admin status:', error);
		}
	}

	if (!isAdmin) {
		throw redirect(302, '/dashboard'); // Redirect non-admins to customer dashboard
	}

	return {
		user: {
			...session.user,
			is_admin: true
		}
	};
} 