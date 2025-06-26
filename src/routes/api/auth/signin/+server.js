import { json } from '@sveltejs/kit';
import { query } from '$lib/database.js';

export async function POST({ request, locals }) {
	try {
		const { email, name } = await request.json();
		
		// Validate email
		if (!email || !email.includes('@')) {
			return json({ error: 'Valid email address is required' }, { status: 400 });
		}
		
		const normalizedEmail = email.toLowerCase().trim();
		const displayName = name?.trim() || normalizedEmail.split('@')[0];
		
		// Check if user exists, if not create them
		let user = await query(
			'SELECT * FROM users WHERE email = ?',
			[normalizedEmail]
		);
		
		if (!user || user.length === 0) {
			// Create new user
			await query(
				`INSERT INTO users (
					email, 
					name, 
					subscription_tier, 
					created_at, 
					updated_at
				) VALUES (?, ?, 'free', datetime('now'), datetime('now'))`,
				[normalizedEmail, displayName]
			);
			
			// Fetch the newly created user
			user = await query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
		} else {
			// Update last login and name if provided
			await query(
				'UPDATE users SET name = ?, updated_at = datetime(\'now\') WHERE email = ?',
				[displayName, normalizedEmail]
			);
			user = user[0];
		}
		
		// Sign in the user using our simple auth system
		const success = await locals.signIn(normalizedEmail, displayName);
		
		if (success) {
			return json({ 
				success: true, 
				user: {
					email: normalizedEmail,
					name: displayName,
					subscription_tier: user.subscription_tier || 'free'
				}
			});
		} else {
			return json({ error: 'Failed to create session' }, { status: 500 });
		}
		
	} catch (error) {
		console.error('Signin error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
} 