import { json, error } from '@sveltejs/kit';
import { interpretOffline, interpretWithFallback, MAX_MOTIF } from '@crayon-o-matic/interpret/server';
import { allowTry, getReader } from '#lib/server/reader.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const body = (await request.json().catch(() => null)) as { motif?: unknown } | null;
	const motif = typeof body?.motif === 'string' ? body.motif.trim().slice(0, MAX_MOTIF) : '';
	if (!motif) throw error(400, 'Send a motif.');

	const reader = getReader();
	if (!reader) return json({ scene: interpretOffline(motif), source: 'offline' });
	if (!allowTry(getClientAddress())) {
		return json({ scene: interpretOffline(motif), source: 'offline', note: 'That was a lot of drawings. The built-in words drew this one; try the clever reader again in a while.' });
	}
	const { scene, source, fallbackReason } = await interpretWithFallback(reader, motif);
	if (fallbackReason) console.warn(`crayon-o-matic: ${fallbackReason}`);
	return json({ scene, source, ...(fallbackReason ? { note: 'The clever reader is busy, so the built-in words drew this one.' } : {}) });
};
