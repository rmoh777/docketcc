import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		globals: true,
		environment: 'node',
		include: ['src/test/**/*.test.js'],
		setupFiles: ['src/test/setup.js']
	}
}); 