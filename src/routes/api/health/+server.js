import { json } from '@sveltejs/kit';

export async function GET() {
	return json({
		status: 'healthy',
		timestamp: new Date().toISOString(),
		phase3: 'active',
		app: 'DocketCC SvelteKit'
	});
} 