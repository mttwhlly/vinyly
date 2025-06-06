<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { fade, fly } from 'svelte/transition';

	let loading = true;
	let error = '';

	onMount(async () => {
		const code = $page.url.searchParams.get('code');
		const state = $page.url.searchParams.get('state');
		const errorParam = $page.url.searchParams.get('error');

		if (errorParam) {
			error = 'Authentication cancelled or failed';
			loading = false;
			return;
		}

		if (!code) {
			error = 'No authorization code received';
			loading = false;
			return;
		}

		try {
			const success = await authStore.handleCallback(code, state || '');

			if (success) {
				// Redirect to main app
				goto('/');
			} else {
				error = 'Failed to authenticate with Spotify';
			}
		} catch (err) {
			error = err.message || 'Authentication failed';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Authenticating with Spotify...</title>
</svelte:head>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900"
>
	{#if loading}
		<div in:fade={{ duration: 500 }} class="text-center">
			<div
				class="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-b-2 border-purple-400"
			></div>
			<h1 class="mb-2 text-2xl font-bold text-white">Connecting to Spotify</h1>
			<p class="text-gray-300">Please wait while we set up your account...</p>
		</div>
	{:else if error}
		<div
			in:fly={{ y: 20, duration: 500 }}
			class="max-w-md rounded-lg border border-red-500 bg-red-900/20 p-8 text-center"
		>
			<h1 class="mb-4 text-xl font-bold text-red-400">Authentication Error</h1>
			<p class="mb-6 text-gray-300">{error}</p>
			<button
				on:click={() => goto('/')}
				class="rounded-lg bg-purple-600 px-6 py-3 text-white transition-colors hover:bg-purple-700"
			>
				Return Home
			</button>
		</div>
	{/if}
</div>
