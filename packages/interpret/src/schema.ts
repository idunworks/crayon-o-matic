/**
 * The ConceptScene schema (spec §4.1). Phase 2 hands this to the Claude API as the
 * structured-output format; every scene, offline or from the API, is validated
 * against it again before drawing.
 */
import { EXPRESSIONS, POSES, PRIMITIVES, RELATIONS, THING_KINDS, type ConceptScene } from '@crayon-o-matic/core';
import { z } from 'zod';

const MAX_THINGS = 5;
const MAX_PARTS = 20;
const MAX_TEXT = 140;

export const PartSchema = z.object({
	name: z.string().min(1).max(40),
	primitive: z.enum(PRIMITIVES),
	count: z.number().int().min(1).max(12).optional(),
	priority: z.number().min(0).max(1).optional()
});

export const ThingSchema = z.object({
	id: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
	label: z.string().min(1).max(40),
	kind: z.enum(THING_KINDS),
	importance: z.number().min(0).max(1),
	expression: z.enum(EXPRESSIONS),
	parts: z.array(PartSchema).min(1).max(MAX_PARTS),
	knownInside: z.array(z.string().max(40)).max(5).optional(),
	colourIdea: z.string().max(20).optional(),
	pose: z.enum(POSES).optional(),
	form: z.string().max(40).optional(),
	relation: z.object({ to: z.string().max(40), how: z.enum(RELATIONS) }).optional()
});

export const ConceptSceneSchema = z.object({
	title: z.string().min(1).max(MAX_TEXT),
	kidSays: z.string().min(1).max(MAX_TEXT),
	things: z.array(ThingSchema).min(1).max(MAX_THINGS),
	extras: z.array(z.string().max(20)).max(6)
});

/** Parts that would put writing into the picture. The drawing never contains text. */
const TEXTY = /\b(word|letter|sign|label|text|number|writing|caption|name|title|speech)s?\b/i;

/** Drop any part named like text (spec §4.1 guard). */
export function withoutText(scene: ConceptScene): ConceptScene {
	return {
		...scene,
		things: scene.things.map((t) => ({ ...t, parts: t.parts.filter((p) => !TEXTY.test(p.name)) })).filter((t) => t.parts.length > 0)
	};
}

/** Validate untrusted scene data (API output, saved presets) and strip text parts. */
export function parseScene(data: unknown): ConceptScene {
	const scene = ConceptSceneSchema.parse(data) as ConceptScene;
	const clean = withoutText(scene);
	if (clean.things.length === 0) throw new Error('scene has nothing left to draw after removing text parts');
	return clean;
}
