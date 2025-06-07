<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { Database, AlertCircle, CheckCircle, Loader } from 'lucide-svelte';
	import { collectionStore } from '$lib/stores/collection';
	import DiscogsSetup from '$lib/components/discogs-setup.svelte';

	let username = '';
	let isConnecting = false;
	let error = '';
	let success = false;

	$: collection = $collectionStore;
	$: progress = collection.progress;

	async function handleConnect() {
		if (!username.trim()) {
			error = 'Please enter your Discogs username';
			return;
		}

		error = '';
		isConnecting = true;

		try {
			await collectionStore.syncWithDiscogs(username.trim());
			success = true;
		} catch (err) {
			error = err.message || 'Failed to connect to Discogs';
		} finally {
			isConnecting = false;
		}
	}

	function handleUseMockData() {
		collectionStore.loadCollection();
	}
</script>

<div class="space-y-8">
	<!-- Setup Guide -->
	<DiscogsSetup />

	<!-- Connection Form -->
	<div
		class="mx-auto max-w-md rounded-xl border border-gray-700/50 bg-gray-800/40 p-6 backdrop-blur-sm"
		in:fade={{ duration: 500 }}
	>
		<div class="mb-6 text-center">
			<h2 class="mb-2 text-xl font-bold text-white">Connect Discogs</h2>
			<p class="text-sm text-gray-400">Enter your Discogs username to load your vinyl collection</p>
		</div>

		{#if !collection.discogsUsername && !isConnecting && !success}
			<div class="space-y-4">
				<div>
					<label for="username" class="mb-2 block text-sm font-medium text-gray-300">
						Discogs Username
					</label>
					<input
						id="username"
						type="text"
						bind:value={username}
						placeholder="your-username"
						class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
						on:keydown={(e) => e.key === 'Enter' && handleConnect()}
					/>
				</div>

				{#if error}
					<div
						class="flex items-center space-x-2 text-sm text-red-400"
						in:fly={{ x: -10, duration: 300 }}
					>
						<AlertCircle class="h-4 w-4" />
						<span>{error}</span>
					</div>
				{/if}

				<button
					on:click={handleConnect}
					disabled={!username.trim() || isConnecting}
					class="w-full rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-600"
				>
					Load My Collection
				</button>

				<div class="text-center">
					<span class="text-sm text-gray-500">or</span>
				</div>

				<button
					on:click={handleUseMockData}
					class="w-full rounded-lg bg-gray-700 px-4 py-2 font-medium text-gray-300 transition-colors hover:bg-gray-600"
				>
					Use Demo Collection
				</button>
			</div>
		{:else if isConnecting || collection.loading}
			<div class="space-y-4 text-center" in:fade={{ duration: 300 }}>
				<Loader class="mx-auto h-8 w-8 animate-spin text-purple-400" />

				{#if progress}
					<div class="space-y-2">
						<p class="text-sm text-gray-300">{progress.stage}</p>
						<div class="h-2 w-full rounded-full bg-gray-700">
							<div
								class="h-2 rounded-full bg-purple-600 transition-all duration-300"
								style="width: {progress.current}%"
							></div>
						</div>
						<p class="text-xs text-gray-400">{progress.current}% complete</p>
					</div>
				{:else}
					<p class="text-gray-300">Loading collection...</p>
				{/if}
			</div>
		{:else if success || collection.items.length > 0}
			<div class="space-y-4 text-center" in:fade={{ duration: 300 }}>
				<CheckCircle class="mx-auto h-8 w-8 text-green-400" />
				<div>
					<h3 class="font-medium text-white">Collection Loaded!</h3>
					<p class="text-sm text-gray-400">{collection.items.length} records found</p>
					{#if collection.discogsUsername}
						<p class="mt-1 text-xs text-gray-500">From @{collection.discogsUsername}</p>
					{/if}
				</div>

				<button
					on:click={() => {
						success = false;
						collectionStore.clearCollection();
					}}
					class="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-600"
				>
					Load Different Collection
				</button>
			</div>
		{/if}
	</div>
</div>
