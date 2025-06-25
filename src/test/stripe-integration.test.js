import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeIntegration } from '../lib/stripe.js';

// Mock Stripe module
vi.mock('stripe', () => {
	return {
		default: vi.fn(() => ({
			checkout: {
				sessions: {
					create: vi.fn()
				}
			},
			webhooks: {
				constructEvent: vi.fn()
			},
			customers: {
				create: vi.fn()
			},
			subscriptions: {
				retrieve: vi.fn()
			}
		}))
	};
});

describe('Stripe Integration', () => {
	let stripeIntegration;
	let mockEnv;

	beforeEach(() => {
		mockEnv = {
			STRIPE_SECRET_KEY: 'sk_test_fake_key',
			STRIPE_WEBHOOK_SECRET: 'whsec_fake_secret',
			STRIPE_PRICE_ID: 'price_fake_id'
		};
		stripeIntegration = new StripeIntegration(mockEnv);
	});

	it('should initialize with correct configuration', () => {
		expect(stripeIntegration.priceId).toBe('price_fake_id');
		expect(stripeIntegration.webhookSecret).toBe('whsec_fake_secret');
	});

	it('should create checkout session with correct parameters', async () => {
		const mockSession = {
			url: 'https://checkout.stripe.com/fake-session',
			id: 'cs_fake_session_id'
		};

		stripeIntegration.stripe.checkout.sessions.create.mockResolvedValue(mockSession);

		const result = await stripeIntegration.createCheckoutSession(
			'user-123',
			'test@example.com',
			'https://example.com'
		);

		expect(stripeIntegration.stripe.checkout.sessions.create).toHaveBeenCalledWith({
			payment_method_types: ['card'],
			mode: 'subscription',
			customer_email: 'test@example.com',
			client_reference_id: 'user-123',
			line_items: [{
				price: 'price_fake_id',
				quantity: 1
			}],
			success_url: 'https://example.com/dashboard?upgraded=true',
			cancel_url: 'https://example.com/dashboard',
			metadata: {
				user_id: 'user-123'
			}
		});

		expect(result).toEqual({
			url: mockSession.url,
			session_id: mockSession.id
		});
	});

	it('should handle webhook verification', async () => {
		const mockEvent = {
			type: 'checkout.session.completed',
			data: { object: { id: 'cs_test' } }
		};

		const mockRequest = {
			text: vi.fn().mockResolvedValue('{}'),
			headers: {
				get: vi.fn().mockReturnValue('fake-signature')
			}
		};

		stripeIntegration.stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

		const result = await stripeIntegration.handleWebhook(mockRequest);

		expect(stripeIntegration.stripe.webhooks.constructEvent).toHaveBeenCalledWith(
			'{}',
			'fake-signature',
			'whsec_fake_secret'
		);

		expect(result).toEqual(mockEvent);
	});

	it('should create customer with correct data', async () => {
		const mockCustomer = {
			id: 'cus_fake_customer',
			email: 'test@example.com'
		};

		stripeIntegration.stripe.customers.create.mockResolvedValue(mockCustomer);

		const result = await stripeIntegration.createCustomer(
			'test@example.com',
			'Test User',
			'user-123'
		);

		expect(stripeIntegration.stripe.customers.create).toHaveBeenCalledWith({
			email: 'test@example.com',
			name: 'Test User',
			metadata: {
				user_id: 'user-123'
			}
		});

		expect(result).toEqual(mockCustomer);
	});

	it('should handle checkout session creation errors', async () => {
		stripeIntegration.stripe.checkout.sessions.create.mockRejectedValue(
			new Error('Stripe API error')
		);

		await expect(
			stripeIntegration.createCheckoutSession('user-123', 'test@example.com', 'https://example.com')
		).rejects.toThrow('Failed to create checkout session');
	});

	it('should handle webhook verification errors', async () => {
		const mockRequest = {
			text: vi.fn().mockResolvedValue('{}'),
			headers: {
				get: vi.fn().mockReturnValue('invalid-signature')
			}
		};

		stripeIntegration.stripe.webhooks.constructEvent.mockImplementation(() => {
			throw new Error('Invalid signature');
		});

		await expect(
			stripeIntegration.handleWebhook(mockRequest)
		).rejects.toThrow('Webhook signature verification failed');
	});
}); 