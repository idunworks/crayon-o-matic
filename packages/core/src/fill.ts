/**
 * Colouring in (spec §1.6, §4.6). Young children: a few zigzags across the shape, going
 * well outside the lines and leaving gaps. Older: denser hatching, mostly inside, one
 * direction. Colouring happens after drawing, so it lands on top of the outline.
 */
import type { Rng } from './rng.js';
import type { Capabilities, Point } from './types.js';

function rotate(p: Point, a: number, c: Point): Point {
	const cos = Math.cos(a);
	const sin = Math.sin(a);
	const x = p.x - c.x;
	const y = p.y - c.y;
	return { x: c.x + x * cos - y * sin, y: c.y + x * sin + y * cos };
}

/** x-spans where a horizontal line at y crosses the polygon (even-odd). */
function spansAt(poly: readonly Point[], y: number): [number, number][] {
	const xs: number[] = [];
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i]!;
		const b = poly[(i + 1) % poly.length]!;
		if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
	}
	xs.sort((p, q) => p - q);
	const out: [number, number][] = [];
	for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i]!, xs[i + 1]!]);
	return out;
}

export interface FillOptions {
	/** Shared hatch direction for older children (one direction per drawing). */
	hatchAngle: number;
}

/**
 * Colouring strokes for one closed outline, in page coordinates.
 * Returns zero or more polylines (zigzag runs).
 */
export function colourIn(outline: readonly Point[], size: number, caps: Capabilities, rng: Rng, opts: FillOptions): Point[][] {
	if (outline.length < 3) return [];
	const zig = caps.fillStyle === 'zigzag';
	const angle = zig ? rng.range(-0.9, 0.9) : opts.hatchAngle + rng.range(-0.12, 0.12);
	const c = outline.reduce((s, p) => ({ x: s.x + p.x / outline.length, y: s.y + p.y / outline.length }), { x: 0, y: 0 });
	const poly = outline.map((p) => rotate(p, -angle, c));
	const ys = poly.map((p) => p.y);
	const y0 = Math.min(...ys);
	const y1 = Math.max(...ys);
	const spacing = Math.max(1.5, size * caps.fillSpacing);
	const lines = Math.max(1, Math.floor((y1 - y0) / spacing));
	const stopAfter = Math.max(1, Math.round(lines * Math.min(1, caps.fillCoverage + rng.range(-0.1, 0.1))));
	const over = size * caps.fillOverflow;

	const runs: Point[][] = [];
	let run: Point[] = [];
	let dir = 1;
	for (let i = 0; i < stopAfter; i++) {
		const y = y0 + spacing * (i + 0.5) + rng.range(-0.25, 0.25) * spacing;
		const spans = spansAt(poly, y);
		const widest = spans.sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0];
		// gaps: young children skip bits
		if (!widest || (zig && rng.chance(0.12))) {
			if (run.length > 1) runs.push(run);
			run = [];
			continue;
		}
		const a = widest[0] - rng.range(0, over);
		const b = widest[1] + rng.range(0, over);
		const pts = dir > 0 ? [{ x: a, y }, { x: b, y }] : [{ x: b, y }, { x: a, y }];
		run.push(...pts);
		dir = -dir;
	}
	if (run.length > 1) runs.push(run);
	return runs.map((r) => r.map((p) => rotate(p, angle, c)));
}
