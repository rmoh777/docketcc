import { json } from '@sveltejs/kit';

export async function POST({ locals }) {
	try {
		await locals.signOut();
		return json({ success: true });
	} catch (error) {
		console.error('Signout error:', error);
		return json({ error: 'Failed to sign out' }, { status: 500 });
	}
} 