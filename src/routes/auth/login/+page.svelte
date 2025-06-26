<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	
	let email = '';
	let name = '';
	let loading = false;
	let error = '';
	
	async function handleSubmit() {
		if (!email || !email.includes('@')) {
			error = 'Please enter a valid email address';
			return;
		}
		
		loading = true;
		error = '';
		
		try {
			const response = await fetch('/api/auth/signin', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					email: email.trim(),
					name: name.trim() || email.split('@')[0]
				})
			});
			
			if (response.ok) {
				goto('/dashboard');
			} else {
				const data = await response.json();
				error = data.error || 'Failed to sign in';
			}
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - DocketCC</title>
	<meta name="description" content="Sign in to DocketCC to monitor FCC filings" />
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="text-center">
			<h1 class="text-3xl font-bold text-gray-900">DocketCC</h1>
			<h2 class="mt-6 text-2xl font-bold text-gray-900">
				Sign in to your account
			</h2>
			<p class="mt-2 text-sm text-gray-600">
				Enter your email address to access your FCC docket tracking dashboard
			</p>
		</div>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
			<form on:submit|preventDefault={handleSubmit} class="space-y-6">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">
						Email address *
					</label>
					<div class="mt-1">
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							bind:value={email}
							disabled={loading}
							class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							placeholder="your@email.com"
						/>
					</div>
				</div>

				<div>
					<label for="name" class="block text-sm font-medium text-gray-700">
						Display name (optional)
					</label>
					<div class="mt-1">
						<input
							id="name"
							name="name"
							type="text"
							autocomplete="name"
							bind:value={name}
							disabled={loading}
							class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							placeholder="Your Name"
						/>
					</div>
					<p class="mt-1 text-xs text-gray-500">
						Optional - we'll use the part before @ in your email if not provided
					</p>
				</div>

				{#if error}
					<div class="bg-red-50 border border-red-200 rounded-md p-3">
						<div class="flex">
							<div class="text-sm text-red-700">
								{error}
							</div>
						</div>
					</div>
				{/if}

				<div>
					<button
						type="submit"
						disabled={loading || !email}
						class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if loading}
							<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Signing in...
						{:else}
							Sign in with Email
						{/if}
					</button>
				</div>
			</form>

			<div class="mt-6">
				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t border-gray-300" />
					</div>
					<div class="relative flex justify-center text-sm">
						<span class="px-2 bg-white text-gray-500">
							Simple & secure email-based access
						</span>
					</div>
				</div>
			</div>

			<div class="mt-4 text-center">
				<p class="text-xs text-gray-500">
					By signing in, you agree to our Terms of Service and Privacy Policy.
					<br/>
					No password required - just enter your email to get started.
				</p>
			</div>
		</div>
	</div>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
	
	:global(body) {
		font-family: 'Inter', sans-serif;
	}
</style> 