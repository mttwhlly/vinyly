import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SPOTIFY_CONFIG } from '$lib/config/spotify';

// Mock user storage (in real app, use database)
const mockUsers = new Map();
const activeSessions = new Map();

export const POST: RequestHandler = async ({ request }) => {
	try {
		const authHeader = request.headers.get('authorization');
		const sessionToken = authHeader?.replace('Bearer ', '');

		if (!sessionToken) {
			throw error(401, 'Session token required');
		}

		const session = activeSessions.get(sessionToken);
		if (!session) {
			throw error(401, 'Invalid session');
		}

		const body = await request.json();
		const { code, codeVerifier, state } = body;

		if (!code || !codeVerifier) {
			throw error(400, 'Authorization code and code verifier required');
		}

		// Exchange code for tokens
		const tokenResponse = await fetch(SPOTIFY_CONFIG.tokenUrl, {
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

		if (!tokenResponse.ok) {
			throw error(400, 'Failed to exchange code for token');
		}

		const tokens = await tokenResponse.json();

		// Get user profile
		const profileResponse = await fetch('https://api.spotify.com/v1/me', {
			headers: {
				Authorization: `Bearer ${tokens.access_token}`
			}
		});

		if (!profileResponse.ok) {
			throw error(400, 'Failed to get user profile');
		}

		const profile = await profileResponse.json();

		// Update user's Spotify connection
		const user = mockUsers.get(session.userId) || {
			id: session.userId,
			email: 'demo@example.com',
			displayName: 'Demo User',
			connections: []
		};

		// Update or add Spotify connection
		const spotifyIndex = user.connections.findIndex((c: any) => c.service === 'spotify');
		const spotifyConnection = {
			service: 'spotify',
			connected: true,
			username: profile.id,
			displayName: profile.display_name,
			connectedAt: new Date().toISOString(),
			lastUsedAt: new Date().toISOString(),
			scopes: tokens.scope?.split(' ') || [],
			// Store tokens securely (encrypted in real app)
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
		};

		if (spotifyIndex >= 0) {
			user.connections[spotifyIndex] = spotifyConnection;
		} else {
			user.connections.push(spotifyConnection);
		}

		mockUsers.set(session.userId, user);

		// Return updated connections (without sensitive tokens)
		const publicConnections = user.connections.map((conn: any) => ({
			service: conn.service,
			connected: conn.connected,
			username: conn.username,
			displayName: conn.displayName,
			connectedAt: conn.connectedAt,
			lastUsedAt: conn.lastUsedAt,
			scopes: conn.scopes
		}));

		return json({
			success: true,
			connections: publicConnections,
			message: 'Spotify connected successfully'
		});
	} catch (err) {
		console.error('Spotify OAuth callback error:', err);
		throw error(500, `Spotify connection failed: ${err.message}`);
	}
};

// Get current Spotify access token (for API calls)
export const GET: RequestHandler = async ({ request }) => {
	try {
		const authHeader = request.headers.get('authorization');
		const sessionToken = authHeader?.replace('Bearer ', '');

		if (!sessionToken) {
			throw error(401, 'Session token required');
		}

		const session = activeSessions.get(sessionToken);
		if (!session) {
			throw error(401, 'Invalid session');
		}

		const user = mockUsers.get(session.userId);
		if (!user) {
			throw error(404, 'User not found');
		}

		const spotifyConnection = user.connections.find((c: any) => c.service === 'spotify');
		if (!spotifyConnection?.connected) {
			throw error(404, 'Spotify not connected');
		}

		// Check if token needs refresh
		const expiresAt = new Date(spotifyConnection.expiresAt);
		const now = new Date();

		if (now >= expiresAt) {
			// Refresh token logic would go here
			// For now, return error
			throw error(401, 'Spotify token expired');
		}

		return json({
			accessToken: spotifyConnection.accessToken,
			expiresAt: spotifyConnection.expiresAt
		});
	} catch (err) {
		throw error(500, `Failed to get Spotify token: ${err.message}`);
	}
};
