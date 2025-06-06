<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Play, Pause, SkipBack, SkipForward, Volume2, Heart } from 'lucide-svelte';
	import { spotifyStore } from '$lib/stores/spotify';

	$: currentTrack = $spotifyStore.currentTrack;
	$: isPlaying = $spotifyStore.isPlaying;
	$: position = $spotifyStore.position;
	$: duration = $spotifyStore.duration;
	$: volume = $spotifyStore.volume;

	function formatTime(ms: number): string {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	function handleSeek(e: Event) {
		const target = e.target as HTMLInputElement;
		const seekPosition = (parseFloat(target.value) / 100) * duration;
		spotifyStore.seek(seekPosition);
	}

	function handleVolumeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		spotifyStore.setVolume(parseFloat(target.value) / 100);
	}
</script>

{#if currentTrack}
	<div
		in:fly={{ y: 100, duration: 500 }}
		class="fixed right-0 bottom-0 left-0 z-40 border-t border-gray-800 bg-gray-900/95 p-4 backdrop-blur-lg"
	>
		<div class="container mx-auto">
			<!-- Progress Bar -->
			<div class="mb-4">
				<input
					type="range"
					min="0"
					max="100"
					value={duration > 0 ? (position / duration) * 100 : 0}
					on:input={handleSeek}
					class="slider h-1 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
				/>
				<div class="mt-1 flex justify-between text-xs text-gray-400">
					<span>{formatTime(position)}</span>
					<span>{formatTime(duration)}</span>
				</div>
			</div>

			<div class="flex items-center justify-between">
				<!-- Track Info -->
				<div class="flex min-w-0 flex-1 items-center space-x-4">
					{#if currentTrack.album.images.length > 0}
						<img
							src={currentTrack.album.images[0].url}
							alt={currentTrack.album.name}
							class="h-12 w-12 rounded-lg shadow-lg"
						/>
					{/if}
					<div class="min-w-0 flex-1">
						<h4 class="truncate text-sm font-semibold">{currentTrack.name}</h4>
						<p class="truncate text-xs text-gray-400">
							{currentTrack.artists.map((a) => a.name).join(', ')} • {currentTrack.album.name}
						</p>
					</div>
					<button class="rounded-full p-2 transition-colors hover:bg-gray-800">
						<Heart class="h-4 w-4 text-gray-400 hover:text-red-400" />
					</button>
				</div>

				<!-- Controls -->
				<div class="mx-8 flex items-center space-x-4">
					<button
						on:click={() => spotifyStore.previousTrack()}
						class="rounded-full p-2 transition-colors hover:bg-gray-800"
					>
						<SkipBack class="h-5 w-5 text-gray-300 hover:text-white" />
					</button>

					<button
						on:click={() => (isPlaying ? spotifyStore.pause() : spotifyStore.resume())}
						class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 transition-all duration-200 hover:scale-105 hover:bg-purple-500"
					>
						{#if isPlaying}
							<Pause class="h-5 w-5 text-white" />
						{:else}
							<Play class="ml-0.5 h-5 w-5 text-white" />
						{/if}
					</button>

					<button
						on:click={() => spotifyStore.nextTrack()}
						class="rounded-full p-2 transition-colors hover:bg-gray-800"
					>
						<SkipForward class="h-5 w-5 text-gray-300 hover:text-white" />
					</button>
				</div>

				<!-- Volume -->
				<div class="flex flex-1 items-center justify-end space-x-3">
					<Volume2 class="h-4 w-4 text-gray-400" />
					<input
						type="range"
						min="0"
						max="100"
						value={volume * 100}
						on:input={handleVolumeChange}
						class="slider h-1 w-24 cursor-pointer appearance-none rounded-lg bg-gray-700"
					/>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.slider::-webkit-slider-thumb {
		appearance: none;
		height: 12px;
		width: 12px;
		border-radius: 50%;
		background: #a855f7;
		cursor: pointer;
		border: 2px solid #ffffff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.slider::-webkit-slider-thumb:hover {
		background: #9333ea;
		transform: scale(1.1);
	}

	.slider::-moz-range-thumb {
		height: 12px;
		width: 12px;
		border-radius: 50%;
		background: #a855f7;
		cursor: pointer;
		border: 2px solid #ffffff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
</style>
