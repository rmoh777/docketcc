<script>
	export let data;
	
	// Mock admin data - will be replaced with real data later
	let systemStats = {
		totalUsers: 0,
		activeSubscriptions: 0,
		totalFilings: 0,
		processingStatus: 'healthy'
	};
</script>

<div class="space-y-6">
	<!-- Admin Welcome -->
	<div class="bg-red-50 border border-red-200 rounded-lg p-6">
		<div class="flex items-center">
			<div class="h-12 w-12 bg-red-600 rounded-lg flex items-center justify-center mr-4">
				<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
				</svg>
			</div>
			<div>
				<h2 class="text-xl font-semibold text-red-900">Admin Dashboard</h2>
				<p class="text-red-700 mt-1">System management and development status</p>
			</div>
		</div>
	</div>

	<!-- Development Status -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center">
				<div class="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
					<svg class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-600">Authentication</p>
					<p class="text-2xl font-semibold text-gray-900">✓ Working</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center">
				<div class="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
					<svg class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
					</svg>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-600">Database</p>
					<p class="text-2xl font-semibold text-gray-900">✓ Ready</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center">
				<div class="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
					<svg class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-600">Docket Pipeline</p>
					<p class="text-2xl font-semibold text-gray-900">Phase 2</p>
				</div>
			</div>
		</div>
	</div>

	<!-- System Stats -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center">
				<div class="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
					<svg class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
					</svg>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-600">Total Users</p>
					<p class="text-2xl font-semibold text-gray-900">{systemStats.totalUsers}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center">
				<div class="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
					<svg class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-600">Active Subscriptions</p>
					<p class="text-2xl font-semibold text-gray-900">{systemStats.activeSubscriptions}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center">
				<div class="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
					<svg class="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-600">Total Filings</p>
					<p class="text-2xl font-semibold text-gray-900">{systemStats.totalFilings}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center">
				<div class="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
					<svg class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-600">System Status</p>
					<p class="text-lg font-semibold text-green-600 capitalize">{systemStats.processingStatus}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Development Progress -->
	<div class="bg-white rounded-lg shadow">
		<div class="px-6 py-4 border-b border-gray-200">
			<h3 class="text-lg font-medium text-gray-900">🚀 Development Progress</h3>
		</div>
		<div class="p-6">
			<div class="space-y-4">
				<div class="flex items-start">
					<div class="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
						<svg class="h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
						</svg>
					</div>
					<div>
						<h4 class="text-sm font-medium text-gray-900">Phase 1: Foundation Complete</h4>
						<p class="text-sm text-gray-600">Database setup, Google OAuth, and admin/customer separation</p>
					</div>
				</div>

				<div class="flex items-start">
					<div class="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
						<span class="text-xs font-medium text-blue-600">2</span>
					</div>
					<div>
						<h4 class="text-sm font-medium text-gray-900">Phase 2: User Experience (In Progress)</h4>
						<p class="text-sm text-gray-600">Customer dashboard, docket search, subscription management</p>
					</div>
				</div>

				<div class="flex items-start">
					<div class="h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
						<span class="text-xs font-medium text-gray-600">3</span>
					</div>
					<div>
						<h4 class="text-sm font-medium text-gray-900">Phase 3: Data Pipeline</h4>
						<p class="text-sm text-gray-600">FCC API integration, AI summarization, automated ingestion</p>
					</div>
				</div>
			</div>

			<div class="mt-6 pt-6 border-t border-gray-200">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<h4 class="text-sm font-medium text-gray-900 mb-2">Admin Account Info</h4>
						<p class="text-sm text-gray-600">
							<strong>Email:</strong> {data.user.email}<br>
							<strong>User ID:</strong> {data.user.id}<br>
							<strong>Admin Status:</strong> ✓ Confirmed
						</p>
					</div>
					<div>
						<h4 class="text-sm font-medium text-gray-900 mb-2">Quick Actions</h4>
						<div class="space-y-2">
							<a href="/dashboard" class="block text-sm text-blue-600 hover:text-blue-500">→ View Customer Dashboard</a>
							<a href="/admin/users" class="block text-sm text-blue-600 hover:text-blue-500">→ Manage Users</a>
							<a href="/admin/system" class="block text-sm text-blue-600 hover:text-blue-500">→ System Configuration</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div> 