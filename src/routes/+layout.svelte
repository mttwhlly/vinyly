<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { spotifyStore } from '$lib/stores/spotify';

	// Cleanup on page unload
	onMount(() => {
		return () => {
			spotifyStore.disconnect();
		};
	});
</script>

<main>
	<slot />
</main>
