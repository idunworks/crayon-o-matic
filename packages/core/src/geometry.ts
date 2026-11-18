/** Plain 2D helpers. Pure; nothing random in here except where an Rng is passed in. */
import type { Rng } from './rng.js';
import type { Point } from './types.js';

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

export const pt = (x: number, y: number): Point => ({ x, y });

export function dist(a: Point, b: Point): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}

export function pathLength(path: readonly Point[]): number {
	let len = 0;
	for (let i = 1; i < path.length; i++) len += dist(path[i - 1]!, path[i]!);
	return len;
}

export function bbox(paths: readonly (readonly Point[])[]): Box {
	let x0 = Infinity;
	let y0 = Infinity;
	let x1 = -Infinity;
	let y1 = -Infinity;
	for (const path of paths) {
		for (const p of path) {
			x0 = Math.min(x0, p.x);
			y0 = Math.min(y0, p.y);
			x1 = Math.max(x1, p.x);
			y1 = Math.max(y1, p.y);
		}
	}
	if (!Number.isFinite(x0)) return { x: 0, y: 0, w: 0, h: 0 };
	return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function boxesOverlap(a: Box, b: Box, pad = 0): boolean {
	return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
}

/**
 * Cut a polyline at a rectangle's edges and keep the parts inside. A closed shape
 * that gets cut becomes open runs (the figure "runs off the page").
 */
export function clipToBox(path: readonly Point[], closed: boolean, b: Box): Point[][] {
	const inside = (p: Point) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
	const pts = closed && path.length > 2 ? [...path, path[0]!] : [...path];
	if (pts.every(inside)) return [path.map((p) => ({ ...p }))];
	const edge = (a: Point, c: Point): Point => {
		// binary search for the crossing point: simple and robust for short segments
		let lo = 0;
		let hi = 1;
		const aIn = inside(a);
		for (let i = 0; i < 20; i++) {
			const mid = (lo + hi) / 2;
			const m = { x: a.x + (c.x - a.x) * mid, y: a.y + (c.y - a.y) * mid };
			if (inside(m) === aIn) lo = mid;
			else hi = mid;
		}
		const t = aIn ? lo : hi;
		return { x: a.x + (c.x - a.x) * t, y: a.y + (c.y - a.y) * t };
	};
	const runs: Point[][] = [];
	let run: Point[] = [];
	for (let i = 0; i < pts.length; i++) {
		const p = pts[i]!;
		const prev = pts[i - 1];
		if (inside(p)) {
			if (prev && !inside(prev)) run.push(edge(prev, p));
			run.push({ ...p });
		} else if (prev && inside(prev)) {
			run.push(edge(prev, p));
			if (run.length > 1) runs.push(run);
			run = [];
		}
	}
	if (run.length > 1) runs.push(run);
	return runs;
}

export function transform(path: readonly Point[], scale: number, dx: number, dy: number, angle = 0, cx = 0, cy = 0): Point[] {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return path.map((p) => {
		const x = p.x - cx;
		const y = p.y - cy;
		return { x: (x * cos - y * sin) * scale + cx * scale + dx, y: (x * sin + y * cos) * scale + cy * scale + dy };
	});
}

/** Points evenly spaced along a path, about `step` apart. Keeps the end point. */
export function resample(path: readonly Point[], step: number): Point[] {
	if (path.length < 2 || step <= 0) return path.map((p) => ({ ...p }));
	const out: Point[] = [{ ...path[0]! }];
	let carry = 0;
	for (let i = 1; i < path.length; i++) {
		const a = path[i - 1]!;
		const b = path[i]!;
		const seg = dist(a, b);
		let t = step - carry;
		while (t <= seg) {
			out.push({ x: a.x + ((b.x - a.x) * t) / seg, y: a.y + ((b.y - a.y) * t) / seg });
			t += step;
		}
		carry = seg - (t - step);
	}
	const last = path[path.length - 1]!;
	if (dist(out[out.length - 1]!, last) > step * 0.25) out.push({ ...last });
	return out;
}

/** Chaikin corner cutting: rounds intended corners off (young children can't make them). */
export function chaikin(path: readonly Point[], passes: number, closed: boolean): Point[] {
	let cur = path.map((p) => ({ ...p }));
	for (let n = 0; n < passes; n++) {
		const next: Point[] = [];
		const count = closed ? cur.length : cur.length - 1;
		if (!closed) next.push(cur[0]!);
		for (let i = 0; i < count; i++) {
			const a = cur[i]!;
			const b = cur[(i + 1) % cur.length]!;
			next.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
			next.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
		}
		if (!closed) next.push(cur[cur.length - 1]!);
		cur = next;
	}
	return cur;
}

// ── Primitive shapes, in local coordinates ─────────────────────────────────────

/** An ellipse as an open polyline starting at the top, going the way a child would (counter-clockwise). */
export function ellipse(cx: number, cy: number, rx: number, ry: number, n = 28, start = -Math.PI / 2): Point[] {
	const out: Point[] = [];
	for (let i = 0; i < n; i++) {
		const a = start - (i / n) * Math.PI * 2;
		out.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
	}
	return out;
}

/** A lumpy loop: an ellipse with seeded bumps, for "what a 3-year-old means by a shape". */
export function lumpyLoop(cx: number, cy: number, rx: number, ry: number, rng: Rng, lumps = 0.12, n = 28): Point[] {
	const phase = rng.range(0, Math.PI * 2);
	const k = rng.int(2, 4);
	return ellipse(cx, cy, rx, ry, n).map((p, i) => {
		const a = (i / n) * Math.PI * 2;
		const f = 1 + lumps * Math.sin(a * k + phase);
		return { x: cx + (p.x - cx) * f, y: cy + (p.y - cy) * f };
	});
}

export function line(a: Point, b: Point): Point[] {
	return [{ ...a }, { ...b }];
}

/** A box drawn from the top-left corner, clockwise. */
export function rect(x: number, y: number, w: number, h: number): Point[] {
	return [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)];
}

