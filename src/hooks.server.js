import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';

export const { handle } = SvelteKitAuth(async (event) => {
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
		console.log('⚠️ OAuth not configured - app will work in dev mode only');
		return {
			providers: [],
			secret: authSecret,
			trustHost: true,
			callbacks: {
				async signIn() { 
					console.log('OAuth not available - sign in blocked');
					return false; 
				},
				async session({ session }) { 
					return session; 
				}
			}
		};
	}

	console.log('✅ OAuth configured - full authentication available');
	return {
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
	};
}); 