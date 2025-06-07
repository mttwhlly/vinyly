import { browser } from '$app/environment';

const getEnvVar = (key: string, fallback?: string): string => {
	if (browser) {
		return import.meta.env[key] || fallback || '';
	}
	return process?.env?.[key] || fallback || '';
};

export const DISCOGS_OAUTH_CONFIG = {
	// OAuth App credentials (get from https://www.discogs.com/settings/developers)
	clientId: getEnvVar('VITE_DISCOGS_CLIENT_ID'),
	clientSecret: getEnvVar('DISCOGS_CLIENT_SECRET'), // Server-only, not VITE_

	// OAuth URLs
	authUrl: 'https://discogs.com/oauth/authorize',
	tokenUrl: 'https://discogs.com/oauth/access_token',
	requestTokenUrl: 'https://discogs.com/oauth/request_token',

	// App URLs
	redirectUri: getEnvVar(
		'VITE_DISCOGS_REDIRECT_URI',
		'http://127.0.0.1:5173/auth/discogs/callback'
	),

	// API config
	apiBaseUrl: 'https://api.discogs.com',
	userAgent: `VinylPlayer/1.0 +${getEnvVar('VITE_APP_URL', 'http://127.0.0.1:5173')}`,

	// OAuth 1.0a specific
	signatureMethod: 'PLAINTEXT', // or 'HMAC-SHA1'

	// Scopes (Discogs doesn't use scopes like OAuth 2.0, but we track capabilities)
	capabilities: [
		'read_collection', // Read user's collection
		'read_profile', // Read user profile
		'read_marketplace' // Read marketplace data (optional)
	]
};

// OAuth 1.0a helpers for Discogs
export class DiscogsOAuthHelper {
	private config = DISCOGS_OAUTH_CONFIG;

	// Generate OAuth 1.0a signature (simplified for PLAINTEXT)
	generateSignature(consumerSecret: string, tokenSecret: string = ''): string {
		return `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
	}

	// Generate OAuth 1.0a authorization header
	generateAuthHeader(params: Record<string, string>): string {
		const authParams = Object.entries(params)
			.map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
			.join(', ');

		return `OAuth ${authParams}`;
	}

	// Step 1: Get request token URL
	getRequestTokenUrl(): string {
		const params = new URLSearchParams({
			oauth_callback: this.config.redirectUri
		});

		return `${this.config.requestTokenUrl}?${params.toString()}`;
	}

	// Step 2: Get authorization URL
	getAuthorizationUrl(requestToken: string): string {
		const params = new URLSearchParams({
			oauth_token: requestToken
		});

		return `${this.config.authUrl}?${params.toString()}`;
	}

	// Step 3: Exchange for access token (server-side only)
	async exchangeForAccessToken(
		requestToken: string,
		requestTokenSecret: string,
		verifier: string
	): Promise<{ token: string; secret: string }> {
		// This would be implemented server-side
		throw new Error('This method should be called from server-side code');
	}
}

export const discogsOAuthHelper = new DiscogsOAuthHelper();
