// Google OAuth authentication module
// Implements secure OAuth flow with Auth.js for SvelteKit

import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET } from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Google({
			clientId: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET,
		})
	],
	secret: AUTH_SECRET,
	trustHost: true, // Required for Cloudflare Workers
	callbacks: {
		async signIn({ user, account }) {
			// Store user info in database if needed
			return true;
		},
		async session({ session, token }) {
			// Add user ID to session
			if (token?.sub) {
				session.user.id = token.sub;
			}
			return session;
		}
	}
}); 