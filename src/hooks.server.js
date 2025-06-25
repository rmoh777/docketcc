import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';
import { Database } from './lib/database.js';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET } from '$env/static/private';

export const { handle } = SvelteKitAuth(async (event) => {
	const { platform } = event;
	
	// Use platform env for production (Cloudflare Workers) or SvelteKit env for development
	const env = {
		GOOGLE_CLIENT_ID: platform?.env?.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: platform?.env?.GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET,
		AUTH_SECRET: platform?.env?.AUTH_SECRET || AUTH_SECRET,
		DB: platform?.env?.DB // Only available in production
	};
	
	// Initialize database only if DB binding is available (production)
	let db = null;
	if (env.DB) {
		db = new Database(platform.env);
		await db.runMigrations();
	}

	return {
		providers: [
			Google({
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
				authorization: {
					params: {
						scope: 'openid email profile',
						access_type: 'offline',
						prompt: 'select_account'
					}
				}
			})
		],
		secret: env.AUTH_SECRET,
		trustHost: true,
		callbacks: {
			async signIn({ user, account, profile }) {
				// Only use database in production when available
				if (!db) {
					console.log('Database not available in development mode, allowing sign in');
					return true;
				}

				try {
					// Check if user exists by Google ID
					let existingUser = await db.getUserByGoogleId(profile.sub);

					if (!existingUser) {
						// Check if user exists by email
						existingUser = await db.getUserByEmail(profile.email);
						
						if (existingUser) {
							// User exists with same email, update with Google ID
							const updateStmt = db.db.prepare('UPDATE Users SET google_id = ? WHERE id = ?');
							await updateStmt.bind(profile.sub, existingUser.id).run();
							await db.updateUserLogin(existingUser.id);
						} else {
							// Create new user
							const newUser = {
								id: crypto.randomUUID(),
								email: profile.email,
								google_id: profile.sub,
								name: profile.name,
								avatar_url: profile.picture
							};
							await db.createUser(newUser);
						}
					} else {
						// Update last login for existing user
						await db.updateUserLogin(existingUser.id);
					}

					return true;
				} catch (error) {
					console.error('Sign in error:', error);
					return false;
				}
			},
			async session({ session, token }) {
				if (token?.sub && db) {
					try {
						const user = await db.getUserByGoogleId(token.sub);
						if (user) {
							session.user.id = user.id;
							session.user.subscription_tier = user.subscription_tier;
							session.user.stripe_customer_id = user.stripe_customer_id;
						}
					} catch (error) {
						console.error('Session callback error:', error);
					}
				} else if (token?.sub && !db) {
					// Development mode - just use basic session info
					session.user.id = token.sub;
				}
				return session;
			}
		}
	};
}); 