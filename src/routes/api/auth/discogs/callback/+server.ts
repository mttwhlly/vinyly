import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DISCOGS_OAUTH_CONFIG } from '$lib/config/discogs-oauth';

// Mock storage (use database in real app)
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
		const { code, requestToken, requestTokenSecret } = body;

		if (!code || !requestToken || !requestTokenSecret) {
			throw error(400, 'OAuth verifier, request token, and secret required');
		}

		// Step 2: Exchange request token for access token
		const oauth_nonce = generateNonce();
		const oauth_timestamp = Math.floor(Date.now() / 1000).toString();

		const oauthParams = {
			oauth_consumer_key: DISCOGS_OAUTH_CONFIG.clientId,
			oauth_token: requestToken,
			oauth_verifier: code,
			oauth_nonce,
			oauth_signature_method: 'PLAINTEXT',
			oauth_timestamp,
			oauth_version: '1.0'
		};

		// Generate signature with request token secret
		const signature = `${encodeURIComponent(process.env.DISCOGS_CLIENT_SECRET || '')}&${encodeURIComponent(requestTokenSecret)}`;

		const authHeaderValue =
			'OAuth ' +
			Object.entries({
				...oauthParams,
				oauth_signature: signature
			})
				.map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
				.join(', ');

		const accessTokenResponse = await fetch(DISCOGS_OAUTH_CONFIG.tokenUrl, {
			method: 'POST',
			headers: {
				Authorization: authHeaderValue,
				'User-Agent': DISCOGS_OAUTH_CONFIG.userAgent
			}
		});

		if (!accessTokenResponse.ok) {
			const errorText = await accessTokenResponse.text();
			console.error('Discogs access token error:', errorText);
			throw error(400, 'Failed to get Discogs access token');
		}

		const responseText = await accessTokenResponse.text();
		const params = new URLSearchParams(responseText);

		const accessToken = params.get('oauth_token');
		const accessTokenSecret = params.get('oauth_token_secret');

		if (!accessToken || !accessTokenSecret) {
			throw error(400, 'Invalid access token response from Discogs');
		}

		// Get user identity
		const identityResponse = await fetch('https://api.discogs.com/oauth/identity', {
			headers: {
				Authorization: `OAuth oauth_consumer_key="${DISCOGS_OAUTH_CONFIG.clientId}", oauth_token="${accessToken}", oauth_signature_method="PLAINTEXT", oauth_timestamp="${Math.floor(Date.now() / 1000)}", oauth_nonce="${generateNonce()}", oauth_version="1.0", oauth_signature="${encodeURIComponent(process.env.DISCOGS_CLIENT_SECRET || '')}&${encodeURIComponent(accessTokenSecret)}"`,
				'User-Agent': DISCOGS_OAUTH_CONFIG.userAgent
			}
		});

		if (!identityResponse.ok) {
			throw error(400, 'Failed to get Discogs user identity');
		}

		const identity = await identityResponse.json();

		// Update user's Discogs connection
		const user = mockUsers.get(session.userId) || {
			id: session.userId,
			email: 'demo@example.com',
			displayName: 'Demo User',
			connections: []
		};

		const discogsIndex = user.connections.findIndex((c: any) => c.service === 'discogs');
		const discogsConnection = {
			service: 'discogs',
			connected: true,
			username: identity.username,
			displayName: identity.username,
			connectedAt: new Date().toISOString(),
			lastUsedAt: new Date().toISOString(),
			scopes: ['read_collection', 'read_profile'],
			// Store tokens securely (encrypted in real app)
			accessToken,
			accessTokenSecret,
			userId: identity.id
		};

		if (discogsIndex >= 0) {
			user.connections[discogsIndex] = discogsConnection;
		} else {
			user.connections.push(discogsConnection);
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
			message: 'Discogs connected successfully'
		});
	} catch (err) {
		console.error('Discogs OAuth callback error:', err);
		throw error(500, `Discogs connection failed: ${err.message}`);
	}
};

// Get current Discogs access token (for API calls)
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

		const discogsConnection = user.connections.find((c: any) => c.service === 'discogs');
		if (!discogsConnection?.connected) {
			throw error(404, 'Discogs not connected');
		}

		return json({
			accessToken: discogsConnection.accessToken,
			accessTokenSecret: discogsConnection.accessTokenSecret,
			username: discogsConnection.username
		});
	} catch (err) {
		throw error(500, `Failed to get Discogs token: ${err.message}`);
	}
};

function generateNonce(): string {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
