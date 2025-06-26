import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
	try {
		const { email, name } = await request.json();
		
		// Validate email
		if (!email || !email.includes('@')) {
			return json({ error: 'Valid email address is required' }, { status: 400 });
		}
		
		const normalizedEmail = email.toLowerCase().trim();
		const displayName = name?.trim() || normalizedEmail.split('@')[0];
		
		// For now, just sign in with email - we'll add database later
		const success = await locals.signIn(normalizedEmail, displayName);
		
		if (success) {
			return json({ 
				success: true, 
				user: {
					email: normalizedEmail,
					name: displayName,
					subscription_tier: 'free'
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