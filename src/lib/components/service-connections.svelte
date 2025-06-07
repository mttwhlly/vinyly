<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { CheckCircle, ExternalLink, Unlink, Music, Database } from 'lucide-svelte';
	import { multiUserAuthStore } from '$lib/stores/auth-multiuser';

	$: authState = $multiUserAuthStore;
	$: connections = authState.connections;

	$: spotifyConnection = connections.find((c) => c.service === 'spotify');
	$: discogsConnection = connections.find((c) => c.service === 'discogs');

	async function handleSpotifyConnect() {
		await multiUserAuthStore.connectSpotify();
	}

	async function handleDiscogsConnect() {
		await multiUserAuthStore.connectDiscogs();
	}

	async function handleDisconnect(service: 'spotify' | 'discogs') {
		if (
			confirm(
				`Disconnect ${service}? You'll need to reconnect to access your ${service === 'spotify' ? 'music' : 'collection'}.`
			)
		) {
			await multiUserAuthStore.disconnectService(service);
		}
	}
</script>

<div class="space-y-6" in:fade={{ duration: 500 }}>
	<div class="text-center">
		<h2 class="mb-2 text-2xl font-bold text-white">Connect Your Music Services</h2>
		<p class="text-gray-400">
			Link your Spotify and Discogs accounts to start using your vinyl collection
		</p>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<!-- Spotify Connection -->
		<div
			class="rounded-xl border border-gray-700/50 bg-gray-800/40 p-6 backdrop-blur-sm"
			in:fly={{ x: -20, duration: 500, delay: 100 }}
		>
			<div class="mb-4 flex items-start justify-between">
				<div class="flex items-center space-x-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-600">
						<Music class="h-6 w-6 text-white" />
					</div>
					<div>
						<h3 class="text-lg font-semibold text-white">Spotify</h3>
						<p class="text-sm text-gray-400">Music streaming & playback</p>
					</div>
				</div>

				{#if spotifyConnection?.connected}
					<div class="flex items-center space-x-2">
						<CheckCircle class="h-5 w-5 text-green-400" />
						<span class="text-sm text-green-400">Connected</span>
					</div>
				{/if}
			</div>

			{#if spotifyConnection?.connected}
				<div class="space-y-3">
					<div class="rounded-lg bg-gray-700/50 p-3">
						<p class="text-sm text-gray-300">
							<strong>Account:</strong>
							{spotifyConnection.displayName || spotifyConnection.username || 'Connected'}
						</p>
						<p class="mt-1 text-xs text-gray-400">
							Connected {new Date(spotifyConnection.connectedAt || '').toLocaleDateString()}
						</p>
					</div>

					<div class="flex space-x-2">
						<button
							on:click={() => handleDisconnect('spotify')}
							class="flex items-center space-x-2 rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-600"
						>
							<Unlink class="h-4 w-4" />
							<span>Disconnect</span>
						</button>
					</div>
				</div>
			{:else}
				<div class="space-y-3">
					<p class="text-sm text-gray-300">
						Connect your Spotify account to play music from your vinyl collection. Requires Spotify
						Premium.
					</p>

					<ul class="space-y-1 text-xs text-gray-400">
						<li>• Full album playback</li>
						<li>• Queue management</li>
						<li>• Volume & skip controls</li>
					</ul>

					<button
						on:click={handleSpotifyConnect}
						disabled={authState.loading}
						class="flex w-full items-center justify-center space-x-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:bg-gray-600"
					>
						<Music class="h-4 w-4" />
						<span>{authState.loading ? 'Connecting...' : 'Connect Spotify'}</span>
						<ExternalLink class="h-4 w-4" />
					</button>
				</div>
			{/if}
		</div>

		<!-- Discogs Connection -->
		<div
			class="rounded-xl border border-gray-700/50 bg-gray-800/40 p-6 backdrop-blur-sm"
			in:fly={{ x: 20, duration: 500, delay: 200 }}
		>
			<div class="mb-4 flex items-start justify-between">
				<div class="flex items-center space-x-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-600">
						<Database class="h-6 w-6 text-white" />
					</div>
					<div>
						<h3 class="text-lg font-semibold text-white">Discogs</h3>
						<p class="text-sm text-gray-400">Vinyl collection database</p>
					</div>
				</div>

				{#if discogsConnection?.connected}
					<div class="flex items-center space-x-2">
						<CheckCircle class="h-5 w-5 text-green-400" />
						<span class="text-sm text-green-400">Connected</span>
					</div>
				{/if}
			</div>

			{#if discogsConnection?.connected}
				<div class="space-y-3">
					<div class="rounded-lg bg-gray-700/50 p-3">
						<p class="text-sm text-gray-300">
							<strong>Username:</strong>
							{discogsConnection.username}
						</p>
						<p class="mt-1 text-xs text-gray-400">
							Connected {new Date(discogsConnection.connectedAt || '').toLocaleDateString()}
						</p>
					</div>

					<div class="flex space-x-2">
						<button
							on:click={() => handleDisconnect('discogs')}
							class="flex items-center space-x-2 rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-600"
						>
							<Unlink class="h-4 w-4" />
							<span>Disconnect</span>
						</button>
					</div>
				</div>
			{:else}
				<div class="space-y-3">
					<p class="text-sm text-gray-300">
						Connect your Discogs account to automatically load your vinyl collection and match with
						Spotify.
					</p>

					<ul class="space-y-1 text-xs text-gray-400">
						<li>• Import your entire collection</li>
						<li>• Automatic Spotify matching</li>
						<li>• Cover art & metadata</li>
					</ul>

					<button
						on:click={handleDiscogsConnect}
						disabled={authState.loading}
						class="flex w-full items-center justify-center space-x-2 rounded-lg bg-orange-600 px-4 py-3 font-medium text-white transition-colors hover:bg-orange-700 disabled:bg-gray-600"
					>
						<Database class="h-4 w-4" />
						<span>{authState.loading ? 'Connecting...' : 'Connect Discogs'}</span>
						<ExternalLink class="h-4 w-4" />
					</button>
				</div>
			{/if}
		</div>
	</div>

	{#if authState.error}
		<div class="rounded-lg border border-red-500 bg-red-900/20 p-4" in:fade={{ duration: 300 }}>
			<p class="text-sm text-red-400">{authState.error}</p>
		</div>
	{/if}

	<!-- Next Steps -->
	{#if spotifyConnection?.connected && discogsConnection?.connected}
		<div
			class="rounded-lg border border-green-500/30 bg-green-900/20 p-6 text-center"
			in:fade={{ duration: 500 }}
		>
			<CheckCircle class="mx-auto mb-3 h-8 w-8 text-green-400" />
			<h3 class="mb-2 text-lg font-semibold text-green-400">All Set!</h3>
			<p class="text-sm text-gray-300">
				Both services are connected. You can now load your vinyl collection and start playing music!
			</p>
		</div>
	{:else}
		<div class="rounded-lg border border-blue-500/30 bg-blue-900/20 p-4 text-center">
			<p class="text-sm text-blue-400">
				<strong>Next:</strong>
				{#if !spotifyConnection?.connected && !discogsConnection?.connected}
					Connect both services to get started
				{:else if !spotifyConnection?.connected}
					Connect Spotify to enable music playback
				{:else}
					Connect Discogs to load your vinyl collection
				{/if}
			</p>
		</div>
	{/if}
</div>
