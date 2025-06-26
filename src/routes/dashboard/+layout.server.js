import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
	// Get session using our simple auth
	const session = await locals.auth();
	
	// If no user session, redirect to login
	if (!session?.user) {
		throw redirect(302, `/auth/login?callbackUrl=${encodeURIComponent(url.pathname)}`);
	}
	
	// Return user data for dashboard
	return {
		user: session.user
	};
} 