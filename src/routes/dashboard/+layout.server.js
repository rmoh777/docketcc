import { redirect } from '@sveltejs/kit';
import { Database } from '$lib/database.js';

export async function load({ locals, platform, url }) {
	const session = await locals.auth();

	if (!session?.user) {
		throw redirect(302, '/auth/login?callbackUrl=/dashboard');
	}

	// Check if user is admin (only works in production with database)
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

	// Route to appropriate dashboard
	if (isAdmin && !url.pathname.startsWith('/admin')) {
		throw redirect(302, '/admin/dashboard');
	} else if (!isAdmin && url.pathname.startsWith('/admin')) {
		throw redirect(302, '/dashboard');
	}

	return {
		user: {
			...session.user,
			is_admin: isAdmin
		}
	};
} 