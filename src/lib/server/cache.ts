// Simple in-memory cache with TTL support
interface CacheItem<T> {
	data: T;
	expires: number;
}

class SimpleCache {
	private cache = new Map<string, CacheItem<any>>();
	private cleanupInterval: NodeJS.Timeout;

	constructor() {
		// Clean up expired items every 5 minutes
		this.cleanupInterval = setInterval(
			() => {
				this.cleanup();
			},
			5 * 60 * 1000
		);
	}

	set<T>(key: string, data: T, ttlSeconds: number = 3600): void {
		const expires = Date.now() + ttlSeconds * 1000;
		this.cache.set(key, { data, expires });
	}

	get<T>(key: string): T | null {
		const item = this.cache.get(key);
		if (!item) return null;

		if (Date.now() > item.expires) {
			this.cache.delete(key);
			return null;
		}

		return item.data;
	}

	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	has(key: string): boolean {
		const item = this.cache.get(key);
		if (!item) return false;

		if (Date.now() > item.expires) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	clear(): void {
		this.cache.clear();
	}

	private cleanup(): void {
		const now = Date.now();
		for (const [key, item] of this.cache.entries()) {
			if (now > item.expires) {
				this.cache.delete(key);
			}
		}
	}

	// Get cache stats
	getStats() {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys())
		};
	}

	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		this.clear();
	}
}

// Create singleton cache instance
export const cache = new SimpleCache();

// Cache key generators
export const CacheKeys = {
	discogsCollection: (username: string) => `discogs:collection:${username}`,
	discogsUser: (username: string) => `discogs:user:${username}`,
	spotifyAlbum: (artist: string, album: string) => `spotify:album:${artist}:${album}`,
	spotifySearch: (query: string) => `spotify:search:${encodeURIComponent(query)}`,
	collectionWithMatches: (username: string) => `collection:matched:${username}`
};

// Cache durations (in seconds)
export const CacheDurations = {
	DISCOGS_COLLECTION: 24 * 60 * 60, // 24 hours
	DISCOGS_USER: 60 * 60, // 1 hour
	SPOTIFY_SEARCH: 7 * 24 * 60 * 60, // 7 days (searches rarely change)
	SPOTIFY_ALBUM: 30 * 24 * 60 * 60, // 30 days (album data is static)
	COLLECTION_MATCHED: 24 * 60 * 60 // 24 hours
};
