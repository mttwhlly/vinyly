<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { Disc3, Music, Play } from 'lucide-svelte';
	import { authStore } from '$lib/stores/auth';

	function handleSpotifyLogin() {
		authStore.login();
	}
</script>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900"
>
	<div class="container mx-auto px-4" in:fade={{ duration: 800 }}>
		<div class="mx-auto max-w-2xl text-center">
			<!-- Logo & Title -->
			<div class="mb-8">
				<div
					class="mb-6 flex items-center justify-center space-x-4"
					in:fly={{ y: -20, duration: 600, delay: 200 }}
				>
					<Disc3 class="animate-spin-slow h-16 w-16 text-purple-400" />
					<Music class="h-12 w-12 text-pink-400" />
					<Play class="h-14 w-14 text-purple-300" />
				</div>

				<h1
					class="mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-300 bg-clip-text text-5xl font-bold text-transparent md:text-6xl"
				>
					Vinyl Player
				</h1>
				<p class="text-xl leading-relaxed text-gray-300">
					Stream your Discogs vinyl collection through Spotify
				</p>
			</div>

			<!-- Features -->
			<div class="mb-12 grid gap-6 md:grid-cols-3" in:fly={{ y: 20, duration: 600, delay: 400 }}>
				<div class="rounded-xl border border-gray-700/50 bg-gray-800/40 p-6 backdrop-blur-sm">
					<Disc3 class="mx-auto mb-3 h-8 w-8 text-purple-400" />
					<h3 class="mb-2 font-semibold text-white">Your Collection</h3>
					<p class="text-sm text-gray-400">
						Connect your Discogs account to browse your vinyl records
					</p>
				</div>

				<div class="rounded-xl border border-gray-700/50 bg-gray-800/40 p-6 backdrop-blur-sm">
					<Music class="mx-auto mb-3 h-8 w-8 text-green-400" />
					<h3 class="mb-2 font-semibold text-white">Spotify Streaming</h3>
					<p class="text-sm text-gray-400">Stream matching albums directly through Spotify</p>
				</div>

				<div class="rounded-xl border border-gray-700/50 bg-gray-800/40 p-6 backdrop-blur-sm">
					<Play class="mx-auto mb-3 h-8 w-8 text-pink-400" />
					<h3 class="mb-2 font-semibold text-white">Seamless Playback</h3>
					<p class="text-sm text-gray-400">Beautiful player with full playback controls</p>
				</div>
			</div>

			<!-- Login Button -->
			<button
				on:click={handleSpotifyLogin}
				class="group relative rounded-xl bg-green-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-green-500 hover:shadow-2xl hover:shadow-green-500/30"
				in:fly={{ y: 20, duration: 600, delay: 600 }}
			>
				<div class="flex items-center space-x-3">
					<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.359.24-.66.54-.779 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.019zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.301.421-1.02.599-1.559.3z"
						/>
					</svg>
					<span>Connect with Spotify</span>
				</div>

				<!-- Animated background -->
				<div
					class="absolute inset-0 rounded-xl bg-green-400 opacity-0 transition-opacity duration-300 group-hover:opacity-20"
				></div>
			</button>

			<!-- Requirements Note -->
			<p class="mt-8 text-sm text-gray-500" in:fade={{ duration: 600, delay: 800 }}>
				Requires Spotify Premium for playback functionality
			</p>
		</div>
	</div>
</div>
