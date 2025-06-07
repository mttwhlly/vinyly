import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { SPOTIFY_CONFIG } from '$lib/config/spotify';
import { DISCOGS_OAUTH_CONFIG } from '$lib/config/discogs-oauth';

interface User {
	id: string;
	email: string;
	displayName: string;
}

interface ServiceConnection {
	service: 'spotify' | 'discogs';
	connected: boolean;
	username?: string;
	displayName?: string;
	connectedAt?: string;
	lastUsedAt?: string;
	scopes?: string[];
}

interface AuthState {
	user: User | null;
	sessionToken: string | null;
	isAuthenticated: boolean;
	connections: ServiceConnection[];
	loading: boolean;
	error: string | null;
}

const initialState: AuthState = {
	user: null,
	sessionToken: null,
	isAuthenticated: false,
	connections: [],
	loading: false,
	error: null
};

function createMultiUserAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,

		// Initialize auth state from session
		async init() {
			if (!browser) return;

			update((state) => ({ ...state, loading: true }));

			try {
				const sessionToken = localStorage.getItem('session_token');
				if (!sessionToken) {
					update((state) => ({ ...state, loading: false }));
					return;
				}

				// Verify session with server
				const response = await fetch('/api/auth/session', {
					headers: {
						Authorization: `Bearer ${sessionToken}`
					}
				});

				if (response.ok) {
					const data = await response.json();
					update((state) => ({
						...state,
						user: data.user,
						sessionToken,
						isAuthenticated: true,
						connections: data.connections || [],
						loading: false
					}));
				} else {
					// Invalid session
					localStorage.removeItem('session_token');
					update((state) => ({ ...state, loading: false }));
				}
			} catch (error) {
				console.error('Auth initialization failed:', error);
				update((state) => ({ ...state, loading: false, error: error.message }));
			}
		},

		// Login with email (simplified - could be expanded to OAuth providers)
		async loginWithEmail(email: string) {
			update((state) => ({ ...state, loading: true, error: null }));

			try {
				const response = await fetch('/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email })
				});

				if (!response.ok) {
					throw new Error('Login failed');
				}

				const data = await response.json();

				localStorage.setItem('session_token', data.sessionToken);

				update((state) => ({
					...state,
					user: data.user,
					sessionToken: data.sessionToken,
					isAuthenticated: true,
					connections: data.connections || [],
					loading: false
				}));

				return true;
			} catch (error) {
				update((state) => ({ ...state, loading: false, error: error.message }));
				return false;
			}
		},

		// Connect Spotify account
		async connectSpotify() {
			if (!browser) return;

			// Generate PKCE for security
			const codeVerifier = generateCodeVerifier();
			const codeChallenge = await generateCodeChallenge(codeVerifier);

			localStorage.setItem('spotify_code_verifier', codeVerifier);

			const params = new URLSearchParams({
				client_id: SPOTIFY_CONFIG.clientId,
				response_type: 'code',
				redirect_uri: SPOTIFY_CONFIG.redirectUri,
				code_challenge_method: 'S256',
				code_challenge: codeChallenge,
				scope: SPOTIFY_CONFIG.scopes,
				state: generateRandomState()
			});

			window.location.href = `${SPOTIFY_CONFIG.authUrl}?${params.toString()}`;
		},

		// Connect Discogs account
		async connectDiscogs() {
			update((state) => ({ ...state, loading: true, error: null }));

			try {
				// Step 1: Get request token from our server
				const response = await fetch('/api/auth/discogs/request-token', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${localStorage.getItem('session_token')}`,
						'Content-Type': 'application/json'
					}
				});

				if (!response.ok) {
					throw new Error('Failed to get Discogs request token');
				}

				const data = await response.json();

				// Store request token for callback
				localStorage.setItem('discogs_request_token', data.requestToken);
				localStorage.setItem('discogs_request_token_secret', data.requestTokenSecret);

				// Redirect to Discogs authorization
				window.location.href = data.authUrl;
			} catch (error) {
				update((state) => ({ ...state, loading: false, error: error.message }));
			}
		},

		// Handle OAuth callbacks
		async handleCallback(service: 'spotify' | 'discogs', code: string, state?: string) {
			update((s) => ({ ...s, loading: true, error: null }));

			try {
				const response = await fetch(`/api/auth/${service}/callback`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${localStorage.getItem('session_token')}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						code,
						state,
						// Include stored PKCE/OAuth data
						codeVerifier: localStorage.getItem('spotify_code_verifier'),
						requestToken: localStorage.getItem('discogs_request_token'),
						requestTokenSecret: localStorage.getItem('discogs_request_token_secret')
					})
				});

				if (!response.ok) {
					throw new Error(`${service} connection failed`);
				}

				const data = await response.json();

				// Clean up stored tokens
				localStorage.removeItem('spotify_code_verifier');
				localStorage.removeItem('discogs_request_token');
				localStorage.removeItem('discogs_request_token_secret');

				// Update connections
				update((state) => ({
					...state,
					connections: data.connections,
					loading: false
				}));

				return true;
			} catch (error) {
				update((s) => ({ ...s, loading: false, error: error.message }));
				return false;
			}
		},

		// Disconnect a service
		async disconnectService(service: 'spotify' | 'discogs') {
			try {
				const response = await fetch(`/api/auth/${service}/disconnect`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${localStorage.getItem('session_token')}`
					}
				});

				if (response.ok) {
					const data = await response.json();
					update((state) => ({
						...state,
						connections: data.connections
					}));
				}
			} catch (error) {
				console.error(`Failed to disconnect ${service}:`, error);
			}
		},

		// Get access token for a service (for API calls)
		async getServiceToken(service: 'spotify' | 'discogs'): Promise<string | null> {
			try {
				const response = await fetch(`/api/auth/${service}/token`, {
					headers: {
						Authorization: `Bearer ${localStorage.getItem('session_token')}`
					}
				});

				if (response.ok) {
					const data = await response.json();
					return data.accessToken;
				}
			} catch (error) {
				console.error(`Failed to get ${service} token:`, error);
			}
			return null;
		},

		// Check if service is connected
		isServiceConnected(service: 'spotify' | 'discogs'): boolean {
			const state = get(this);
			return state.connections.some((conn) => conn.service === service && conn.connected);
		},

		// Logout
		async logout() {
			try {
				await fetch('/api/auth/logout', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${localStorage.getItem('session_token')}`
					}
				});
			} catch (error) {
				console.error('Logout error:', error);
			}

			localStorage.removeItem('session_token');
			set(initialState);
		}
	};
}

// Helper functions
function generateCodeVerifier(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return btoa(String.fromCharCode.apply(null, Array.from(array)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

function generateRandomState(): string {
	return generateCodeVerifier();
}

function get(store: any) {
	let value: any;
	store.subscribe((v: any) => (value = v))();
	return value;
}

export const multiUserAuthStore = createMultiUserAuthStore();
