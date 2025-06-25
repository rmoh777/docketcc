import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	const session = await locals.auth();

	if (!session?.user) {
		throw redirect(302, '/auth/login');
	}

	return {
		user: session.user
	};
} 