import { json } from '@sveltejs/kit';
import { StripeIntegration } from '$lib/stripe.js';

export async function POST({ request, platform, url }) {
	try {
		// Get the user session - this would come from your auth system
		const { userId, userEmail, userName } = await request.json();
		
		// Validate required fields
		if (!userId || !userEmail) {
			return json({ error: 'Missing required user information' }, { status: 400 });
		}

		// Initialize Stripe
		const stripe = new StripeIntegration(platform?.env);
		
		// Create checkout session
		const session = await stripe.createCheckoutSession(
			userId, 
			userEmail, 
			url.origin
		);

		return json({ 
			checkoutUrl: session.url,
			sessionId: session.session_id
		});

	} catch (error) {
		console.error('Upgrade API error:', error);
		return json(
			{ error: 'Failed to create upgrade session' }, 
			{ status: 500 }
		);
	}
} 