import { browser } from '$app/environment';

// Get environment variables with fallbacks
const getEnvVar = (key: string, fallback?: string): string => {
	if (browser) {
		return import.meta.env[key] || fallback || '';
	}
	return process?.env?.[key] || fallback || '';
};

export const DISCOGS_CONFIG = {
	// OAuth URLs (for future OAuth implementation)
	authUrl: 'https://discogs.com/oauth/authorize',
	tokenUrl: 'https://discogs.com/oauth/access_token',
	requestTokenUrl: 'https://discogs.com/oauth/request_token',

	// API endpoints
	apiBaseUrl: 'https://api.discogs.com',
	userAgent: `VinylPlayer/1.0 +${getEnvVar('VITE_APP_URL', 'http://127.0.0.1:5173')}`,

	// Personal access token from environment
	personalAccessToken: getEnvVar('VITE_DISCOGS_PERSONAL_ACCESS_TOKEN', '')
};

// Rate limiting info
export const DISCOGS_RATE_LIMITS = {
	authenticated: 60, // requests per minute
	unauthenticated: 25 // requests per minute
};
