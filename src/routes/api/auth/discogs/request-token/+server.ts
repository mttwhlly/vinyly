import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DISCOGS_OAUTH_CONFIG } from '$lib/config/discogs-oauth';

// OAuth 1.0a requires server-side signature generation
export const POST: RequestHandler = async ({ request }) => {
	try {
		const authHeader = request.headers.get('authorization');
		const sessionToken = authHeader?.replace('Bearer ', '');

		if (!sessionToken) {
			throw error(401, 'Session token required');
		}

		// Step 1: Get request token from Discogs
		const oauth_nonce = generateNonce();
		const oauth_timestamp = Math.floor(Date.now() / 1000).toString();

		const oauthParams = {
			oauth_consumer_key: DISCOGS_OAUTH_CONFIG.clientId,
			oauth_nonce,
			oauth_signature_method: 'PLAINTEXT',
			oauth_timestamp,
			oauth_callback: DISCOGS_OAUTH_CONFIG.redirectUri,
			oauth_version: '1.0'
		};

		// Generate signature (PLAINTEXT method)
		const signature = `${encodeURIComponent(process.env.DISCOGS_CLIENT_SECRET || '')}&`;

		const authHeaderValue =
			'OAuth ' +
			Object.entries({
				...oauthParams,
				oauth_signature: signature
			})
				.map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
				.join(', ');

		const requestTokenResponse = await fetch(DISCOGS_OAUTH_CONFIG.requestTokenUrl, {
			method: 'GET',
			headers: {
				Authorization: authHeaderValue,
				'User-Agent': DISCOGS_OAUTH_CONFIG.userAgent
			}
		});

		if (!requestTokenResponse.ok) {
			const errorText = await requestTokenResponse.text();
			console.error('Discogs request token error:', errorText);
			throw error(400, 'Failed to get Discogs request token');
		}

		const responseText = await requestTokenResponse.text();
		const params = new URLSearchParams(responseText);

		const requestToken = params.get('oauth_token');
		const requestTokenSecret = params.get('oauth_token_secret');

		if (!requestToken || !requestTokenSecret) {
			throw error(400, 'Invalid response from Discogs');
		}

		// Store request token temporarily (in real app, use database/cache)
		// For demo, we'll return it to client to store

		const authUrl = `${DISCOGS_OAUTH_CONFIG.authUrl}?oauth_token=${requestToken}`;

		return json({
			requestToken,
			requestTokenSecret,
			authUrl,
			expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
		});
	} catch (err) {
		console.error('Discogs request token error:', err);
		throw error(500, `Failed to initiate Discogs OAuth: ${err.message}`);
	}
};

function generateNonce(): string {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
