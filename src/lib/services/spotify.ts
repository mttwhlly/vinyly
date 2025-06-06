import { SPOTIFY_CONFIG } from '$lib/config/spotify';
import { authStore } from '$lib/stores/auth';
import { get } from 'svelte/store';
import type { VinylRecord } from './discogs';

interface SpotifySearchResult {
	albums: {
		items: Array<{
			id: string;
			name: string;
			artists: Array<{ name: string }>;
			images: Array<{ url: string; width: number; height: number }>;
			release_date: string;
			total_tracks: number;
		}>;
	};
}

class SpotifyMatchingService {
	private async getAccessToken(): Promise<string | null> {
		const auth = get(authStore);
		return auth.accessToken;
	}

	// Search for album on Spotify
	async searchAlbum(artist: string, album: string): Promise<string | null> {
		const token = await this.getAccessToken();
		if (!token) return null;

		try {
			// Clean and prepare search query
			const cleanArtist = this.cleanSearchTerm(artist);
			const cleanAlbum = this.cleanSearchTerm(album);
			const query = `artist:"${cleanArtist}" album:"${cleanAlbum}"`;

			const response = await fetch(
				`${SPOTIFY_CONFIG.apiBaseUrl}/search?` +
					new URLSearchParams({
						q: query,
						type: 'album',
						limit: '5'
					}),
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			if (!response.ok) {
				console.warn(`Spotify search failed for ${artist} - ${album}:`, response.status);
				return null;
			}

			const data: SpotifySearchResult = await response.json();

			if (data.albums.items.length === 0) {
				// Try a broader search without quotes
				return this.searchAlbumBroad(cleanArtist, cleanAlbum);
			}

			// Return the first match
			return data.albums.items[0].id;
		} catch (error) {
			console.error(`Error searching Spotify for ${artist} - ${album}:`, error);
			return null;
		}
	}

	// Broader search without exact matching
	private async searchAlbumBroad(artist: string, album: string): Promise<string | null> {
		const token = await this.getAccessToken();
		if (!token) return null;

		try {
			const query = `${artist} ${album}`;

			const response = await fetch(
				`${SPOTIFY_CONFIG.apiBaseUrl}/search?` +
					new URLSearchParams({
						q: query,
						type: 'album',
						limit: '10'
					}),
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}
			);

			if (!response.ok) return null;

			const data: SpotifySearchResult = await response.json();

			// Find best match based on similarity
			const bestMatch = this.findBestMatch(data.albums.items, artist, album);
			return bestMatch?.id || null;
		} catch (error) {
			console.error('Error in broad Spotify search:', error);
			return null;
		}
	}

	// Find best matching album
	private findBestMatch(albums: any[], targetArtist: string, targetAlbum: string) {
		if (albums.length === 0) return null;

		return (
			albums.find((album) => {
				const albumArtist = album.artists[0]?.name.toLowerCase();
				const albumName = album.name.toLowerCase();
				const searchArtist = targetArtist.toLowerCase();
				const searchAlbum = targetAlbum.toLowerCase();

				// Check if artist name is close enough
				const artistMatch =
					albumArtist.includes(searchArtist) ||
					searchArtist.includes(albumArtist) ||
					this.calculateSimilarity(albumArtist, searchArtist) > 0.7;

				// Check if album name is close enough
				const albumMatch =
					albumName.includes(searchAlbum) ||
					searchAlbum.includes(albumName) ||
					this.calculateSimilarity(albumName, searchAlbum) > 0.7;

				return artistMatch && albumMatch;
			}) || albums[0]
		); // Fallback to first result
	}

	// Simple string similarity calculation
	private calculateSimilarity(str1: string, str2: string): number {
		const longer = str1.length > str2.length ? str1 : str2;
		const shorter = str1.length > str2.length ? str2 : str1;

		if (longer.length === 0) return 1.0;

		const editDistance = this.levenshteinDistance(longer, shorter);
		return (longer.length - editDistance) / longer.length;
	}

	// Levenshtein distance for string similarity
	private levenshteinDistance(str1: string, str2: string): number {
		const matrix = Array(str2.length + 1)
			.fill(null)
			.map(() => Array(str1.length + 1).fill(null));

		for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
		for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

		for (let j = 1; j <= str2.length; j++) {
			for (let i = 1; i <= str1.length; i++) {
				const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
				matrix[j][i] = Math.min(
					matrix[j][i - 1] + 1, // insertion
					matrix[j - 1][i] + 1, // deletion
					matrix[j - 1][i - 1] + substitutionCost // substitution
				);
			}
		}

		return matrix[str2.length][str1.length];
	}

	// Clean search terms
	private cleanSearchTerm(term: string): string {
		return term
			.replace(/\([^)]*\)/g, '') // Remove text in parentheses
			.replace(/\[[^\]]*\]/g, '') // Remove text in brackets
			.replace(/[^\w\s]/g, ' ') // Remove special characters
			.replace(/\s+/g, ' ') // Normalize whitespace
			.trim();
	}

	// Match multiple records with rate limiting
	async matchRecordsWithSpotify(records: VinylRecord[]): Promise<VinylRecord[]> {
		const matchedRecords: VinylRecord[] = [];
		let processed = 0;

		console.log(`Starting Spotify matching for ${records.length} records...`);

		for (const record of records) {
			try {
				const spotifyId = await this.searchAlbum(record.artist, record.title);

				matchedRecords.push({
					...record,
					spotifyId: spotifyId || undefined
				});

				processed++;

				if (processed % 10 === 0) {
					console.log(`Matched ${processed}/${records.length} records with Spotify`);
				}

				// Rate limiting - 30 requests per second max
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				console.error(`Error matching record ${record.title}:`, error);
				matchedRecords.push(record); // Add without Spotify ID
			}
		}

		const matchedCount = matchedRecords.filter((r) => r.spotifyId).length;
		console.log(`Spotify matching complete: ${matchedCount}/${records.length} matched`);

		return matchedRecords;
	}
}

export const spotifyMatchingService = new SpotifyMatchingService();
