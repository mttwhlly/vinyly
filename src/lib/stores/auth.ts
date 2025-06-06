import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { SPOTIFY_CONFIG, generateCodeVerifier, generateCodeChallenge } from '$lib/config/spotify';

interface AuthState {
	isAuthenticated: boolean;
	accessToken: string | null;
	refreshToken: string | null;
	expiresAt: number | null;
	user: SpotifyUser | null;
}

interface SpotifyUser {
	id: string;
	display_name: string;
	email: string;
	images: Array<{ url: string }>;
}

const initialState: AuthState = {
	isAuthenticated: false,
	accessToken: null,
	refreshToken: null,
	expiresAt: null,
	user: null
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,

		// Initiate Spotify login
		async login() {
			if (!browser) return;

			const codeVerifier = generateCodeVerifier();
			const codeChallenge = await generateCodeChallenge(codeVerifier);

			// Store code verifier for later use
			localStorage.setItem('spotify_code_verifier', codeVerifier);

			const params = new URLSearchParams({
				client_id: SPOTIFY_CONFIG.clientId,
				response_type: 'code',
				redirect_uri: SPOTIFY_CONFIG.redirectUri,
				code_challenge_method: 'S256',
				code_challenge: codeChallenge,
				scope: SPOTIFY_CONFIG.scopes,
				state: generateCodeVerifier() // Additional security
			});

			window.location.href = `${SPOTIFY_CONFIG.authUrl}?${params.toString()}`;
		},

		// Handle callback with authorization code
		async handleCallback(code: string, state: string) {
			if (!browser) return false;

			const codeVerifier = localStorage.getItem('spotify_code_verifier');
			if (!codeVerifier) {
				throw new Error('Code verifier not found');
			}

			try {
				const response = await fetch(SPOTIFY_CONFIG.tokenUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					body: new URLSearchParams({
						client_id: SPOTIFY_CONFIG.clientId,
						grant_type: 'authorization_code',
						code,
						redirect_uri: SPOTIFY_CONFIG.redirectUri,
						code_verifier: codeVerifier
					})
				});

				if (!response.ok) {
					throw new Error('Failed to exchange code for token');
				}

				const tokens = await response.json();
				const expiresAt = Date.now() + tokens.expires_in * 1000;

				// Store tokens
				localStorage.setItem('spotify_access_token', tokens.access_token);
				localStorage.setItem('spotify_refresh_token', tokens.refresh_token);
				localStorage.setItem('spotify_expires_at', expiresAt.toString());
				localStorage.removeItem('spotify_code_verifier');

				// Get user profile
				const userResponse = await fetch(`${SPOTIFY_CONFIG.apiBaseUrl}/me`, {
					headers: {
						Authorization: `Bearer ${tokens.access_token}`
					}
				});

				const user = await userResponse.json();

				update((state) => ({
					...state,
					isAuthenticated: true,
					accessToken: tokens.access_token,
					refreshToken: tokens.refresh_token,
					expiresAt,
					user
				}));

				return true;
			} catch (error) {
				console.error('Auth error:', error);
				return false;
			}
		},

		// Refresh access token
		async refreshAccessToken() {
			if (!browser) return false;

			const refreshToken = localStorage.getItem('spotify_refresh_token');
			if (!refreshToken) return false;

			try {
				const response = await fetch(SPOTIFY_CONFIG.tokenUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					body: new URLSearchParams({
						client_id: SPOTIFY_CONFIG.clientId,
						grant_type: 'refresh_token',
						refresh_token: refreshToken
					})
				});

				if (!response.ok) {
					throw new Error('Failed to refresh token');
				}

				const tokens = await response.json();
				const expiresAt = Date.now() + tokens.expires_in * 1000;

				localStorage.setItem('spotify_access_token', tokens.access_token);
				localStorage.setItem('spotify_expires_at', expiresAt.toString());

				update((state) => ({
					...state,
					accessToken: tokens.access_token,
					expiresAt
				}));

				return true;
			} catch (error) {
				console.error('Token refresh error:', error);
				this.logout();
				return false;
			}
		},

		// Check if token is expired and refresh if needed
		async ensureValidToken(): Promise<string | null> {
			const expiresAt = localStorage.getItem('spotify_expires_at');
			const accessToken = localStorage.getItem('spotify_access_token');

			if (!accessToken || !expiresAt) {
				return null;
			}

			// If token expires in less than 5 minutes, refresh it
			if (Date.now() > parseInt(expiresAt) - 300000) {
				const refreshed = await this.refreshAccessToken();
				if (!refreshed) return null;
				return localStorage.getItem('spotify_access_token');
			}

			return accessToken;
		},

		// Load stored authentication state
		loadStoredAuth() {
			if (!browser) return;

			const accessToken = localStorage.getItem('spotify_access_token');
			const refreshToken = localStorage.getItem('spotify_refresh_token');
			const expiresAt = localStorage.getItem('spotify_expires_at');

			if (accessToken && refreshToken && expiresAt) {
				// Check if token is still valid
				if (Date.now() < parseInt(expiresAt)) {
					update((state) => ({
						...state,
						isAuthenticated: true,
						accessToken,
						refreshToken,
						expiresAt: parseInt(expiresAt)
					}));

					// Load user profile
					this.loadUserProfile();
				} else {
					// Token expired, try to refresh
					this.refreshAccessToken();
				}
			}
		},

		// Load user profile
		async loadUserProfile() {
			const token = await this.ensureValidToken();
			if (!token) return;

			try {
				const response = await fetch(`${SPOTIFY_CONFIG.apiBaseUrl}/me`, {
					headers: {
						Authorization: `Bearer ${token}`
					}
				});

				if (response.ok) {
					const user = await response.json();
					update((state) => ({ ...state, user }));
				}
			} catch (error) {
				console.error('Failed to load user profile:', error);
			}
		},

		// Logout
		logout() {
			if (!browser) return;

			localStorage.removeItem('spotify_access_token');
			localStorage.removeItem('spotify_refresh_token');
			localStorage.removeItem('spotify_expires_at');
			localStorage.removeItem('spotify_code_verifier');

			set(initialState);
		}
	};
}

export const authStore = createAuthStore();
