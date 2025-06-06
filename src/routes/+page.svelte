<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import VinylGrid from '$lib/components/vinyl-grid.svelte';
	import SpotifyPlayer from '$lib/components/spotify-player.svelte';
	import Header from '$lib/components/Header.svelte';
	import LoginScreen from '$lib/components/login-screen.svelte';
	import DiscogsConnect from '$lib/components/discogs-connect.svelte';
	import { spotifyStore } from '$lib/stores/spotify';
	import { collectionWithFiltered } from '$lib/stores/collection';
	import { authStore } from '$lib/stores/auth';

	let loading = true;
	let error = '';

	$: isAuthenticated = $authStore.isAuthenticated;
	$: accessToken = $authStore.accessToken;
	$: collection = $collectionWithFiltered;
	$: hasCollection = collection.items && collection.items.length > 0;

	onMount(async () => {
		try {
			// Load stored authentication
			authStore.loadStoredAuth();

			// Wait a bit to see if we have stored auth
			await new Promise((resolve) => setTimeout(resolve, 500));

			if ($authStore.isAuthenticated && $authStore.accessToken) {
				// Initialize Spotify Web Playback SDK with real token
				await spotifyStore.init($authStore.accessToken);

				// Don't auto-load collection, let user choose
			}

			loading = false;
		} catch (err) {
			error = err.message;
			loading = false;
		}
	});

	// Watch for authentication changes
	$: if (isAuthenticated && accessToken && !loading) {
		// User just authenticated, initialize Spotify
		spotifyStore.init(accessToken);
	}
</script>

{#if !isAuthenticated}
	<div in:fade={{ duration: 500 }}>
		<LoginScreen />
	</div>
{:else}
	<div
		class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900"
		in:fade={{ duration: 500 }}
	>
		<Header />

		<main class="container mx-auto px-4 py-8">
			{#if loading}
				<div in:fly={{ y: 20, duration: 500 }} class="flex h-64 items-center justify-center">
					<div class="text-center">
						<div
							class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-purple-400"
						></div>
						<p class="text-gray-300">Setting up your account...</p>
					</div>
				</div>
			{:else if error}
				<div
					in:fade={{ duration: 300 }}
					class="rounded-lg border border-red-500 bg-red-900/20 p-6 text-center"
				>
					<p class="text-red-400">Error: {error}</p>
					<button
						class="mt-4 rounded-lg bg-red-600 px-4 py-2 transition-colors hover:bg-red-700"
						on:click={() => window.location.reload()}
					>
						Try Again
					</button>
				</div>
			{:else if !hasCollection}
				<div
					in:fly={{ y: 30, duration: 600 }}
					class="flex min-h-[60vh] items-center justify-center"
				>
					<DiscogsConnect />
				</div>
			{:else}
				<div in:fly={{ y: 30, duration: 600, delay: 100 }}>
					<VinylGrid />
				</div>
			{/if}
		</main>

		<!-- Fixed Player at Bottom -->
		<SpotifyPlayer />
	</div>
{/if}
