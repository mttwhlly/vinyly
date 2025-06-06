import { writable, derived } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { discogsService } from '$lib/services/discogs';
import { spotifyMatchingService } from '$lib/services/spotify';
import type { VinylRecord } from '$lib/services/discogs';

interface CollectionState {
	items: VinylRecord[];
	loading: boolean;
	error: string | null;
	searchQuery: string;
	selectedGenre: string | null;
	discogsUsername: string | null;
	progress: {
		stage: string;
		current: number;
		total: number;
	} | null;
}

const initialState: CollectionState = {
	items: [],
	loading: false,
	error: null,
	searchQuery: '',
	selectedGenre: null,
	discogsUsername: null,
	progress: null
};

// Mock data with working placeholder images
const mockVinylData: VinylRecord[] = [
	{
		id: '1',
		title: 'Dark Side of the Moon',
		artist: 'Pink Floyd',
		year: 1973,
		coverImage: 'https://via.placeholder.com/300x300/8B5CF6/FFFFFF?text=Dark+Side+of+the+Moon',
		discogsId: '178127',
		spotifyId: '4LH4d3cOWNNsVw41Gqt2kv',
		genres: ['Progressive Rock', 'Psychedelic Rock'],
		label: 'Harvest'
	},
	{
		id: '2',
		title: 'Abbey Road',
		artist: 'The Beatles',
		year: 1969,
		coverImage: 'https://via.placeholder.com/300x300/10B981/FFFFFF?text=Abbey+Road',
		discogsId: '24047',
		spotifyId: '0ETFjACtuP2ADo6LFhL6HN',
		genres: ['Rock', 'Pop'],
		label: 'Apple Records'
	},
	{
		id: '3',
		title: 'Kind of Blue',
		artist: 'Miles Davis',
		year: 1959,
		coverImage: 'https://via.placeholder.com/300x300/3B82F6/FFFFFF?text=Kind+of+Blue',
		discogsId: '424728',
		spotifyId: '1weenld61qoidwYuZ1GESA',
		genres: ['Jazz', 'Cool Jazz'],
		label: 'Columbia'
	},
	{
		id: '4',
		title: 'Nevermind',
		artist: 'Nirvana',
		year: 1991,
		coverImage: 'https://via.placeholder.com/300x300/EF4444/FFFFFF?text=Nevermind',
		discogsId: '371635',
		spotifyId: '2UJcKiJxNryhL050b5deFH',
		genres: ['Grunge', 'Alternative Rock'],
		label: 'DGC'
	},
	{
		id: '5',
		title: 'Random Access Memories',
		artist: 'Daft Punk',
		year: 2013,
		coverImage: 'https://via.placeholder.com/300x300/F59E0B/FFFFFF?text=Random+Access+Memories',
		discogsId: '4721624',
		spotifyId: '4m2880jivSbbyEGAKfITCa',
		genres: ['Electronic', 'Disco'],
		label: 'Columbia'
	},
	{
		id: '6',
		title: 'To Pimp a Butterfly',
		artist: 'Kendrick Lamar',
		year: 2015,
		coverImage: 'https://via.placeholder.com/300x300/8B5CF6/FFFFFF?text=To+Pimp+a+Butterfly',
		discogsId: '6999011',
		spotifyId: '7ycBtnsMtyVbbwTfJwRjSP',
		genres: ['Hip Hop', 'Jazz Rap'],
		label: 'Top Dawg Entertainment'
	}
];

function createCollectionStore() {
	const { subscribe, set, update }: Writable<CollectionState> = writable(initialState);

	return {
		subscribe,

		async loadCollection() {
			update((state) => ({ ...state, loading: true, error: null }));

			try {
				// For now, use mock data with proper placeholder images
				await new Promise((resolve) => setTimeout(resolve, 1000));

				update((state) => ({
					...state,
					items: mockVinylData,
					loading: false,
					progress: null
				}));
			} catch (error) {
				update((state) => ({
					...state,
					error: error.message,
					loading: false,
					progress: null
				}));
			}
		},

		async syncWithDiscogs(username: string) {
			update((state) => ({
				...state,
				loading: true,
				error: null,
				discogsUsername: username,
				progress: { stage: 'Testing connection...', current: 0, total: 100 }
			}));

			try {
				// Test Discogs connection
				const connected = await discogsService.testConnection();
				if (!connected) {
					throw new Error('Failed to connect to Discogs. Check your access token.');
				}

				// Fetch collection from Discogs
				update((state) => ({
					...state,
					progress: { stage: 'Fetching collection from Discogs...', current: 20, total: 100 }
				}));

				const discogsRecords = await discogsService.getAllUserCollection(username);

				update((state) => ({
					...state,
					progress: { stage: 'Matching with Spotify...', current: 60, total: 100 }
				}));

				// Match with Spotify
				const matchedRecords = await spotifyMatchingService.matchRecordsWithSpotify(discogsRecords);

				update((state) => ({
					...state,
					items: matchedRecords,
					loading: false,
					progress: null
				}));

				console.log(`Successfully loaded ${matchedRecords.length} records from Discogs`);
			} catch (error) {
				console.error('Discogs sync error:', error);
				update((state) => ({
					...state,
					error: `Failed to sync with Discogs: ${error.message}`,
					loading: false,
					progress: null
				}));
			}
		},

		setSearchQuery(query: string) {
			update((state) => ({ ...state, searchQuery: query }));
		},

		setSelectedGenre(genre: string | null) {
			update((state) => ({ ...state, selectedGenre: genre }));
		},

		addRecord(record: VinylRecord) {
			update((state) => ({
				...state,
				items: [...state.items, record]
			}));
		},

		removeRecord(recordId: string) {
			update((state) => ({
				...state,
				items: state.items.filter((item) => item.id !== recordId)
			}));
		},

		clearCollection() {
			update((state) => ({
				...state,
				items: [],
				discogsUsername: null
			}));
		}
	};
}

export const collectionStore = createCollectionStore();

// Derived store for filtered collection
export const filteredCollection = derived(collectionStore, ($collection) => {
	let filtered = $collection.items;

	// Filter by search query
	if ($collection.searchQuery) {
		const query = $collection.searchQuery.toLowerCase();
		filtered = filtered.filter(
			(item) =>
				item.title.toLowerCase().includes(query) ||
				item.artist.toLowerCase().includes(query) ||
				item.genres.some((genre) => genre.toLowerCase().includes(query))
		);
	}

	// Filter by genre
	if ($collection.selectedGenre) {
		filtered = filtered.filter((item) => item.genres.includes($collection.selectedGenre!));
	}

	return filtered;
});

// Store that includes filtered items for easier component access
export const collectionWithFiltered = derived(
	[collectionStore, filteredCollection],
	([$collection, $filtered]) => ({
		...$collection,
		filteredItems: $filtered
	})
);
