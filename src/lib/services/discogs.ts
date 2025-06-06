import { DISCOGS_CONFIG } from '$lib/config/discogs';
import axios from 'axios';

interface DiscogsRelease {
	id: number;
	basic_information: {
		id: number;
		title: string;
		year: number;
		cover_image: string;
		thumb: string;
		artists: Array<{
			name: string;
			id: number;
		}>;
		labels: Array<{
			name: string;
			id: number;
		}>;
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
		urls: {
			next?: string;
			prev?: string;
		};
	};
}

interface VinylRecord {
	id: string;
	title: string;
	artist: string;
	year: number;
	coverImage: string;
	discogsId: string;
	spotifyId?: string;
	genres: string[];
	label: string;
}

class DiscogsService {
	private baseURL = DISCOGS_CONFIG.apiBaseUrl;
	private headers: Record<string, string>;

	constructor() {
		this.headers = {
			'User-Agent': DISCOGS_CONFIG.userAgent,
			Authorization: `Discogs token=${DISCOGS_CONFIG.personalAccessToken}`,
			'Content-Type': 'application/json'
		};
	}

	// Rate limiting helper
	private async delay(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// Get user's collection
	async getUserCollection(
		username: string,
		page: number = 1,
		perPage: number = 50
	): Promise<DiscogsCollection> {
		try {
			const response = await axios.get(
				`${this.baseURL}/users/${username}/collection/folders/0/releases`,
				{
					headers: this.headers,
					params: {
						page,
						per_page: perPage,
						sort: 'added',
						sort_order: 'desc'
					}
				}
			);

			return response.data;
		} catch (error) {
			console.error('Error fetching Discogs collection:', error);
			throw error;
		}
	}

	// Get all pages of a user's collection
	async getAllUserCollection(username: string): Promise<VinylRecord[]> {
		const allRecords: VinylRecord[] = [];
		let page = 1;
		let hasMore = true;

		try {
			while (hasMore) {
				console.log(`Fetching Discogs collection page ${page}...`);

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

			console.log(`Loaded ${allRecords.length} records from Discogs`);
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

	// Search for releases
	async searchReleases(query: string, type: 'release' | 'master' = 'release'): Promise<any[]> {
		try {
			const response = await axios.get(`${this.baseURL}/database/search`, {
				headers: this.headers,
				params: {
					q: query,
					type,
					per_page: 25
				}
			});

			return response.data.results;
		} catch (error) {
			console.error('Error searching Discogs:', error);
			throw error;
		}
	}

	// Get release details
	async getRelease(releaseId: string): Promise<any> {
		try {
			const response = await axios.get(`${this.baseURL}/releases/${releaseId}`, {
				headers: this.headers
			});

			return response.data;
		} catch (error) {
			console.error('Error fetching release details:', error);
			throw error;
		}
	}

	// Test connection
	async testConnection(): Promise<boolean> {
		try {
			const response = await axios.get(`${this.baseURL}/oauth/identity`, {
				headers: this.headers
			});

			console.log('Discogs connection successful:', response.data);
			return true;
		} catch (error) {
			console.error('Discogs connection failed:', error);
			return false;
		}
	}
}

export const discogsService = new DiscogsService();
export type { VinylRecord, DiscogsRelease, DiscogsCollection };
