/**
 * [4] Hand (spec §4.4): an intended path → a child's stroke. Pure and seeded per
 * stroke key, so one stroke changing never changes the others.
 *   - jerky speed: several velocity peaks, not one smooth bell
 *   - drift: slow wander that builds up from the start; tremor: fast wiggle, worse when slow
 *   - ends: the crayon lands with a tiny hook; the end overshoots or stops short
 *   - loops miss their start (a gap, or a little crossing tail)
 *   - corners round off when young; pressure sets the width
 *   - direction (Goodnow): horizontals left→right (right hand), verticals top→down
 */
import { chaikin, dist, resample } from './geometry.js';
import { noise1, rngFor, type Rng } from './rng.js';
import type { Capabilities, Dials, PlannedStroke, Point, Pressure, Stroke } from './types.js';

export const MAX_POINTS = 320;
/** Resample step as a share of part size (spec §4.4: 1.5%). */
const STEP_SHARE = 0.015;
const MIN_STEP = 0.8;
/** Noise frequencies in cycles per stroke (tuned). */
const DRIFT_CYCLES = 1.6;
const TREMOR_CYCLES = 26;
/** Tremor grows when the hand slows; capped (tuned). */
const SLOW_TREMOR_MAX = 2.2;
/** Base crayon width in page units (mm) by pressure (tuned). */
export const WIDTH: Record<Pressure, number> = { light: 1.6, normal: 2.4, hard: 3.4 };
/** The first part of a stroke is pressed harder (tuned). */
const LANDING_SHARE = 0.15;
const LANDING_PRESS = 1.2;
/** Slant: a slight shear, reversed for left hands (tuned). */
const SLANT = 0.03;
const FILL_WIDTH = 0.75;
/** A loop's crossing tail is this share of its possible gap (tuned: "a little tail"). */
const LOOP_TAIL_SHARE = 0.4;

function normals(path: readonly Point[]): Point[] {
	return path.map((_, i) => {
		const a = path[Math.max(0, i - 1)]!;
		const b = path[Math.min(path.length - 1, i + 1)]!;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.hypot(dx, dy) || 1;
		return { x: -dy / len, y: dx / len };
	});
}

/** Speed in (0, 1] along the stroke: a few bumps, so the line is jerky (spec §3). */
function speedProfile(peaks: number, rng: Rng): (t: number) => number {
	const k = Math.max(1, Math.round(peaks));
	const centres = Array.from({ length: k }, (_, i) => (i + 0.5) / k + rng.range(-0.3, 0.3) / k);
	const width = 0.6 / k;
	return (t) => {
		const s = centres.reduce((sum, c) => sum + Math.exp(-(((t - c) / width) ** 2)), 0);
		return Math.min(1, 0.3 + 0.7 * s);
	};
}

/** Goodnow's grammar of action: horizontals L→R (R→L for left hands), verticals top-down. */
function directed(path: Point[], closed: boolean, left: boolean): Point[] {
	if (closed || path.length < 2) return path;
	const a = path[0]!;
	const b = path[path.length - 1]!;
	const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
	const wrong = horizontal ? (left ? b.x > a.x : b.x < a.x) : b.y < a.y;
	return wrong ? [...path].reverse() : path;
}

function slanted(path: Point[], left: boolean, amount: number): Point[] {
	const cy = path.reduce((s, p) => s + p.y, 0) / path.length;
	const k = (left ? -SLANT : SLANT) * amount;
	return path.map((p) => ({ x: p.x + (p.y - cy) * k, y: p.y }));
}

/** Scale a factor's distance from 1 by `amount` (exact at amount 1, so the goldens hold). */
const toward = (x: number, amount: number): number => (amount === 1 ? x : 1 + (x - 1) * amount);

/**
 * `amount` (0..1) scales how much of the child's hand is applied: slant, the landing hook
 * and the pressure variation. Wobble and missed ends scale through the caps (see freehand.ts).
 * Motif drawings always use 1.
 */
