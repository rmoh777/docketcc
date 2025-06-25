import Stripe from 'stripe';

// Stripe payment processing for Pro subscriptions
// Handles $2.99/month Pro upgrade flow

export class StripeIntegration {
	constructor(env) {
		this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
		this.webhookSecret = env.STRIPE_WEBHOOK_SECRET;
		this.priceId = env.STRIPE_PRICE_ID; // The recurring price ID from Stripe dashboard
	}

	async createCheckoutSession(userId, userEmail, originUrl) {
		try {
			const session = await this.stripe.checkout.sessions.create({
				payment_method_types: ['card'],
				mode: 'subscription',
				customer_email: userEmail,
				client_reference_id: userId,
				line_items: [
					{
						price: this.priceId,
						quantity: 1
					}
				],
				success_url: `${originUrl}/dashboard?upgraded=true`,
				cancel_url: `${originUrl}/dashboard`,
				metadata: {
					user_id: userId
				}
			});

			return {
				url: session.url,
				session_id: session.id
			};
		} catch (error) {
			console.error('Stripe checkout creation failed:', error);
			throw new Error('Failed to create checkout session');
		}
	}

	async handleWebhook(request) {
		try {
			const body = await request.text();
			const sig = request.headers.get('stripe-signature');

			// Verify the webhook signature
			const event = this.stripe.webhooks.constructEvent(body, sig, this.webhookSecret);
			
			return event;
		} catch (error) {
			console.error('Webhook verification failed:', error);
			throw new Error('Webhook signature verification failed');
		}
	}

	async createCustomer(email, name, userId) {
		try {
			const customer = await this.stripe.customers.create({
				email: email,
				name: name,
				metadata: {
					user_id: userId
				}
			});
			return customer;
		} catch (error) {
			console.error('Customer creation failed:', error);
			throw new Error('Failed to create Stripe customer');
		}
	}

	async getSubscription(subscriptionId) {
		try {
			const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
			return subscription;
		} catch (error) {
			console.error('Failed to retrieve subscription:', error);
			return null;
		}
	}
}

// Legacy exports for backward compatibility
export async function createSubscription(userId, customerEmail) {
	console.log('Legacy createSubscription called - please use StripeIntegration class');
	throw new Error('Please use StripeIntegration class instead');
}

export async function handleWebhook(request) {
	console.log('Legacy handleWebhook called - please use StripeIntegration class');
	throw new Error('Please use StripeIntegration class instead');
} 