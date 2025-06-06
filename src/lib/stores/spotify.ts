import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

interface SpotifyTrack {
	id: string;
	name: string;
	artists: Array<{ name: string; id: string }>;
	album: {
		id: string;
		name: string;
		images: Array<{ url: string; width: number; height: number }>;
	};
	duration_ms: number;
}

interface SpotifyState {
	isConnected: boolean;
	isPlaying: boolean;
	currentTrack: SpotifyTrack | null;
	position: number;
	duration: number;
	volume: number;
	deviceId: string | null;
}

const initialState: SpotifyState = {
	isConnected: false,
	isPlaying: false,
	currentTrack: null,
	position: 0,
	duration: 0,
	volume: 0.5,
	deviceId: null
};

function createSpotifyStore() {
	const { subscribe, set, update }: Writable<SpotifyState> = writable(initialState);

	let player: any = null;
	let positionInterval: NodeJS.Timeout | null = null;
	let accessToken = '';

	// Helper function to initialize the player
	const initializePlayer = (resolve: (value: any) => void, reject: (reason?: any) => void) => {
		player = new window.Spotify.Player({
			name: 'Vinyl Collection Player',
			getOAuthToken: (cb: (token: string) => void) => {
				cb(accessToken);
			},
			volume: 0.5
		});

		// Error handling
		player.addListener('initialization_error', ({ message }: any) => {
			console.error('Failed to initialize:', message);
			reject(new Error(message));
		});

		player.addListener('authentication_error', ({ message }: any) => {
			console.error('Failed to authenticate:', message);
			reject(new Error(message));
		});

		player.addListener('account_error', ({ message }: any) => {
			console.error('Failed to validate Spotify account:', message);
			reject(new Error(message));
		});

		// Ready
		player.addListener('ready', ({ device_id }: any) => {
			console.log('Ready with Device ID', device_id);
			update((state) => ({ ...state, isConnected: true, deviceId: device_id }));
			resolve(device_id);
		});

		// Not Ready
		player.addListener('not_ready', ({ device_id }: any) => {
			console.log('Device ID has gone offline', device_id);
			update((state) => ({ ...state, isConnected: false }));
		});

		// Player state changed
		player.addListener('player_state_changed', (state: any) => {
			if (!state) return;

			update((currentState) => ({
				...currentState,
				currentTrack: state.track_window.current_track,
				isPlaying: !state.paused,
				position: state.position,
				duration: state.duration
			}));

			// Start position tracking if playing
			if (!state.paused && !positionInterval) {
				positionInterval = setInterval(() => {
					update((currentState) => ({
						...currentState,
						position: currentState.position + 1000
					}));
				}, 1000);
			} else if (state.paused && positionInterval) {
				clearInterval(positionInterval);
				positionInterval = null;
			}
		});

		// Connect to the player
		player.connect();
	};

	return {
		subscribe,

		async init(token: string) {
			accessToken = token;

			return new Promise((resolve, reject) => {
				// Define the callback
				window.onSpotifyWebPlaybackSDKReady = () => {
					initializePlayer(resolve, reject);
				};

				// Check if SDK is already loaded
				if (window.Spotify?.Player) {
					initializePlayer(resolve, reject);
				}
				// Otherwise, onSpotifyWebPlaybackSDKReady will be called when ready
			});
		},

		async playAlbum(albumId: string) {
			if (!player) return;

			try {
				const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
					headers: { Authorization: `Bearer ${accessToken}` }
				});

				if (response.ok) {
					const data = await response.json();
					const trackUris = data.items.map((track: any) => track.uri);

					await fetch(`https://api.spotify.com/v1/me/player/play`, {
						method: 'PUT',
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							uris: trackUris,
							device_id: player._options.id
						})
					});
				}
			} catch (error) {
				console.error('Error playing album:', error);
			}
		},

		async play() {
			if (player) {
				await player.resume();
			}
		},

		async pause() {
			if (player) {
				await player.pause();
			}
		},

		async resume() {
			if (player) {
				await player.resume();
			}
		},

		async nextTrack() {
			if (player) {
				await player.nextTrack();
			}
		},

		async previousTrack() {
			if (player) {
				await player.previousTrack();
			}
		},

		async seek(position: number) {
			if (player) {
				await player.seek(position);
				update((state) => ({ ...state, position }));
			}
		},

		async setVolume(volume: number) {
			if (player) {
				await player.setVolume(volume);
				update((state) => ({ ...state, volume }));
			}
		},

		disconnect() {
			if (player) {
				player.disconnect();
				if (positionInterval) {
					clearInterval(positionInterval);
					positionInterval = null;
				}
			}
			set(initialState);
		}
	};
}

export const spotifyStore = createSpotifyStore();

// Type declarations for Spotify SDK
declare global {
	interface Window {
		onSpotifyWebPlaybackSDKReady: () => void;
		Spotify: {
			Player: new (options: any) => any;
		};
	}
}
