<script>
	import { signOut } from '@auth/sveltekit/client';
	import { page } from '$app/stores';

	export let data;

	async function handleSignOut() {
		await signOut({ callbackUrl: '/' });
	}
</script>

<svelte:head>
	<title>Dashboard - DocketCC</title>
	<meta name="description" content="Monitor your FCC docket subscriptions" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Navigation -->
	<nav class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center space-x-4">
					<div class="flex items-center">
						<div class="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
							<svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
						<h1 class="ml-3 text-xl font-semibold text-gray-900">DocketCC</h1>
					</div>

					<!-- Navigation Links -->
					<div class="hidden md:flex space-x-8 ml-10">
						<a 
							href="/dashboard" 
							class="inline-flex items-center px-1 pt-1 text-sm font-medium {$page.url.pathname === '/dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
						>
							Dashboard
						</a>
						<a 
							href="/dashboard/subscriptions" 
							class="inline-flex items-center px-1 pt-1 text-sm font-medium {$page.url.pathname === '/dashboard/subscriptions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
						>
							Subscriptions
						</a>
					</div>
				</div>

				<div class="flex items-center space-x-4">
					<!-- User Info -->
					<div class="flex items-center space-x-3">
						<div class="flex items-center space-x-2">
							{#if data.user.image}
								<img class="h-8 w-8 rounded-full" src={data.user.image} alt={data.user.name} />
							{:else}
								<div class="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
									<span class="text-sm font-medium text-gray-700">
										{data.user.name ? data.user.name.charAt(0).toUpperCase() : 'U'}
									</span>
								</div>
							{/if}
							<div class="hidden md:block">
								<p class="text-sm font-medium text-gray-700">{data.user.name || 'User'}</p>
								<p class="text-xs text-gray-500">{data.user.email}</p>
							</div>
						</div>

						<!-- Subscription Badge -->
						{#if data.user.subscription_tier === 'pro'}
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
								PRO
							</span>
						{:else}
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
								FREE
							</span>
						{/if}
					</div>

					<!-- Dropdown Menu -->
					<div class="relative">
						<button
							on:click={handleSignOut}
							class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							<svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
							</svg>
							Sign out
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Mobile menu -->
		<div class="md:hidden border-t border-gray-200 bg-white">
			<div class="px-4 py-3 space-y-1">
				<a 
					href="/dashboard" 
					class="block px-3 py-2 text-base font-medium {$page.url.pathname === '/dashboard' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'} rounded-md"
				>
					Dashboard
				</a>
				<a 
					href="/dashboard/subscriptions" 
					class="block px-3 py-2 text-base font-medium {$page.url.pathname === '/dashboard/subscriptions' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'} rounded-md"
				>
					Subscriptions
				</a>
			</div>
		</div>
	</nav>

	<!-- Main content -->
	<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
		<slot />
	</main>
</div> 