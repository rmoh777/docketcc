// Simple email-based authentication system
export async function handle({ event, resolve }) {
	// Add simple auth methods to locals
	event.locals.auth = async () => {
		// Get user from session cookie
		const userEmail = event.cookies.get('user_email');
		const userName = event.cookies.get('user_name');
		
		if (userEmail) {
			return {
				user: {
					id: userEmail, // Use email as ID for simplicity
					email: userEmail,
					name: userName || userEmail.split('@')[0], // Use part before @ as name
					subscription_tier: 'free'
				}
			};
		}
		
		return { user: null };
	};
	
	event.locals.signIn = async (email, name) => {
		// Set user session cookies (7 days)
		const cookieOptions = {
			path: '/',
			maxAge: 60 * 60 * 24 * 7, // 7 days
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production'
		};
		
		event.cookies.set('user_email', email, cookieOptions);
		event.cookies.set('user_name', name || email.split('@')[0], cookieOptions);
		
		return true;
	};
	
	event.locals.signOut = async () => {
		// Clear session cookies
		event.cookies.delete('user_email', { path: '/' });
		event.cookies.delete('user_name', { path: '/' });
		return true;
	};
	
	return await resolve(event);
} 