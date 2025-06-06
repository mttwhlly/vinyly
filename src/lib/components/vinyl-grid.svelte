<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { Play, Pause, Disc3 } from 'lucide-svelte';
	import { collectionWithFiltered } from '$lib/stores/collection';
	import { spotifyStore } from '$lib/stores/spotify';

	$: collection = $collectionWithFiltered;
	$: filteredCollection = collection.filteredItems || [];
	$: currentTrack = $spotifyStore.currentTrack;
	$: isPlaying = $spotifyStore.isPlaying;

	function handleAlbumPlay(album: any) {
		if (currentTrack?.album.id === album.spotifyId && isPlaying) {
			spotifyStore.pause();
		} else {
			spotifyStore.playAlbum(album.spotifyId);
		}
	}
</script>

<div class="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
	{#each filteredCollection as album, i}
		<div
			in:fly={{ y: 20, duration: 400, delay: i * 50 }}
			class="group relative rounded-xl bg-gray-800/40 p-4 transition-all duration-300 hover:scale-105 hover:bg-gray-800/60 hover:shadow-2xl hover:shadow-purple-500/20"
		>
			<!-- Album Cover -->
			<div class="relative mb-4 aspect-square overflow-hidden rounded-lg">
				<img
					src={album.coverImage}
					alt="{album.title} by {album.artist}"
					class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
					loading="lazy"
				/>

				<!-- Play Button Overlay -->
				<div
					class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				>
					<button
						on:click={() => handleAlbumPlay(album)}
						class="flex h-12 w-12 transform items-center justify-center rounded-full bg-purple-600 shadow-lg transition-all duration-200 hover:scale-110 hover:bg-purple-500"
					>
						{#if currentTrack?.album.id === album.spotifyId && isPlaying}
							<Pause class="ml-0 h-5 w-5 text-white" />
						{:else}
							<Play class="ml-0.5 h-5 w-5 text-white" />
						{/if}
					</button>
				</div>
			</div>

			<!-- Album Info -->
			<div class="space-y-1">
				<h3
					class="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-purple-300"
				>
					{album.title}
				</h3>
				<p class="line-clamp-1 text-xs text-gray-400">
					{album.artist}
				</p>
				<div class="flex items-center justify-between pt-1">
					<span class="text-xs text-gray-500">
						{album.year}
					</span>
					{#if album.spotifyId}
						<div class="h-2 w-2 rounded-full bg-green-500" title="Available on Spotify"></div>
					{:else}
						<div class="h-2 w-2 rounded-full bg-gray-600" title="Not found on Spotify"></div>
					{/if}
				</div>
			</div>
		</div>
	{/each}
</div>

<!-- Empty State -->
{#if filteredCollection.length === 0}
	<div in:fade={{ duration: 300 }} class="col-span-full py-16 text-center">
		<div class="mb-4 text-gray-400">
			<Disc3 class="mx-auto mb-4 h-16 w-16 opacity-50" />
			<p class="text-lg">No records found</p>
			<p class="mt-2 text-sm">Try adjusting your search or connect your Discogs account</p>
		</div>
	</div>
{/if}

<style>
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
