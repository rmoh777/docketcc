import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';

// Custom auth handler that works without OAuth configuration
async function createAuthHandler(event) {
	const { platform } = event;
	
	// Get env vars ONLY from Cloudflare platform - no static imports that break builds
	const clientId = platform?.env?.GOOGLE_CLIENT_ID || 'not-configured';
	const clientSecret = platform?.env?.GOOGLE_CLIENT_SECRET || 'not-configured';
	const authSecret = platform?.env?.AUTH_SECRET || 'fallback-secret-for-auth-at-least-32-characters-long';

	// Check if OAuth is properly configured
	const hasValidOAuth = clientId && clientSecret && 
						 clientId !== 'not-configured' && 
						 clientSecret !== 'not-configured';

	if (!hasValidOAuth) {
		console.log('⚠️ OAuth not configured - using fallback auth handler');
		
		// Create a minimal auth handler that always returns null session
		return async function(event) {
			// Add auth methods to locals
			event.locals.auth = async () => ({ user: null });
			event.locals.signIn = async () => { throw new Error('OAuth not configured'); };
			event.locals.signOut = async () => { throw new Error('OAuth not configured'); };
			
			return await event.resolve(event);
		};
	}

	console.log('✅ OAuth configured - using full SvelteKitAuth');
	return SvelteKitAuth({
		providers: [
			Google({
				clientId,
				clientSecret,
				authorization: {
					params: {
						scope: 'openid email profile',
						access_type: 'offline',
						prompt: 'select_account'
					}
				}
			})
		],
		secret: authSecret,
		trustHost: true,
		callbacks: {
			async signIn({ user, account, profile }) {
				console.log('User signed in:', profile.email);
				return true;
			},
			async session({ session, token }) {
				if (token?.sub) {
					session.user.id = token.sub;
					session.user.google_id = token.sub;
				}
				return session;
			}
		}
	}).handle;
}

// Initialize the auth handler
let authHandler = null;

export async function handle(event) {
	// Initialize auth handler on first request
	if (!authHandler) {
		authHandler = await createAuthHandler(event);
	}
	
	return await authHandler(event);
} 