<script lang="ts">
	import { Search, Settings, Disc3 } from 'lucide-svelte';
	import { fly, fade } from 'svelte/transition';
	import { collectionStore } from '$lib/stores/collection';
	import { authStore } from '$lib/stores/auth';

	let searchQuery = '';

	function handleSearch(e: Event) {
		const target = e.target as HTMLInputElement;
		collectionStore.setSearchQuery(target.value);
	}

	function handleLogout() {
		authStore.logout();
	}
</script>

<header class="sticky top-0 z-50 border-b border-gray-800 bg-black/30 backdrop-blur-sm">
	<div class="container mx-auto px-4">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo -->
			<div class="flex items-center space-x-3" in:fly={{ x: -20, duration: 500 }}>
				<h1 class="text-xl font-bold">Vinyl Player</h1>
			</div>

			<!-- Search Bar -->
			<div class="relative mx-4 w-full max-w-md" in:fly={{ y: -10, duration: 500, delay: 100 }}>
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
				<input
					type="text"
					placeholder="Search your collection..."
					bind:value={searchQuery}
					on:input={handleSearch}
					class="w-full rounded-lg border border-gray-700 bg-gray-800/50 py-2 pr-4 pl-10 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
				/>
			</div>

			<!-- Settings -->
			<div class="flex items-center space-x-2" in:fly={{ x: 20, duration: 500, delay: 200 }}>
				<button class="rounded-lg p-2 transition-colors hover:bg-gray-800">
					<Settings class="h-5 w-5 text-gray-400 hover:text-white" />
				</button>
				<button
					on:click={handleLogout}
					class="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
				>
					Logout
				</button>
			</div>
		</div>
	</div>
</header>
