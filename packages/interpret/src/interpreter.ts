/**
 * Interpreters turn motif text into a ConceptScene. Three ship with the project:
 *   offline   keyword templates, no network (always available, and the fallback)
 *   claude    your own Anthropic API key
 *   local     your own model behind an OpenAI-compatible server (Ollama, llama.cpp, vLLM ...)
 * Whatever answers, the scene is tidied, validated and stripped of text parts the same way.
 * Hosted demos add their own limits on top; none of that lives in this package.
 */
import type { ConceptScene, Expression } from '@crayon-o-matic/core';
import { interpretOffline } from './offline.js';
import { parseScene } from './schema.js';

export interface InterpretOptions {
	/** Overrides the main thing's expression. */
	expression?: Expression;
	/** Cancels a model call (a timeout, or the person leaving). */
	signal?: AbortSignal;
}

export interface Interpreter {
	/** Shown to people: "offline", "claude-haiku-5-5", "local:llama3.2" ... */
	readonly name: string;
	interpret(motif: string, opts?: InterpretOptions): Promise<ConceptScene>;
}

export interface Interpreted {
	scene: ConceptScene;
	/** Which interpreter produced the scene. */
	source: string;
	/** Set when the chosen interpreter failed and the offline templates stood in. */
	fallbackReason?: string;
}

export const offlineInterpreter: Interpreter = {
	name: 'offline',
	interpret: async (motif, opts = {}) => interpretOffline(motif, opts.expression ? { expression: opts.expression } : {})
};

const MAX_ID = 40;
const MAX_LABEL = 40;
const MAX_LINE = 140;

const slug = (s: unknown, fallback: string): string =>
	(typeof s === 'string' ? s : '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, MAX_ID) || fallback;

const cut = (s: unknown, max: number): unknown => (typeof s === 'string' ? s.trim().slice(0, max) : s);

const clamp01 = (n: unknown): unknown => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : n);

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Forgive the small mistakes models make (ids with spaces, a long title, importance 1.2)
 * before strict validation. It only reshapes; anything really wrong still fails validation.
 */
export function tidyScene(raw: unknown): unknown {
	if (!isObject(raw) || !Array.isArray(raw.things)) return raw;
	const ids = new Map<string, string>();
	const things = raw.things.filter(isObject).map((t, i) => {
		const id = slug(t.id ?? t.label, `thing-${i + 1}`);
		if (typeof t.id === 'string') ids.set(t.id, id);
		return { ...t, id, label: cut(t.label, MAX_LABEL), importance: clamp01(t.importance) } as Loose;
	});
	return {
		...raw,
		title: cut(raw.title, MAX_LINE),
		kidSays: cut(raw.kidSays, MAX_LINE),
		things: things.map((t) => (isObject(t.relation) && typeof t.relation.to === 'string' ? { ...t, relation: { ...t.relation, to: ids.get(t.relation.to) ?? slug(t.relation.to, 'thing') } } : t)),
		extras: Array.isArray(raw.extras) ? raw.extras : []
	};
}

/** Parse a model's JSON text into a checked scene. Throws with a short reason. */
export function sceneFromModelText(text: string): ConceptScene {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('the model did not return valid JSON');
	}
	return parseScene(tidyScene(data));
}

const reason = (err: unknown): string => (err instanceof Error ? err.message : String(err)).slice(0, 200);

/** Ask `primary`; if it fails for any reason, draw from the offline templates instead. */
export async function interpretWithFallback(primary: Interpreter, motif: string, opts: InterpretOptions = {}): Promise<Interpreted> {
	try {
		return { scene: await primary.interpret(motif, opts), source: primary.name };
	} catch (err) {
		const scene = await offlineInterpreter.interpret(motif, opts);
		return { scene, source: offlineInterpreter.name, fallbackReason: `${primary.name}: ${reason(err)}` };
	}
}
