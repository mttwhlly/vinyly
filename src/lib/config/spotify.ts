import { browser } from '$app/environment';

// Get environment variables with fallbacks
const getEnvVar = (key: string, fallback?: string): string => {
	if (browser) {
		return import.meta.env[key] || fallback || '';
	}
	return process?.env?.[key] || fallback || '';
};

export const SPOTIFY_CONFIG = {
	clientId: getEnvVar('VITE_SPOTIFY_CLIENT_ID'), // Your actual client ID
	redirectUri: 'http://127.0.0.1:5173/auth/callback', // Changed from https to http
	scopes: [
		'streaming', // Web Playback SDK
		'user-read-email', // User profile
		'user-read-private', // User profile
		'user-read-playback-state', // Current playback
		'user-modify-playback-state', // Control playback
		'user-read-currently-playing', // Current track
		'playlist-modify-public', // Create playlists
		'playlist-modify-private' // Create private playlists
	].join(' '),

	// API endpoints
	authUrl: 'https://accounts.spotify.com/authorize',
	tokenUrl: 'https://accounts.spotify.com/api/token',
	apiBaseUrl: 'https://api.spotify.com/v1'
};

// PKCE helpers
export function generateCodeVerifier(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return btoa(String.fromCharCode.apply(null, Array.from(array)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}
