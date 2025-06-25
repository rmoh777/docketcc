// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}

		interface Locals {
			auth(): Promise<import('@auth/sveltekit').Session | null>;
			getSession(): Promise<import('@auth/sveltekit').Session | null>;
		}
	}
}

declare module '@auth/sveltekit' {
	interface User {
		id?: string;
		subscription_tier?: 'free' | 'pro';
		stripe_customer_id?: string;
	}
}

export {}; 