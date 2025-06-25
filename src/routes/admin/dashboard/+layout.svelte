<script>
	import { signOut } from '@auth/sveltekit/client';
	import { page } from '$app/stores';

	export let data;

	async function handleSignOut() {
		await signOut({ callbackUrl: '/' });
	}
</script>

<svelte:head>
	<title>Admin Dashboard - DocketCC</title>
	<meta name="description" content="DocketCC Admin Dashboard" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Admin Navigation -->
	<nav class="bg-red-600 shadow-sm border-b border-red-700">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center space-x-4">
					<div class="flex items-center">
						<div class="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
							<svg class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
						</div>
						<h1 class="ml-3 text-xl font-semibold text-white">DocketCC Admin</h1>
					</div>

					<!-- Admin Navigation Links -->
					<div class="hidden md:flex space-x-8 ml-10">
						<a 
							href="/admin/dashboard" 
							class="inline-flex items-center px-1 pt-1 text-sm font-medium {$page.url.pathname === '/admin/dashboard' ? 'text-white border-b-2 border-white' : 'text-red-100 hover:text-white'}"
						>
							Dashboard
						</a>
						<a 
							href="/admin/users" 
							class="inline-flex items-center px-1 pt-1 text-sm font-medium {$page.url.pathname === '/admin/users' ? 'text-white border-b-2 border-white' : 'text-red-100 hover:text-white'}"
						>
							Users
						</a>
						<a 
							href="/admin/system" 
							class="inline-flex items-center px-1 pt-1 text-sm font-medium {$page.url.pathname === '/admin/system' ? 'text-white border-b-2 border-white' : 'text-red-100 hover:text-white'}"
						>
							System
						</a>
						<a 
							href="/dashboard" 
							class="inline-flex items-center px-1 pt-1 text-sm font-medium text-red-200 hover:text-white"
						>
							→ Customer View
						</a>
					</div>
				</div>

				<div class="flex items-center space-x-4">
					<!-- Admin Badge -->
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-red-600">
						ADMIN
					</span>

					<!-- User Info -->
					<div class="flex items-center space-x-3">
						<div class="flex items-center space-x-2">
							{#if data.user.image}
								<img class="h-8 w-8 rounded-full border-2 border-red-300" src={data.user.image} alt={data.user.name} />
							{:else}
								<div class="h-8 w-8 rounded-full bg-red-300 flex items-center justify-center">
									<span class="text-sm font-medium text-red-700">
										{data.user.name ? data.user.name.charAt(0).toUpperCase() : 'A'}
									</span>
								</div>
							{/if}
							<div class="hidden md:block">
								<p class="text-sm font-medium text-white">{data.user.name || 'Admin'}</p>
								<p class="text-xs text-red-200">{data.user.email}</p>
							</div>
						</div>
					</div>

					<!-- Sign Out -->
					<button
						on:click={handleSignOut}
						class="inline-flex items-center px-3 py-2 border border-red-400 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
					>
						<svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
						Sign out
					</button>
				</div>
			</div>
		</div>

		<!-- Mobile menu -->
		<div class="md:hidden border-t border-red-700 bg-red-600">
			<div class="px-4 py-3 space-y-1">
				<a 
					href="/admin/dashboard" 
					class="block px-3 py-2 text-base font-medium {$page.url.pathname === '/admin/dashboard' ? 'text-white bg-red-700' : 'text-red-100 hover:text-white hover:bg-red-700'} rounded-md"
				>
					Dashboard
				</a>
				<a 
					href="/admin/users" 
					class="block px-3 py-2 text-base font-medium {$page.url.pathname === '/admin/users' ? 'text-white bg-red-700' : 'text-red-100 hover:text-white hover:bg-red-700'} rounded-md"
				>
					Users
				</a>
				<a 
					href="/admin/system" 
					class="block px-3 py-2 text-base font-medium {$page.url.pathname === '/admin/system' ? 'text-white bg-red-700' : 'text-red-100 hover:text-white hover:bg-red-700'} rounded-md"
				>
					System
				</a>
				<a 
					href="/dashboard" 
					class="block px-3 py-2 text-base font-medium text-red-200 hover:text-white hover:bg-red-700 rounded-md"
				>
					→ Customer View
				</a>
			</div>
		</div>
	</nav>

	<!-- Main content -->
	<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
		<slot />
	</main>
</div> 