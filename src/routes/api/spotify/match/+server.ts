import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverSpotifyService } from '$lib/server/services/spotify';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Get access token from Authorization header
		const authHeader = request.headers.get('authorization');
		const accessToken = authHeader?.replace('Bearer ', '');

		if (!accessToken) {
			throw error(401, 'Spotify access token is required');
		}

		const body = await request.json();
		const { records, options = {} } = body;

		if (!records || !Array.isArray(records)) {
			throw error(400, 'Records array is required');
		}

		const {
			batchSize = 50, // Process in batches
			useCache = true, // Use cached results
			rateLimit = 100 // MS between requests
		} = options;

		console.log(`Starting Spotify matching for ${records.length} records`);

		let matchedRecords;

		if (useCache) {
			// Use intelligent caching
			matchedRecords = await serverSpotifyService.batchMatchWithCache(records, accessToken);
		} else {
			// Force fresh matching
			matchedRecords = await serverSpotifyService.matchRecordsWithSpotify(records, accessToken);
		}

		const stats = {
			total: records.length,
			matched: matchedRecords.filter((r) => r.spotifyId).length,
			unmatched: matchedRecords.filter((r) => !r.spotifyId).length,
			matchRate: Math.round(
				(matchedRecords.filter((r) => r.spotifyId).length / records.length) * 100
			)
		};

		console.log(
			`Spotify matching complete: ${stats.matched}/${stats.total} matched (${stats.matchRate}%)`
		);

		return json({
			success: true,
			records: matchedRecords,
			stats,
			timestamp: new Date().toISOString(),
			cached: useCache
		});
	} catch (err) {
		console.error('Error in Spotify matching:', err);
		throw error(500, `Matching failed: ${err.message}`);
	}
};

// GET endpoint for checking match status
export const GET: RequestHandler = async ({ url }) => {
	const artist = url.searchParams.get('artist');
	const album = url.searchParams.get('album');

	if (!artist || !album) {
		throw error(400, 'Artist and album parameters are required');
	}

	try {
		// This would check cache only, not make API calls
		const cacheKey = `spotify:album:${artist}:${album}`;
		// For now, just return cache info

		return json({
			artist,
			album,
			cached: false, // Would check actual cache
			timestamp: new Date().toISOString()
		});
	} catch (err) {
		throw error(500, `Check failed: ${err.message}`);
	}
};
