import { json } from '@sveltejs/kit';
import { StripeIntegration } from '$lib/stripe.js';
import { Database } from '$lib/database.js';

export async function POST({ request, platform }) {
	try {
		// Initialize Stripe and Database
		const stripe = new StripeIntegration(platform?.env);
		const db = new Database(platform?.env);

		// Verify webhook signature and get event
		const event = await stripe.handleWebhook(request);

		// Handle different event types
		switch (event.type) {
			case 'checkout.session.completed':
				await handleCheckoutCompleted(event.data.object, db, stripe);
				break;
			
			case 'customer.subscription.updated':
				await handleSubscriptionUpdated(event.data.object, db);
				break;
			
			case 'customer.subscription.deleted':
				await handleSubscriptionCanceled(event.data.object, db);
				break;
			
			case 'invoice.payment_succeeded':
				await handlePaymentSucceeded(event.data.object, db);
				break;
			
			case 'invoice.payment_failed':
				await handlePaymentFailed(event.data.object, db);
				break;
			
			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		return json({ received: true });

	} catch (error) {
		console.error('Webhook processing error:', error);
		return json(
			{ error: 'Webhook processing failed' }, 
			{ status: 400 }
		);
	}
}

async function handleCheckoutCompleted(session, db, stripe) {
	try {
		const userId = session.client_reference_id;
		const customerId = session.customer;
		const subscriptionId = session.subscription;

		if (!userId) {
			console.error('No user ID found in checkout session');
			return;
		}

		// Update user with Stripe customer ID and subscription info
		await db.updateUserSubscription(userId, {
			subscription_tier: 'pro',
			stripe_customer_id: customerId,
			stripe_subscription_id: subscriptionId
		});

		console.log(`User ${userId} upgraded to Pro successfully`);
	} catch (error) {
		console.error('Error handling checkout completion:', error);
	}
}

async function handleSubscriptionUpdated(subscription, db) {
	try {
		const customerId = subscription.customer;
		const status = subscription.status;
		
		// Find user by Stripe customer ID
		const user = await db.getUserByStripeCustomerId(customerId);
		if (!user) {
			console.error(`No user found for Stripe customer ${customerId}`);
			return;
		}

		// Update subscription status
		const subscriptionTier = (status === 'active') ? 'pro' : 'free';
		await db.updateUserSubscription(user.id, { 
			subscription_tier: subscriptionTier 
		});

		console.log(`Updated subscription for user ${user.id}: ${subscriptionTier}`);
	} catch (error) {
		console.error('Error handling subscription update:', error);
	}
}

async function handleSubscriptionCanceled(subscription, db) {
	try {
		const customerId = subscription.customer;
		
		// Find user by Stripe customer ID
		const user = await db.getUserByStripeCustomerId(customerId);
		if (!user) {
			console.error(`No user found for Stripe customer ${customerId}`);
			return;
		}

		// Downgrade to free tier
		await db.updateUserSubscription(user.id, { 
			subscription_tier: 'free' 
		});

		console.log(`User ${user.id} subscription canceled, downgraded to free`);
	} catch (error) {
		console.error('Error handling subscription cancellation:', error);
	}
}

async function handlePaymentSucceeded(invoice, db) {
	try {
		const customerId = invoice.customer;
		const subscriptionId = invoice.subscription;
		
		// Find user by Stripe customer ID
		const user = await db.getUserByStripeCustomerId(customerId);
		if (!user) {
			console.error(`No user found for Stripe customer ${customerId}`);
			return;
		}

		console.log(`Payment succeeded for user ${user.id}, subscription ${subscriptionId}`);
		// Could log this for analytics or send confirmation emails
	} catch (error) {
		console.error('Error handling payment success:', error);
	}
}

async function handlePaymentFailed(invoice, db) {
	try {
		const customerId = invoice.customer;
		
		// Find user by Stripe customer ID
		const user = await db.getUserByStripeCustomerId(customerId);
		if (!user) {
			console.error(`No user found for Stripe customer ${customerId}`);
			return;
		}

		console.log(`Payment failed for user ${user.id}`);
		// Could send payment failure notifications or take appropriate action
	} catch (error) {
		console.error('Error handling payment failure:', error);
	}
} 