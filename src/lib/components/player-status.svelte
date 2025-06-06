<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Wifi, WifiOff, Smartphone, AlertCircle, CheckCircle } from 'lucide-svelte';
	import { spotifyStore } from '$lib/stores/spotify';

	$: isConnected = $spotifyStore.isConnected;
	$: deviceId = $spotifyStore.deviceId;

	function handleReconnect() {
		// Try to reconnect the player
		window.location.reload();
	}
</script>

{#if !isConnected}
	<div
		in:fade={{ duration: 300 }}
		class="fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-yellow-500/50 bg-yellow-900/90 p-3"
	>
		<div class="flex items-start space-x-3">
			<WifiOff class="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
			<div class="flex-1">
				<h4 class="text-sm font-medium text-yellow-400">Spotify Player Disconnected</h4>
				<p class="mt-1 text-xs text-gray-300">
					Playback controls may not work. Try refreshing the page.
				</p>
				<button
					on:click={handleReconnect}
					class="mt-2 rounded bg-yellow-600 px-3 py-1 text-xs text-white transition-colors hover:bg-yellow-700"
				>
					Reconnect
				</button>
			</div>
		</div>
	</div>
{:else if deviceId}
	<div
		in:fade={{ duration: 300 }}
		class="fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-green-500/50 bg-green-900/90 p-3"
	>
		<div class="flex items-center space-x-2">
			<CheckCircle class="h-4 w-4 text-green-400" />
			<div class="flex-1">
				<p class="text-xs font-medium text-green-400">
					<Smartphone class="mr-1 inline h-3 w-3" />
					Vinyl Player Ready
				</p>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Auto-hide the success message after a few seconds */
	.auto-hide {
		animation: autoHide 4s ease-in-out forwards;
	}

	@keyframes autoHide {
		0%,
		70% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			pointer-events: none;
		}
	}
</style>
