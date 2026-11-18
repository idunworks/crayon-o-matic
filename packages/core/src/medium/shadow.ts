/**
 * Which bits of a line cast a shadow (owner, 2026-11-18: "only shade the low-right lines",
 * configurable). A loop casts a shadow only along the edges that face away from the light,
 * so the shadow falls outside the shape instead of doubling the line inside it.
 * Open lines (legs, arms, freehand strokes) have no inside, so either side counts: a stretch
 * casts when it lies across the light, and a stretch running along the light (whose cast copy
 * would hide under the line anyway) drops out as the cut rises (owner, 2026-11-18: the cut
 * must work on freehand drawings too).
 */
import type { Point } from '../types.js';

/** Details drawn inside another shape: their shadow would land inside it, so they cast none. */
export const INNER_DETAIL = /^(eyes|mouth|nose|brows|tear|cheeks|spots|whiskers|scales|windows|door|apples|meatballs|patches)$/;

/** The shadow-cut dial (0..1) as a threshold on how much an edge faces the shadow. */
export function facingThreshold(cut: number): number {
	const ALL = -1.01; // cut 0: every edge
	const STRICT = 0.7; // cut 1: only edges facing almost straight at the shadow
	return ALL + (STRICT - ALL) * Math.max(0, Math.min(1, cut));
}

export function direction(angleDeg: number): Point {
	const a = (angleDeg * Math.PI) / 180;
	return { x: Math.cos(a), y: Math.sin(a) };
}

function signedArea(points: readonly Point[]): number {
	let s = 0;
	for (let i = 0; i < points.length; i++) {
		const a = points[i]!;
		const b = points[(i + 1) % points.length]!;
		s += a.x * b.y - b.x * a.y;
	}
	return s / 2;
}

/** Per point, the unit normal of the line there (from its neighbours). */
function normalAt(points: readonly Point[], i: number): Point {
	const a = points[Math.max(0, i - 1)]!;
	const b = points[Math.min(points.length - 1, i + 1)]!;
	const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
	return { x: (b.y - a.y) / len, y: -(b.x - a.x) / len };
}

/** Split `points` into runs of consecutive points that pass `keep`. */
function runsWhere(points: readonly Point[], keep: (i: number) => boolean): Point[][] {
	const runs: Point[][] = [];
	let run: Point[] = [];
	points.forEach((p, i) => {
		if (keep(i)) run.push({ ...p });
		else {
			if (run.length > 1) runs.push(run);
			run = [];
		}
	});
	if (run.length > 1) runs.push(run);
	return runs;
}

/**
 * The runs of `points` that face `dir` at least as much as `threshold` (−1..1).
 * A closed shape faces with its outward normal; an open line with either side.
 */
export function facingRuns(points: readonly Point[], closed: boolean, dir: Point, threshold: number): Point[][] {
	if (points.length < 2) return [];
	const facing = (i: number): number => {
		const n = normalAt(points, i);
		return n.x * dir.x + n.y * dir.y;
	};
	if (!closed || points.length < 4) return runsWhere(points, (i) => Math.abs(facing(i)) >= threshold);
	// in screen coordinates (y down) a positive area means clockwise, outward = (ty, -tx)
	const out = signedArea(points) > 0 ? 1 : -1;
	return runsWhere(points, (i) => out * facing(i) >= threshold);
}
