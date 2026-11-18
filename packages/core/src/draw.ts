/**
 * The whole pure pipeline after the interpreter: scene + dials → SVG (spec §0).
 * Same scene, same dials, same seed → the same SVG, byte for byte.
 */
import { AGE_MAX, AGE_MIN } from './anchors.js';
import { capabilities } from './capabilities.js';
import { normalisePalette } from './colour.js';
import { hand } from './hand.js';
import { crayonSvg } from './medium/crayon.js';
import { DEFAULT_PAGE, plan } from './plan.js';
import type { Capabilities, ConceptScene, Dials, Stroke, StrokePlan } from './types.js';
import { DEFAULT_DIALS } from './types.js';

export interface Drawing {
	svg: string;
	plan: StrokePlan;
	strokes: Stroke[];
	caps: Capabilities;
	dials: Dials;
}

/** Longest shadow allowed, in mm (tuned: beyond this it stops reading as a shadow). */
const MAX_SHADOW_LENGTH = 30;

const angle = (n: number, fallback: number): number => (((Number.isFinite(n) ? n : fallback) % 360) + 360) % 360;
const length = (n: number, fallback: number): number => Math.max(0, Math.min(MAX_SHADOW_LENGTH, Number.isFinite(n) ? n : fallback));

const clamp01 = (n: number): number => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/** Fill in defaults and clamp every dial to its range. */
export function resolveDials(partial: Partial<Dials> = {}): Dials {
	const d = { ...DEFAULT_DIALS, ...partial };
	return {
		...d,
		age: Math.max(AGE_MIN, Math.min(AGE_MAX, Number.isFinite(d.age) ? d.age : DEFAULT_DIALS.age)),
		shakiness: clamp01(d.shakiness),
		attention: clamp01(d.attention),
		chaos: clamp01(d.chaos),
		adorable: clamp01(d.adorable),
		seed: Math.trunc(Number.isFinite(d.seed) ? d.seed : DEFAULT_DIALS.seed) >>> 0,
		palette: normalisePalette(d.palette),
		shadowAngle: angle(d.shadowAngle, DEFAULT_DIALS.shadowAngle),
		shadowLength: length(d.shadowLength, DEFAULT_DIALS.shadowLength),
		shadowCut: clamp01(d.shadowCut),
		highlightAngle: angle(d.highlightAngle, DEFAULT_DIALS.highlightAngle),
		highlightLength: length(d.highlightLength, DEFAULT_DIALS.highlightLength),
		highlightCut: clamp01(d.highlightCut)
	};
}

export function draw(scene: ConceptScene, partial: Partial<Dials> = {}, page: { w: number; h: number } = DEFAULT_PAGE): Drawing {
	const dials = resolveDials(partial);
	const caps = capabilities(dials);
	const strokePlan = plan(scene, caps, dials, page);
	const strokes = [...strokePlan.strokes].sort((a, b) => a.order - b.order).map((s) => hand(s, caps, dials));
	return { svg: crayonSvg(strokePlan, strokes, dials), plan: strokePlan, strokes, caps, dials };
}
