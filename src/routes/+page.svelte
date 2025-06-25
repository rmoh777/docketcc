<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	export let data;

	onMount(() => {
		// If user is already logged in, redirect to dashboard
		if (data.session?.user) {
			goto('/dashboard');
		}
	});
</script>

<svelte:head>
	<title>DocketCC - FCC Filing Monitor</title>
	<meta name="description" content="Monitor FCC filings with AI-powered summaries" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
	<!-- Navigation -->
	<nav class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<div class="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
						<svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<h1 class="text-xl font-bold text-gray-900">DocketCC</h1>
				</div>
				<div class="flex items-center">
					<a 
						href="/auth/login" 
						class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
					>
						Sign In
					</a>
				</div>
			</div>
		</div>
	</nav>

	<!-- Hero Section -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
		<div class="text-center">
			<h1 class="text-4xl font-bold text-gray-900 sm:text-5xl lg:text-6xl">
				Monitor FCC Filings with
				<span class="text-blue-600">AI Intelligence</span>
			</h1>
			<p class="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
				Stay ahead of regulatory changes. Get AI-powered summaries of FCC docket filings delivered to your inbox. Never miss important telecommunications policy updates again.
			</p>
			<div class="mt-10 flex justify-center space-x-4">
				<a 
					href="/auth/login" 
					class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors shadow-lg"
				>
					Get Started Free
				</a>
				<a 
					href="#features" 
					class="bg-white hover:bg-gray-50 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium border border-gray-300 transition-colors"
				>
					Learn More
				</a>
			</div>
		</div>
	</div>

	<!-- Features Section -->
	<div id="features" class="bg-white py-20">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center mb-16">
				<h2 class="text-3xl font-bold text-gray-900">Why Choose DocketCC?</h2>
				<p class="mt-4 text-xl text-gray-600">Powerful features to keep you informed</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div class="text-center p-6">
					<div class="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
						<svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">Real-time Monitoring</h3>
					<p class="text-gray-600">Get notified the moment new filings are submitted to your tracked dockets.</p>
				</div>

				<div class="text-center p-6">
					<div class="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
						<svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">AI-Powered Summaries</h3>
					<p class="text-gray-600">Complex legal documents simplified into clear, actionable insights.</p>
				</div>

				<div class="text-center p-6">
					<div class="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
						<svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">Custom Alerts</h3>
					<p class="text-gray-600">Choose your notification frequency: hourly, daily, or weekly updates.</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<footer class="bg-gray-50 py-12">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center">
				<div class="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
					<svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<p class="text-gray-600">&copy; 2024 DocketCC. Built for regulatory transparency.</p>
			</div>
		</div>
	</footer>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
	
	:global(body) {
		font-family: 'Inter', sans-serif;
		margin: 0;
		padding: 0;
	}
</style>
