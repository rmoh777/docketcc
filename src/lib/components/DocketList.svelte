<!-- Docket List Component -->
<script>
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	export let userDockets = [];
	export let devMode = false;
	export let isDevelopment = false;
	
	let removingSubscription = null;

	async function unsubscribeFromDocket(subscription) {
		if (!confirm(`Are you sure you want to unsubscribe from ${subscription.docket_number}?`)) {
			return;
		}

		removingSubscription = subscription.id;
		try {
			const devParam = devMode && isDevelopment ? '&dev=true' : '';
			const response = await fetch(`/api/dockets?id=${subscription.id}${devParam}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				dispatch('docketRemove', subscription.id);
			} else {
				const result = await response.json();
				alert(result.error || 'Failed to unsubscribe');
			}
		} catch (error) {
			console.error('Failed to unsubscribe:', error);
			alert('Failed to unsubscribe from docket');
		} finally {
			removingSubscription = null;
		}
	}

	function formatFrequency(frequency) {
		const frequencies = {
			hourly: 'Hourly',
			daily: 'Daily',
			weekly: 'Weekly'
		};
		return frequencies[frequency] || frequency;
	}

	function formatDate(timestamp) {
		if (!timestamp) return 'Never';
		return new Date(timestamp).toLocaleDateString();
	}
</script>

{#if userDockets.length === 0}
	<div class="text-center py-8">
		<svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
			<path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14v-4a6 6 0 0110.713-3.714M34 40v-1.586a4 4 0 00-1.172-2.828l-6.656-6.656a4 4 0 00-2.828-1.172H16a4 4 0 00-4 4v8M24 20a6 6 0 11-12 0 6 6 0 0112 0zM40 20a6 6 0 11-12 0 6 6 0 0112 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		<h3 class="mt-2 text-sm font-medium text-gray-900">No subscriptions yet</h3>
		<p class="mt-1 text-sm text-gray-500">
			Start by adding a docket to monitor FCC filings.
		</p>
	</div>
{:else}
	<div class="space-y-4">
		{#each userDockets as subscription}
			<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex justify-between items-start">
					<div class="flex-1">
						<div class="flex items-center space-x-2 mb-2">
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
								{subscription.docket_number}
							</span>
							<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
								{formatFrequency(subscription.notification_frequency)}
							</span>
							{#if subscription.is_active}
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
									Active
								</span>
							{:else}
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
									Inactive
								</span>
							{/if}
						</div>
						
						<h4 class="text-sm font-medium text-gray-900 mb-1">
							{subscription.docket_title || 'Loading title...'}
						</h4>
						
						{#if subscription.docket_bureau}
							<p class="text-sm text-gray-600 mb-2">{subscription.docket_bureau}</p>
						{/if}
						
						<div class="text-xs text-gray-500 space-y-1">
							<p>Subscribed: {formatDate(subscription.created_at)}</p>
							<p>Last notification: {formatDate(subscription.last_notified_at)}</p>
						</div>
					</div>
					
					<div class="ml-4 flex flex-col space-y-2">
						<button
							on:click={() => unsubscribeFromDocket(subscription)}
							disabled={removingSubscription === subscription.id}
							class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
						>
							{#if removingSubscription === subscription.id}
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Removing...
							{:else}
								<svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
								Unsubscribe
							{/if}
						</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if} 