export function hand(stroke: PlannedStroke, caps: Capabilities, dials: Dials, amount = 1): Stroke {
	const rng = rngFor(dials.seed, `hand/${stroke.key}`);
	const left = dials.hand === 'left';
	const size = Math.max(1, stroke.size);

	let intended = stroke.path.map((p) => ({ ...p }));
	if (stroke.corners && caps.cornerRounding > 0) intended = chaikin(intended, caps.cornerRounding, stroke.closed);
	intended = slanted(directed(intended, stroke.closed, left), left, amount);
	if (stroke.closed && intended.length > 2) intended = [...intended, { ...intended[0]! }];

	// resample, and keep the point count bounded
	let length = 0;
	for (let i = 1; i < intended.length; i++) length += dist(intended[i - 1]!, intended[i]!);
	const step = Math.max(MIN_STEP, size * STEP_SHARE, length / (MAX_POINTS - 8));
	let pts = resample(intended, step);
	const nrm = normals(pts);
	const n = pts.length;

	const speed = speedProfile(caps.velocityPeaks, rng);
	const drift = caps.driftAmp * caps.strokeScale * size;
	const tremor = caps.tremorAmp * size;
	const key = stroke.key;
	const d0 = noise1(dials.seed, `${key}/drift`, 0);
	pts = pts.map((p, i) => {
		const t = n > 1 ? i / (n - 1) : 0;
		const slow = Math.min(SLOW_TREMOR_MAX, 1 / speed(t));
		const off = (noise1(dials.seed, `${key}/drift`, t * DRIFT_CYCLES) - d0) * drift + noise1(dials.seed, `${key}/tremor`, t * TREMOR_CYCLES) * tremor * slow;
		const nv = nrm[i]!;
		return { x: p.x + nv.x * off, y: p.y + nv.y * off };
	});

	pts = ends(pts, stroke.closed, caps, size, rng, amount);
	const base = WIDTH[dials.pressure] * (stroke.kind === 'fill' ? FILL_WIDTH : 1);
	const widths = pts.map((_, i) => {
		const t = pts.length > 1 ? i / (pts.length - 1) : 0;
		const press = t < LANDING_SHARE ? LANDING_PRESS : 1;
		const vary = 0.85 + 0.3 * (noise1(dials.seed, `${key}/press`, t * 6) * 0.5 + 0.5);
		return base * toward(press, amount) * toward(vary, amount);
	});
	return { key, thing: stroke.thing, part: stroke.part, kind: stroke.kind, closed: stroke.closed, points: pts.map(round), widths: widths.map(round1), colour: stroke.colour };
}

/** Start hook, end overshoot or stop-short, and the loop that doesn't quite close. */
function ends(pts: Point[], closed: boolean, caps: Capabilities, size: number, rng: Rng, amount: number): Point[] {
	if (pts.length < 3) return pts;
	const out = [...pts];
	const first = out[0]!;
	const second = out[1]!;
	// the crayon lands: a tiny hook sideways
	const hook = size * caps.joinError * 0.15;
	const turn = 0.3 * amount;
	out.unshift({ x: first.x + (second.y - first.y) * turn + rng.range(-hook, hook), y: first.y - (second.x - first.x) * turn + rng.range(-hook, hook) });

	const miss = size * (closed ? caps.closureMiss : caps.joinError) * rng.range(0.5, 1.3);
	const last = out[out.length - 1]!;
	const prev = out[out.length - 2]!;
	const seg = dist(prev, last) || 1;
	const ux = (last.x - prev.x) / seg;
	const uy = (last.y - prev.y) / seg;
	if (rng.chance(0.5)) {
		// overshoot: carry on past the end, drifting sideways. For loops it's a *little*
		// crossing tail (spec §1.4), so it's shorter than the gap a loop can leave.
		const len = closed ? miss * LOOP_TAIL_SHARE : miss;
		const side = rng.sign() * 0.35;
		out.push({ x: last.x + ux * len - uy * len * side, y: last.y + uy * len + ux * len * side });
		return out;
	}
	// stop short: drop points from the end until `miss` is used up
	let left = miss;
	while (out.length > 3 && left > 0) {
		const a = out[out.length - 1]!;
		const b = out[out.length - 2]!;
		left -= dist(a, b);
		out.pop();
	}
	return out;
}

const round = (p: Point): Point => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 });
const round1 = (w: number): number => Math.round(w * 100) / 100;
