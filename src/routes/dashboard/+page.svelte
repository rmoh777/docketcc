<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import DocketSearch from '$lib/components/DocketSearch.svelte';
	import DocketList from '$lib/components/DocketList.svelte';

	export let data;

	let userDockets = [];
	let showUpgradeModal = false;
	let stats = {
		activeSubscriptions: 0,
		maxSubscriptions: 1,
		newFilingsToday: 0
	};

	onMount(async () => {
		await loadUserDockets();
		
		// Check for upgrade success message
		if ($page.url.searchParams.get('upgraded') === 'true') {
			setTimeout(() => {
				alert('🎉 Welcome to Pro! Your upgrade was successful. You now have unlimited docket subscriptions!');
			}, 500);
		}
	});

	async function loadUserDockets() {
		try {
			const response = await fetch('/api/subscriptions');
			if (response.ok) {
				const result = await response.json();
				userDockets = result.subscriptions;
				
				// Update stats
				stats.activeSubscriptions = userDockets.length;
				stats.maxSubscriptions = data.user.subscription_tier === 'pro' ? 999 : 1;
			}
		} catch (error) {
			console.error('Failed to load dockets:', error);
		}
	}

	async function handleDocketAdd(event) {
		await loadUserDockets();
	}

	function handleUpgradeRequired() {
		showUpgradeModal = true;
	}

	function handleDocketRemove() {
		loadUserDockets();
	}

	async function handleUpgrade() {
		try {
			const response = await fetch('/api/upgrade', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					userId: data.user.id,
					userEmail: data.user.email,
					userName: data.user.name
				})
			});

			if (!response.ok) {
				throw new Error('Failed to create checkout session');
			}

			const { checkoutUrl } = await response.json();
			
			// Redirect to Stripe Checkout
			window.location.href = checkoutUrl;
		} catch (error) {
			console.error('Upgrade error:', error);
			alert('Failed to start upgrade process. Please try again.');
		}
	}
</script>

<div class="px-4 sm:px-6 lg:px-8">
	<!-- Welcome Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900">Welcome back, {data.user.name}!</h1>
		<p class="mt-1 text-sm text-gray-600">
			Monitor FCC dockets and get AI-powered summaries of new filings.
		</p>
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
		<div class="bg-white overflow-hidden shadow rounded-lg">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="text-sm font-medium text-gray-500 truncate">Active Subscriptions</dt>
							<dd class="text-lg font-medium text-gray-900">
								{stats.activeSubscriptions} / {stats.maxSubscriptions === 999 ? '∞' : stats.maxSubscriptions}
								{#if data.user.subscription_tier === 'free'}
									<span class="text-sm text-gray-500">(Free)</span>
								{/if}
							</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-white overflow-hidden shadow rounded-lg">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="text-sm font-medium text-gray-500 truncate">New Filings Today</dt>
							<dd class="text-lg font-medium text-gray-900">{stats.newFilingsToday}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<div class="bg-white overflow-hidden shadow rounded-lg">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="text-sm font-medium text-gray-500 truncate">Account Type</dt>
							<dd class="text-lg font-medium text-gray-900 capitalize">
								{data.user.subscription_tier}
								{#if data.user.subscription_tier === 'pro'}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
										PRO
									</span>
								{/if}
							</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
		<h2 class="text-lg font-medium text-blue-900 mb-4">Quick Actions</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div class="bg-white p-4 rounded-lg shadow">
				<h3 class="text-sm font-medium text-gray-900 mb-2">Add Docket Subscription</h3>
				<p class="text-sm text-gray-600 mb-3">Search and subscribe to FCC dockets for monitoring.</p>
			</div>
			<div class="bg-white p-4 rounded-lg shadow">
				<h3 class="text-sm font-medium text-gray-900 mb-2">Manage Subscriptions</h3>
				<p class="text-sm text-gray-600 mb-3">View and modify your existing docket subscriptions.</p>
			</div>
		</div>
	</div>

	<!-- Add Docket Subscription -->
	<div class="bg-white overflow-hidden shadow rounded-lg mb-8">
		<div class="px-4 py-5 sm:p-6">
			<h3 class="text-lg leading-6 font-medium text-gray-900 mb-5">Add Docket Subscription</h3>
			<DocketSearch on:docketAdd={handleDocketAdd} on:upgradeRequired={handleUpgradeRequired} />
		</div>
	</div>

	<!-- Your Subscriptions -->
	<div class="bg-white overflow-hidden shadow rounded-lg mb-8">
		<div class="px-4 py-5 sm:p-6">
			<div class="flex justify-between items-center mb-5">
				<h3 class="text-lg leading-6 font-medium text-gray-900">
					Your Subscriptions ({stats.activeSubscriptions})
					{#if data.user.subscription_tier === 'free'}
						<span class="text-sm text-gray-500">/ {stats.maxSubscriptions} (Free Tier)</span>
					{/if}
				</h3>
				{#if data.user.subscription_tier === 'free' && stats.activeSubscriptions < stats.maxSubscriptions}
					<button
						on:click={() => showUpgradeModal = true}
						class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Upgrade to Pro
					</button>
				{/if}
			</div>
			<DocketList {userDockets} on:docketRemove={handleDocketRemove} />
		</div>
	</div>

	<!-- Recent Activity -->
	<div class="bg-white overflow-hidden shadow rounded-lg">
		<div class="px-4 py-5 sm:p-6">
			<h3 class="text-lg leading-6 font-medium text-gray-900 mb-5">Recent Activity</h3>
			<div class="text-center py-8">
				<svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
					<path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14v-4a6 6 0 0110.713-3.714M34 40v-1.586a4 4 0 00-1.172-2.828l-6.656-6.656a4 4 0 00-2.828-1.172H16a4 4 0 00-4 4v8M24 20a6 6 0 11-12 0 6 6 0 0112 0zM40 20a6 6 0 11-12 0 6 6 0 0112 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
				<p class="mt-1 text-sm text-gray-500">
					Subscribe to dockets to start receiving filing notifications.
				</p>
			</div>
		</div>
	</div>
</div>

<!-- Upgrade Modal -->
{#if showUpgradeModal}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" role="dialog" aria-modal="true" on:click={() => showUpgradeModal = false} on:keydown={(e) => e.key === 'Escape' && (showUpgradeModal = false)}>
		<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" role="document" on:click|stopPropagation>
			<div class="mt-3 text-center">
				<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
					<svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<h3 class="text-lg leading-6 font-medium text-gray-900 mt-4">Upgrade to Pro</h3>
				<div class="mt-2 px-7 py-3">
					<p class="text-sm text-gray-500">
						Free accounts are limited to 1 docket subscription. Upgrade to Pro for unlimited subscriptions and priority support.
					</p>
				</div>
				<div class="items-center px-4 py-3">
					<div class="flex justify-center space-x-3">
						<button
							on:click={() => showUpgradeModal = false}
							class="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
						>
							Cancel
						</button>
						<button
							on:click={handleUpgrade}
							class="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-24 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
						>
							Upgrade
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
	
	:global(body) {
		font-family: 'Inter', sans-serif;
	}
</style> 