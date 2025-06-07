import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This would integrate with your database
// For now, we'll use a simple in-memory store
const mockUsers = new Map([
	[
		'user123',
		{
			id: 'user123',
			email: 'demo@example.com',
			displayName: 'Demo User',
			connections: [
				{
					service: 'spotify',
					connected: false,
					username: null,
					displayName: null,
					connectedAt: null,
					lastUsedAt: null,
					scopes: []
				},
				{
					service: 'discogs',
					connected: false,
					username: null,
					displayName: null,
					connectedAt: null,
					lastUsedAt: null,
					scopes: []
				}
			]
		}
	]
]);

const activeSessions = new Map<string, { userId: string; expiresAt: Date }>();

export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization');
	const sessionToken = authHeader?.replace('Bearer ', '');

	if (!sessionToken) {
		throw error(401, 'Session token required');
	}

	const session = activeSessions.get(sessionToken);
	if (!session || session.expiresAt < new Date()) {
		if (session) {
			activeSessions.delete(sessionToken);
		}
		throw error(401, 'Invalid or expired session');
	}

	const user = mockUsers.get(session.userId);
	if (!user) {
		throw error(404, 'User not found');
	}

	return json({
		user: {
			id: user.id,
			email: user.email,
			displayName: user.displayName
		},
		connections: user.connections,
		expiresAt: session.expiresAt.toISOString()
	});
};

// Create or refresh session
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { email, action = 'login' } = body;

		if (action === 'login') {
			if (!email) {
				throw error(400, 'Email is required');
			}

			// For demo purposes, create a user if doesn't exist
			let userId = 'user123'; // In real app, look up by email

			if (!mockUsers.has(userId)) {
				mockUsers.set(userId, {
					id: userId,
					email,
					displayName: email.split('@')[0],
					connections: [
						{
							service: 'spotify',
							connected: false,
							username: null,
							displayName: null,
							connectedAt: null,
							lastUsedAt: null,
							scopes: []
						},
						{
							service: 'discogs',
							connected: false,
							username: null,
							displayName: null,
							connectedAt: null,
							lastUsedAt: null,
							scopes: []
						}
					]
				});
			}

			// Generate session token
			const sessionToken = generateSessionToken();
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

			activeSessions.set(sessionToken, { userId, expiresAt });

			const user = mockUsers.get(userId);

			return json({
				sessionToken,
				user: {
					id: user!.id,
					email: user!.email,
					displayName: user!.displayName
				},
				connections: user!.connections,
				expiresAt: expiresAt.toISOString()
			});
		}

		throw error(400, 'Invalid action');
	} catch (err) {
		console.error('Session API error:', err);
		throw error(500, 'Session creation failed');
	}
};

// Logout
export const DELETE: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization');
	const sessionToken = authHeader?.replace('Bearer ', '');

	if (sessionToken) {
		activeSessions.delete(sessionToken);
	}

	return json({ success: true });
};

// Helper function to generate session tokens
function generateSessionToken(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
