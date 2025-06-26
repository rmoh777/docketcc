<script>
	import { createEventDispatcher, onMount } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	let searchQuery = '';
	let searchResults = [];
	let loading = false;
	let selectedDocket = null;
	let selectedFrequency = 'daily';
	let showSubscribeModal = false;

	// Search dockets - simple keyword matching
	async function searchDockets() {
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}

		loading = true;
		try {
			const response = await fetch(`/api/dockets?q=${encodeURIComponent(searchQuery.trim())}`);
			if (response.ok) {
				const result = await response.json();
				searchResults = result.dockets;
			} else {
				searchResults = [];
			}
		} catch (error) {
			console.error('Search failed:', error);
			searchResults = [];
		} finally {
			loading = false;
		}
	}

	// Handle docket selection
	function selectDocket(docket) {
		selectedDocket = docket;
		showSubscribeModal = true;
	}

	// Subscribe to docket
	async function subscribeToDocket() {
		try {
			const response = await fetch('/api/dockets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					docket_number: selectedDocket.docket_number, 
					frequency: selectedFrequency 
				})
			});

			const result = await response.json();

			if (response.ok) {
				dispatch('docketAdd', {
					docket_number: selectedDocket.docket_number,
					frequency: selectedFrequency,
					subscription: result.subscription
				});
				closeModal();
			} else if (result.requiresUpgrade) {
				dispatch('upgradeRequired');
			} else {
				alert(result.error || 'Failed to subscribe');
			}
		} catch (error) {
			console.error('Failed to subscribe:', error);
			alert('Failed to subscribe to docket');
		}
	}

	function closeModal() {
		showSubscribeModal = false;
		selectedDocket = null;
		selectedFrequency = 'daily';
	}
</script>

<div class="space-y-6">
	<!-- Search Input -->
	<div>
		<label for="docket-search" class="block text-sm font-medium text-gray-700 mb-2">
			Search FCC Dockets
		</label>
		<div class="relative">
			<input
				id="docket-search"
				type="text"
				bind:value={searchQuery}
				on:input={searchDockets}
				placeholder="Enter keywords (e.g., 'lifeline', 'broadband', 'net neutrality') or docket number (e.g., '17-108')"
				class="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
			/>
			<div class="absolute inset-y-0 right-0 pr-3 flex items-center">
				{#if loading}
					<svg class="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				{:else}
					<svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
				{/if}
			</div>
		</div>
		<p class="mt-2 text-sm text-gray-500">
			Try: "lifeline", "broadband", "net neutrality", "robocalls", or enter a docket number like "17-108"
		</p>
	</div>

	<!-- Search Results -->
	{#if searchResults.length > 0}
		<div>
			<h3 class="text-lg font-medium text-gray-900 mb-3">Search Results</h3>
			<div class="space-y-3">
				{#each searchResults as docket}
					<div class="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
						<div class="flex justify-between items-start">
							<div class="flex-1">
								<div class="flex items-center space-x-2 mb-2">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
										{docket.docket_number}
									</span>
								</div>
								<h4 class="text-sm font-medium text-gray-900 mb-1">{docket.title}</h4>
								<p class="text-sm text-gray-600 mb-2">{docket.description}</p>
								{#if docket.bureau}
									<p class="text-xs text-gray-500">{docket.bureau}</p>
								{/if}
							</div>
							<button
								on:click={() => selectDocket(docket)}
								class="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
							>
								Subscribe
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else if searchQuery && !loading}
		<div class="text-center py-8">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">No results found</h3>
			<p class="mt-1 text-sm text-gray-500">
				Try different keywords like "lifeline", "broadband", or "net neutrality"
			</p>
		</div>
	{/if}
</div>

<!-- Subscribe Modal -->
{#if showSubscribeModal && selectedDocket}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" role="dialog" aria-modal="true" tabindex="-1" on:click={closeModal} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
		<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" role="document" on:click|stopPropagation>
			<div class="mt-3">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-medium text-gray-900">Subscribe to Docket</h3>
					<button on:click={closeModal} class="text-gray-400 hover:text-gray-600" aria-label="Close modal">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>

				<div class="mb-4">
					<div class="flex items-center space-x-2 mb-2">
						<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
							{selectedDocket.docket_number}
						</span>
					</div>
					<h4 class="text-sm font-medium text-gray-900 mb-1">{selectedDocket.title}</h4>
					<p class="text-sm text-gray-600">{selectedDocket.description}</p>
				</div>

				<div class="mb-6">
					<label for="frequency" class="block text-sm font-medium text-gray-700 mb-2">
						Notification Frequency
					</label>
					<select
						id="frequency"
						bind:value={selectedFrequency}
						class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="hourly">Hourly - Get notified within an hour of new filings</option>
						<option value="daily">Daily - Get a daily digest of new filings</option>
						<option value="weekly">Weekly - Get a weekly summary of new filings</option>
					</select>
				</div>

				<div class="flex justify-end space-x-3">
					<button
						on:click={closeModal}
						class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Cancel
					</button>
					<button
						on:click={subscribeToDocket}
						class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Subscribe
					</button>
				</div>
			</div>
		</div>
	</div>
{/if} 