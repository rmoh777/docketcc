<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	export let data;
	$: user = data.user;
	
	let loggingOut = false;
	
	async function handleLogout() {
		loggingOut = true;
		try {
			const response = await fetch('/api/auth/signout', {
				method: 'POST'
			});
			
			if (response.ok) {
				goto('/auth/login');
			} else {
				console.error('Failed to log out');
			}
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			loggingOut = false;
		}
	}
</script>

<svelte:head>
	<title>Dashboard - DocketCC</title>
	<meta name="description" content="Monitor your FCC docket subscriptions" />
</svelte:head>

<div class="min-h-screen bg-gray-100">
	<!-- Navigation -->
	<nav class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<h1 class="text-xl font-bold text-gray-900">DocketCC</h1>
					</div>
					<div class="hidden md:ml-6 md:flex md:space-x-8">
						<a href="/dashboard" class="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 {$page.route.id === '/dashboard' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:border-gray-300'} text-sm font-medium">
							Dashboard
						</a>
					</div>
				</div>
				
				<!-- User menu -->
				<div class="flex items-center space-x-4">
					<div class="text-sm text-gray-700">
						<span class="font-medium">{user.name}</span>
						<span class="text-gray-500">({user.email})</span>
					</div>
					<div class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
						{user.subscription_tier || 'free'}
					</div>
					<button
						on:click={handleLogout}
						disabled={loggingOut}
						class="text-gray-500 hover:text-gray-700 text-sm font-medium disabled:opacity-50"
					>
						{loggingOut ? 'Signing out...' : 'Sign out'}
					</button>
				</div>
			</div>
		</div>
	</nav>

	<!-- Main content -->
	<main class="max-w-7xl mx-auto py-6 px-4">
		<slot />
	</main>
</div> 