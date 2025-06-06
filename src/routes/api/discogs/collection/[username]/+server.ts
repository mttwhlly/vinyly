import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverDiscogsService } from '$lib/server/services/discogs';
import { serverSpotifyService } from '$lib/server/services/spotify';
import { cache, CacheKeys, CacheDurations } from '$lib/server/cache';

export const GET: RequestHandler = async ({ params, url, request }) => {
	const { username } = params;

	if (!username) {
		throw error(400, 'Username is required');
	}

	try {
		// Get access token from Authorization header
		const authHeader = request.headers.get('authorization');
		const accessToken = authHeader?.replace('Bearer ', '');

		if (!accessToken) {
			throw error(401, 'Spotify access token is required');
		}

		// Check query parameters
		const syncType = url.searchParams.get('sync') || 'cached'; // 'cached', 'fresh', 'matched'
		const forceRefresh = url.searchParams.get('refresh') === 'true';

		// Clear cache if force refresh requested
		if (forceRefresh) {
			serverDiscogsService.clearUserCache(username);
		}

		let records: any[];

		switch (syncType) {
			case 'fresh':
				// Force fresh fetch from Discogs (no cache)
				console.log(`Fresh sync requested for ${username}`);
				serverDiscogsService.clearUserCache(username);
				records = await serverDiscogsService.getAllUserCollection(username);
				break;

			case 'matched':
				// Get collection and match with Spotify
				const cacheKey = CacheKeys.collectionWithMatches(username);

				let cachedMatched = cache.get(cacheKey);
				if (cachedMatched && !forceRefresh) {
					console.log(`Cache hit for matched collection: ${username}`);
					records = cachedMatched;
				} else {
					console.log(`Fetching and matching collection for ${username}`);

					// Get Discogs collection
					const discogsRecords = await serverDiscogsService.getAllUserCollection(username);

					// Match with Spotify
					records = await serverSpotifyService.batchMatchWithCache(discogsRecords, accessToken);

					// Cache the matched results
					cache.set(cacheKey, records, CacheDurations.COLLECTION_MATCHED);
				}
				break;

			case 'cached':
			default:
				// Try cache first, then fetch if needed
				records = await serverDiscogsService.getAllUserCollection(username);
				break;
		}

		// Add metadata
		const response = {
			username,
			total: records.length,
			syncType,
			cached: syncType === 'cached',
			matchedCount: records.filter((r) => r.spotifyId).length,
			timestamp: new Date().toISOString(),
			records
		};

		return json(response);
	} catch (err) {
		console.error(`Error fetching collection for ${username}:`, err);

		if (err.message?.includes('404')) {
			throw error(404, `User '${username}' not found or collection is private`);
		}

		if (err.message?.includes('401')) {
			throw error(401, 'Invalid Discogs access token');
		}

		throw error(500, `Failed to fetch collection: ${err.message}`);
	}
};

// POST endpoint for triggering background sync
export const POST: RequestHandler = async ({ params, request }) => {
	const { username } = params;

	if (!username) {
		throw error(400, 'Username is required');
	}

	try {
		const body = await request.json();
		const { action, options = {} } = body;

		switch (action) {
			case 'clear_cache':
				serverDiscogsService.clearUserCache(username);
				return json({
					success: true,
					message: `Cache cleared for ${username}`,
					timestamp: new Date().toISOString()
				});

			case 'test_connection':
				const isConnected = await serverDiscogsService.testConnection();
				return json({
					connected: isConnected,
					timestamp: new Date().toISOString()
				});

			case 'preload':
				// Trigger background preload (fire and forget)
				serverDiscogsService.getAllUserCollection(username).catch((err) => {
					console.error(`Background preload failed for ${username}:`, err);
				});

				return json({
					success: true,
					message: `Background preload started for ${username}`,
					timestamp: new Date().toISOString()
				});

			default:
				throw error(400, `Unknown action: ${action}`);
		}
	} catch (err) {
		console.error(`Error in POST /api/discogs/collection/${username}:`, err);
		throw error(500, `Action failed: ${err.message}`);
	}
};
