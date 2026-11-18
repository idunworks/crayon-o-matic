/**
 * The optional model behind /api/interpret, from the environment. Off by default: then the
 * studio reads motifs in the browser with the built-in templates and this server does nothing.
 *
 *   CRAYON_INTERPRETER       offline (default) | claude | local
 *   ANTHROPIC_API_KEY        for claude; CRAYON_CLAUDE_MODEL to pick the model
 *   CRAYON_LOCAL_URL / CRAYON_LOCAL_MODEL / CRAYON_LOCAL_KEY   for local
 *   CRAYON_TRIES_PER_HOUR    per visitor (default 20), so an open key isn't an open wallet
 */
// Server-only file (lib/server): read straight from the process environment.
const env = process.env;
import { claudeInterpreter, localInterpreter, type Interpreter } from '@crayon-o-matic/interpret/server';

const DEFAULT_TRIES_PER_HOUR = 20;
const HOUR_MS = 3_600_000;

function build(): Interpreter | null {
	const kind = env.CRAYON_INTERPRETER ?? 'offline';
	if (kind === 'claude') return claudeInterpreter(env.CRAYON_CLAUDE_MODEL ? { model: env.CRAYON_CLAUDE_MODEL } : {});
	if (kind === 'local' && env.CRAYON_LOCAL_MODEL) {
		return localInterpreter({ model: env.CRAYON_LOCAL_MODEL, ...(env.CRAYON_LOCAL_URL ? { baseUrl: env.CRAYON_LOCAL_URL } : {}), ...(env.CRAYON_LOCAL_KEY ? { apiKey: env.CRAYON_LOCAL_KEY } : {}) });
	}
	if (kind !== 'offline') console.warn(`crayon-o-matic: CRAYON_INTERPRETER=${kind} is not set up; reading motifs offline`);
	return null;
}

let reader: Interpreter | null | undefined;
/** The configured model, or null when motifs are read offline. */
export function getReader(): Interpreter | null {
	if (reader === undefined) reader = build();
	return reader;
}

const tries = new Map<string, number[]>();

/** A simple sliding-hour limit per visitor, in memory (resets on restart). */
export function allowTry(visitor: string, now = Date.now()): boolean {
	const limit = Number(env.CRAYON_TRIES_PER_HOUR ?? DEFAULT_TRIES_PER_HOUR);
	const recent = (tries.get(visitor) ?? []).filter((t) => now - t < HOUR_MS);
	if (recent.length >= limit) {
		tries.set(visitor, recent);
		return false;
	}
	tries.set(visitor, [...recent, now]);
	return true;
}
