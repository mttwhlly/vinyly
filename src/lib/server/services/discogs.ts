import { DISCOGS_CONFIG } from '$lib/config/discogs';
import { cache, CacheKeys, CacheDurations } from '../cache';
import type { VinylRecord } from '$lib/services/discogs';

interface DiscogsRelease {
	id: number;
	basic_information: {
		id: number;
		title: string;
		year: number;
		cover_image: string;
		thumb: string;
		artists: Array<{ name: string; id: number }>;
		labels: Array<{ name: string; id: number }>;
		genres: string[];
		styles: string[];
	};
	instance_id: number;
	date_added: string;
}

interface DiscogsCollection {
	releases: DiscogsRelease[];
	pagination: {
		pages: number;
		page: number;
		per_page: number;
		items: number;
		urls: { next?: string; prev?: string };
	};
}

export class ServerDiscogsService {
	private baseURL = DISCOGS_CONFIG.apiBaseUrl;
	private headers: Record<string, string>;

	constructor() {
		this.headers = {
			'User-Agent': DISCOGS_CONFIG.userAgent,
			Authorization: `Discogs token=${DISCOGS_CONFIG.personalAccessToken}`,
			'Content-Type': 'application/json'
		};
	}

	// Get user's collection with caching
	async getUserCollection(
		username: string,
		page: number = 1,
		perPage: number = 50
	): Promise<DiscogsCollection> {
		const cacheKey = `${CacheKeys.discogsCollection(username)}:page:${page}`;

		// Check cache first
		const cached = cache.get<DiscogsCollection>(cacheKey);
		if (cached) {
			console.log(`Cache hit for Discogs collection: ${username} page ${page}`);
			return cached;
		}

		try {
			const response = await fetch(
				`${this.baseURL}/users/${username}/collection/folders/0/releases?` +
					new URLSearchParams({
						page: page.toString(),
						per_page: perPage.toString(),
						sort: 'added',
						sort_order: 'desc'
					}),
				{ headers: this.headers }
			);

			if (!response.ok) {
				throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
			}

			const data: DiscogsCollection = await response.json();

			// Cache the result
			cache.set(cacheKey, data, CacheDurations.DISCOGS_COLLECTION);
			console.log(`Cached Discogs collection: ${username} page ${page}`);

			return data;
		} catch (error) {
			console.error('Error fetching Discogs collection:', error);
			throw error;
		}
	}

	// Get all pages of a user's collection with smart caching
	async getAllUserCollection(username: string): Promise<VinylRecord[]> {
		const fullCacheKey = CacheKeys.discogsCollection(username);

		// Check if we have the full collection cached
		const cachedFull = cache.get<VinylRecord[]>(fullCacheKey);
		if (cachedFull) {
			console.log(`Cache hit for full Discogs collection: ${username}`);
			return cachedFull;
		}

		const allRecords: VinylRecord[] = [];
		let page = 1;
		let hasMore = true;

		try {
			while (hasMore) {
				console.log(`Fetching Discogs collection page ${page} for ${username}...`);

				const data = await this.getUserCollection(username, page, 100);

				const records = data.releases.map(this.transformDiscogsRecord);
				allRecords.push(...records);

				hasMore = page < data.pagination.pages;
				page++;

				// Rate limiting - wait 1 second between requests
				if (hasMore) {
					await this.delay(1000);
				}
			}

			// Cache the complete collection
			cache.set(fullCacheKey, allRecords, CacheDurations.DISCOGS_COLLECTION);
			console.log(`Cached full collection: ${allRecords.length} records for ${username}`);

			return allRecords;
		} catch (error) {
			console.error('Error fetching complete collection:', error);
			throw error;
		}
	}

	// Transform Discogs record to our format
	private transformDiscogsRecord(release: DiscogsRelease): VinylRecord {
		const basic = release.basic_information;

		return {
			id: release.instance_id.toString(),
			title: basic.title,
			artist: basic.artists.map((artist) => artist.name).join(', '),
			year: basic.year || 0,
			coverImage: basic.cover_image || basic.thumb || '',
			discogsId: basic.id.toString(),
			genres: [...(basic.genres || []), ...(basic.styles || [])],
			label: basic.labels?.[0]?.name || 'Unknown Label'
		};
	}

	// Search for releases with caching
	async searchReleases(query: string, type: 'release' | 'master' = 'release'): Promise<any[]> {
		const cacheKey = CacheKeys.spotifySearch(`${query}:${type}`);

		const cached = cache.get<any[]>(cacheKey);
		if (cached) {
			console.log(`Cache hit for Discogs search: ${query}`);
			return cached;
		}

		try {
			const response = await fetch(
				`${this.baseURL}/database/search?` +
					new URLSearchParams({
						q: query,
						type,
						per_page: '25'
					}),
				{ headers: this.headers }
			);

			if (!response.ok) {
				throw new Error(`Discogs search error: ${response.status}`);
			}

			const data = await response.json();
			const results = data.results || [];

			// Cache search results
			cache.set(cacheKey, results, CacheDurations.SPOTIFY_SEARCH);

			return results;
		} catch (error) {
			console.error('Error searching Discogs:', error);
			throw error;
		}
	}

	// Test connection with caching
	async testConnection(): Promise<boolean> {
		const cacheKey = 'discogs:connection:test';

		const cached = cache.get<boolean>(cacheKey);
		if (cached !== null) {
			return cached;
		}

		try {
			const response = await fetch(`${this.baseURL}/oauth/identity`, {
				headers: this.headers
			});

			const isConnected = response.ok;

			// Cache connection status for 5 minutes
			cache.set(cacheKey, isConnected, 5 * 60);

			if (isConnected) {
				const data = await response.json();
				console.log('Discogs connection successful:', data);
			}

			return isConnected;
		} catch (error) {
			console.error('Discogs connection failed:', error);
			cache.set(cacheKey, false, 60); // Cache failure for 1 minute
			return false;
		}
	}

	private async delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// Clear cache for a specific user
	clearUserCache(username: string): void {
		const patterns = [
			CacheKeys.discogsCollection(username),
			CacheKeys.discogsUser(username),
			CacheKeys.collectionWithMatches(username)
		];

		patterns.forEach((pattern) => {
			cache.delete(pattern);
			// Also clear paginated cache entries
			for (let page = 1; page <= 100; page++) {
				cache.delete(`${pattern}:page:${page}`);
			}
		});

		console.log(`Cleared cache for user: ${username}`);
	}
}

export const serverDiscogsService = new ServerDiscogsService();
