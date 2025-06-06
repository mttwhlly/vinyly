<script lang="ts">
	import { fade } from 'svelte/transition';
	import { ExternalLink, Key, User } from 'lucide-svelte';

	let showGuide = false;
</script>

<div class="mx-auto max-w-2xl" in:fade={{ duration: 500 }}>
	<div class="mb-6 rounded-lg border border-blue-500/30 bg-blue-900/20 p-6">
		<div class="flex items-start space-x-3">
			<Key class="mt-0.5 h-5 w-5 text-blue-400" />
			<div>
				<h3 class="mb-2 font-medium text-blue-400">Discogs Setup Required</h3>
				<p class="mb-3 text-sm text-gray-300">
					To connect your Discogs collection, you need to set up a personal access token.
				</p>
				<button
					on:click={() => (showGuide = !showGuide)}
					class="text-sm text-blue-400 underline hover:text-blue-300"
				>
					{showGuide ? 'Hide' : 'Show'} setup instructions
				</button>
			</div>
		</div>
	</div>

	{#if showGuide}
		<div class="space-y-6 rounded-lg bg-gray-800/40 p-6" in:fade={{ duration: 300 }}>
			<h3 class="flex items-center space-x-2 font-semibold text-white">
				<Key class="h-5 w-5" />
				<span>Getting Your Discogs Access Token</span>
			</h3>

			<div class="space-y-4">
				<div class="flex items-start space-x-3">
					<div
						class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white"
					>
						1
					</div>
					<div>
						<p class="text-sm text-gray-300">
							Go to your <a
								href="https://www.discogs.com/settings/developers"
								target="_blank"
								class="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300"
							>
								<span>Discogs Developer Settings</span>
								<ExternalLink class="h-3 w-3" />
							</a>
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-3">
					<div
						class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white"
					>
						2
					</div>
					<div>
						<p class="text-sm text-gray-300">
							Click "Generate new token" to create a personal access token
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-3">
					<div
						class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white"
					>
						3
					</div>
					<div>
						<p class="text-sm text-gray-300">
							Copy the token and add it to your <code
								class="rounded bg-gray-700 px-1 text-purple-300">src/lib/config/discogs.ts</code
							> file
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-3">
					<div
						class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white"
					>
						4
					</div>
					<div>
						<p class="text-sm text-gray-300">
							Make sure your Discogs collection is public or the token has collection access
						</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg bg-gray-700/50 p-4">
				<h4 class="mb-2 text-sm font-medium text-white">Config Example:</h4>
				<pre class="overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-300"><code
						>{`.env file:
VITE_DISCOGS_PERSONAL_ACCESS_TOKEN=your_token_here
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_APP_URL=http://127.0.0.1:5173`}</code
					></pre>
				<p class="mt-2 text-xs text-gray-400">
					The config files will automatically read from environment variables.
				</p>
			</div>

			<div class="rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-4">
				<div class="flex items-start space-x-2">
					<User class="mt-0.5 h-4 w-4 text-yellow-400" />
					<div>
						<p class="text-sm font-medium text-yellow-400">Demo Mode Available</p>
						<p class="mt-1 text-xs text-gray-300">
							You can use the "Demo Collection" button to try the app with sample data without
							setting up Discogs.
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
