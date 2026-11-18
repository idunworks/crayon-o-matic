/**
 * Freehand (owner, 2026-11-18): the person draws everything by hand, and only then picks
 * how much to kid-ify it. Nothing is kid-ified by force: at kidify 0 the lines are kept
 * exactly as drawn (only the crayon medium, shadow and highlight are added).
 *
 *   sketch (raw pointer strokes) + dials + kidify → same hand and medium as motifs → SVG
 *
 * kidify scales the child's hand at the chosen age and shakiness: wobble, drift, missed
 * loop closures, overshoots, slant and pressure variation. It doesn't re-plan the picture:
 * proportions and layout stay yours.
 */
import { capabilities } from './capabilities.js';
import { resolveDials, type Drawing } from './draw.js';
import { resample } from './geometry.js';
import { hand, MAX_POINTS, WIDTH } from './hand.js';
import { crayonSvg } from './medium/crayon.js';
import { DEFAULT_PAGE } from './plan.js';
import type { Capabilities, Dials, PlannedStroke, Point, Stroke, StrokePlan } from './types.js';

export interface SketchStroke {
	points: Point[];
}

export interface Sketch {
	page: { w: number; h: number };
	strokes: SketchStroke[];
}

/** Most strokes a sketch may hold (bounded work per redraw). */
export const MAX_SKETCH_STROKES = 400;
/** Ends this close (share of the stroke's size) count as a closed loop (tuned). */
const CLOSE_SHARE = 0.12;
const SKETCH_THING = 'sketch';

const finitePoint = (p: unknown): p is Point =>
	typeof p === 'object' && p !== null && Number.isFinite((p as Point).x) && Number.isFinite((p as Point).y);

const clamp01 = (n: number): number => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/** Drop unusable strokes and points, keep the page sane, bound the work. */
export function cleanSketch(input: Sketch): Sketch {
	const w = Number.isFinite(input?.page?.w) && input.page.w > 0 ? input.page.w : DEFAULT_PAGE.w;
	const h = Number.isFinite(input?.page?.h) && input.page.h > 0 ? input.page.h : DEFAULT_PAGE.h;
	const strokes = (Array.isArray(input?.strokes) ? input.strokes : [])
		.map((s) => (Array.isArray(s?.points) ? s.points.filter(finitePoint).map((p) => ({ x: p.x, y: p.y })) : []))
		.filter((pts) => pts.length >= 2)
		.slice(0, MAX_SKETCH_STROKES)
		.map((pts) => ({ points: pts.length > MAX_POINTS ? capPoints(pts) : pts }));
	return { page: { w, h }, strokes };
}

function pathLength(pts: readonly Point[]): number {
	let len = 0;
	for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
	return len;
}

function capPoints(pts: Point[]): Point[] {
	return resample(pts, pathLength(pts) / (MAX_POINTS - 8)).slice(0, MAX_POINTS);
}

function sizeOf(pts: readonly Point[]): number {
	const xs = pts.map((p) => p.x);
	const ys = pts.map((p) => p.y);
	return Math.max(1, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
}

function planned(pts: Point[], index: number, colour: string): PlannedStroke {
	const size = sizeOf(pts);
	const a = pts[0]!;
	const b = pts[pts.length - 1]!;
	const closed = pts.length > 3 && Math.hypot(a.x - b.x, a.y - b.y) <= size * CLOSE_SHARE;
	return { key: `${SKETCH_THING}/line/${index}`, thing: SKETCH_THING, part: 'line', kind: 'outline', order: index, path: pts, closed, corners: false, size, colour };
}

/** The child's errors, scaled by kidify (the hand scales slant, hook and pressure itself). */
function scaledCaps(caps: Capabilities, k: number): Capabilities {
	return { ...caps, tremorAmp: caps.tremorAmp * k, driftAmp: caps.driftAmp * k, joinError: caps.joinError * k, closureMiss: caps.closureMiss * k, cornerRounding: 0 };
}

const round = (n: number): number => Math.round(n * 100) / 100;

/** Your exact line: the points as drawn, one even width. */
function asDrawn(s: PlannedStroke, width: number): Stroke {
	return { key: s.key, thing: s.thing, part: s.part, kind: s.kind, closed: s.closed, points: s.path.map((p) => ({ x: round(p.x), y: round(p.y) })), widths: s.path.map(() => width), colour: s.colour };
}

/** A hand-drawn sketch → a drawing. kidify 0 = exactly as drawn, 1 = the full child's hand. */
export function drawFreehand(input: Sketch, partial: Partial<Dials> = {}, kidify = 0): Drawing {
	const dials = resolveDials(partial);
	const k = clamp01(kidify);
	const sketch = cleanSketch(input);
	const caps = capabilities(dials);
	const colour = dials.palette[0]!;
	const strokes = sketch.strokes.map((s, i) => planned(s.points, i, colour));
	const plan: StrokePlan = {
		page: sketch.page,
		things: [{ id: SKETCH_THING, label: 'freehand', kind: 'blob', main: true, box: { x: 0, y: 0, ...sketch.page }, keptParts: ['line'], colour }],
		strokes
	};
	const kidCaps = scaledCaps(caps, k);
	const out = strokes.map((s) => (k === 0 ? asDrawn(s, WIDTH[dials.pressure]) : hand(s, kidCaps, dials, k)));
	return { svg: crayonSvg(plan, out, dials), plan, strokes: out, caps, dials };
}