/** An open rectangle (three sides): doors, chimneys, tree trunks. */
export function tab(x: number, y: number, w: number, h: number): Point[] {
	return [pt(x, y + h), pt(x, y), pt(x + w, y), pt(x + w, y + h)];
}

export function triangle(a: Point, b: Point, c: Point): Point[] {
	return [{ ...a }, { ...b }, { ...c }];
}

export function zigzag(a: Point, b: Point, teeth: number, amp: number): Point[] {
	const out: Point[] = [];
	const len = dist(a, b) || 1;
	const nx = -(b.y - a.y) / len;
	const ny = (b.x - a.x) / len;
	for (let i = 0; i <= teeth * 2; i++) {
		const t = i / (teeth * 2);
		const s = i % 2 === 0 ? 0 : amp;
		out.push({ x: a.x + (b.x - a.x) * t + nx * s, y: a.y + (b.y - a.y) * t + ny * s });
	}
	return out;
}

/** An arc around (cx, cy) from angle a0 to a1 (radians). */
export function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 12): Point[] {
	const out: Point[] = [];
	for (let i = 0; i <= n; i++) {
		const a = a0 + ((a1 - a0) * i) / n;
		out.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
	}
	return out;
}

/** Rays around a centre: one short line each. */
export function rays(cx: number, cy: number, r0: number, r1: number, count: number, offset = 0): Point[][] {
	const out: Point[][] = [];
	for (let i = 0; i < count; i++) {
		const a = offset + (i / count) * Math.PI * 2;
		out.push(line(pt(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0), pt(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)));
	}
	return out;
}

/** Rays fanned around one direction (fingers, sun hands). */
export function fan(at: Point, dir: number, len: number, count: number, spread: number): Point[][] {
	const out: Point[][] = [];
	for (let i = 0; i < count; i++) {
		const a = dir + (count === 1 ? 0 : -spread / 2 + (spread * i) / (count - 1));
		out.push(line(at, pt(at.x + Math.cos(a) * len, at.y + Math.sin(a) * len)));
	}
	return out;
}

export function spiral(cx: number, cy: number, r: number, turns: number, n = 30): Point[] {
	const out: Point[] = [];
	for (let i = 0; i <= n; i++) {
		const t = i / n;
		const a = t * turns * Math.PI * 2;
		out.push({ x: cx + Math.cos(a) * r * t, y: cy + Math.sin(a) * r * t });
	}
	return out;
}

export function heart(cx: number, cy: number, s: number): Point[] {
	const out: Point[] = [];
	for (let i = 0; i <= 24; i++) {
		const t = (i / 24) * Math.PI * 2;
		const x = 16 * Math.sin(t) ** 3;
		const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
		out.push({ x: cx + (x / 17) * s, y: cy + (y / 17) * s });
	}
	return out;
}

/** A tangle of small loops: hair buns, bushes, smoke, "scribble-cluster". */
export function scribbleCluster(cx: number, cy: number, r: number, rng: Rng, loops = 4): Point[] {
	const out: Point[] = [];
	for (let i = 0; i < loops; i++) {
		const ox = cx + rng.range(-r * 0.5, r * 0.5);
		const oy = cy + rng.range(-r * 0.4, r * 0.4);
		out.push(...ellipse(ox, oy, r * rng.range(0.3, 0.55), r * rng.range(0.3, 0.5), 10, rng.range(0, Math.PI * 2)));
	}
	return out;
}

/** A bumpy cloud outline: scallops along an ellipse. */
export function cloudLoop(cx: number, cy: number, rx: number, ry: number, bumps: number): Point[] {
	const out: Point[] = [];
	const n = bumps * 6;
	for (let i = 0; i < n; i++) {
		const a = -Math.PI / 2 - (i / n) * Math.PI * 2;
		const bump = 1 + 0.18 * Math.abs(Math.sin((i / n) * Math.PI * bumps));
		out.push({ x: cx + Math.cos(a) * rx * bump, y: cy + Math.sin(a) * ry * bump });
	}
	return out;
}

/** A star with `points` tips, drawn in one go from the top tip. */
export function star(cx: number, cy: number, r: number, points = 5, inner = 0.45): Point[] {
	const out: Point[] = [];
	for (let i = 0; i < points * 2; i++) {
		const a = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
		const rr = i % 2 === 0 ? r : r * inner;
		out.push(pt(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
	}
	return out;
}

/** A wavy line from a to b: water, hair, spaghetti. */
export function wave(a: Point, b: Point, cycles: number, amp: number, n = 24): Point[] {
	const len = dist(a, b) || 1;
	const nx = -(b.y - a.y) / len;
	const ny = (b.x - a.x) / len;
	return Array.from({ length: n + 1 }, (_, i) => {
		const t = i / n;
		const s = Math.sin(t * cycles * Math.PI * 2) * amp;
		return pt(a.x + (b.x - a.x) * t + nx * s, a.y + (b.y - a.y) * t + ny * s);
	});
}

/** A crescent moon opening to the right, as one closed outline. */
export function crescent(cx: number, cy: number, r: number, n = 14): Point[] {
	const outer = arc(cx, cy, r, r, Math.PI * 0.5, Math.PI * 1.5, n);
	const inner = arc(cx + r * 0.45, cy, r * 0.75, r * 0.85, Math.PI * 1.45, Math.PI * 0.55, n);
	return [...outer, ...inner];
}
