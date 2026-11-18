/**
 * The one prompt and output schema every model interpreter shares (spec §4.1).
 * Kept deliberately small (owner, 2026-11-18: "lower is better, or it will never work with
 * local models"): a short system prompt, one worked example, and a JSON schema with only
 * types, enums and required fields. Bounds and the no-text rule are enforced afterwards by
 * the Zod schema, whatever model answered.
 */
import { EXPRESSIONS, POSES, PRIMITIVES, RELATIONS, THING_KINDS } from '@crayon-o-matic/core';
import { TEMPLATES } from './templates.js';

/** Longest motif sent to any model. Longer input is cut, never rejected. */
export const MAX_MOTIF = 200;

const EXAMPLE = {
	title: 'furious grandma and the cat',
	kidSays: 'this is grandma she is angry because the cat did a wee',
	things: [
		{ id: 'grandma', label: 'grandma', kind: 'person', importance: 1, expression: 'furious', parts: [{ name: 'head', primitive: 'loop' }, { name: 'eyes', primitive: 'dots', count: 2 }, { name: 'legs', primitive: 'line', count: 2 }, { name: 'mouth', primitive: 'U' }, { name: 'arms', primitive: 'line', count: 2 }, { name: 'glasses', primitive: 'loop', count: 2 }, { name: 'hair', primitive: 'scribble-cluster' }] },
		{ id: 'cat', label: 'cat', kind: 'animal4', importance: 0.5, expression: 'happy', pose: 'sitting', relation: { to: 'grandma', how: 'next-to' }, parts: [{ name: 'head', primitive: 'loop' }, { name: 'eyes', primitive: 'dots', count: 2 }, { name: 'ears', primitive: 'triangle', count: 2 }, { name: 'body', primitive: 'loop' }, { name: 'legs', primitive: 'line', count: 4 }, { name: 'tail', primitive: 'arc' }] }
	],
	extras: ['sun', 'heart']
};

export const SYSTEM_PROMPT = [
	'You are a 4-year-old about to draw the motif you are given.',
	'Reply with JSON only: what is in your picture, as a child understands it.',
	'Rules:',
	'- 1 to 3 things, the main one first with importance 1; the others 0.3 to 0.6.',
	'- Each thing lists its parts in the order a child draws them, most important first. A person starts with head, eyes, legs, mouth, arms.',
	'- Use only the given kinds, primitives, expressions and poses. Pick the nearest kind for anything unusual (a llama is animal4, a robot is a person).',
	'- Expressions: angry is furious, grumpy or smug is smirk, cross is frowned, bored is meh.',
	'- People always have legs. Water, waves and sand are kind blob, not animals.',
	"- Never include letters, words, numbers, signs or labels to be drawn.",
	'- kidSays is one short line in a 4-year-old\'s voice, about the picture.',
	'- extras are things a child adds on their own, like sun, heart, cloud, flower.',
	'- ids are lowercase words with dashes.',
	`- When one fits, use one of these labels; they are drawn best: ${[...new Set(TEMPLATES.map((t) => t.label))].join(', ')}.`,
	`Example for "a furious grandma with a cat": ${JSON.stringify(EXAMPLE)}`
].join('\n');

/** The user turn: the motif, cut to length, plus an expression override if any. */
export function userMessage(motif: string, expression?: string): string {
	const clean = cleanMotif(motif);
	return expression ? `Motif: ${clean}\nThe main thing's expression must be: ${expression}` : `Motif: ${clean}`;
}

/** Trim, drop control characters and cut to MAX_MOTIF. */
export function cleanMotif(motif: string): string {
	return motif.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, MAX_MOTIF);
}

const str = { type: 'string' } as const;
const num = { type: 'number' } as const;
const enumOf = (values: readonly string[]) => ({ type: 'string', enum: [...values] }) as const;
const object = (properties: Record<string, unknown>, required: string[]) => ({ type: 'object', properties, required, additionalProperties: false });

const PART = object({ name: str, primitive: enumOf(PRIMITIVES), count: { type: 'integer' } }, ['name', 'primitive']);

const THING = object(
	{
		id: str,
		label: str,
		kind: enumOf(THING_KINDS),
		importance: num,
		expression: enumOf(EXPRESSIONS),
		parts: { type: 'array', items: PART },
		pose: enumOf(POSES),
		relation: object({ to: str, how: enumOf(RELATIONS) }, ['to', 'how'])
	},
	['id', 'label', 'kind', 'importance', 'expression', 'parts']
);

/** JSON schema for structured output (Claude) and response_format (local servers). */
export const SCENE_JSON_SCHEMA: Record<string, unknown> = object(
	{ title: str, kidSays: str, things: { type: 'array', items: THING }, extras: { type: 'array', items: str } },
	['title', 'kidSays', 'things', 'extras']
);
