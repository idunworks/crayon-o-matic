/**
 * Shared pieces for the thing builders: local strokes, the "can the child make this
 * shape yet?" fallback (spec §4.1: box → loop, triangle → loop with a point, heart → loop),
 * and placement of extra parts (glasses, bun, wings ...) at named anchor points.
 */
import * as g from '../geometry.js';
import type { Rng } from '../rng.js';
import type { Capabilities, Expression, Part, Point, Pose, Primitive, Shape } from '../types.js';

export interface LocalStroke {
	part: string;
	path: Point[];
	closed: boolean;
	/** Has intended sharp corners (box, triangle, zigzag). */
	corners: boolean;
	/** A closed shape big enough to colour in. */
	fillable: boolean;
}

export interface BuildCtx {
	caps: Capabilities;
	rng: Rng;
	adorable: number;
	expression: Expression;
	/** Animals: front face on a side-on body. */
	mixedView: boolean;
	/** From the scene; animals use it to sit facing you or stand side-on. */
	pose?: Pose;
}

/** Where extra parts attach, in the builder's local frame. */
export interface Anchors {
	top: Point;
	face?: { c: Point; r: number };
	hands: Point[];
	side: Point;
	back?: Point;
	front?: Point;
	/** Rough size of the thing, for scaling extras. */
	unit: number;
}

export interface Built {
	strokes: LocalStroke[];
	anchors: Anchors;
}

export const stroke = (part: string, path: Point[], closed = false, corners = false, fillable = false): LocalStroke => ({
	part,
	path,
	closed,
	corners,
	fillable
});

/** The shape a primitive needs before a child can draw it properly. */
const NEEDS: Partial<Record<Primitive, Shape>> = {
	box: 'square',
	tab: 'square',
	triangle: 'triangle',
	cross: 'cross',
	zigzag: 'diagonal',
	heart: 'triangle',
	loop: 'circle',
	spiral: 'circle'
};

/** What a primitive becomes when the child can't make it yet. */
const FALLBACK: Partial<Record<Primitive, Primitive>> = {
	box: 'loop',
	tab: 'U',
	triangle: 'loop',
	cross: 'line',
	zigzag: 'arc',
	heart: 'loop',
	loop: 'scribble-cluster',
	spiral: 'scribble-cluster'
};

export function canDraw(p: Primitive, caps: Capabilities): boolean {
	const need = NEEDS[p];
	return !need || caps.shapes.includes(need);
}

/** Simplify a primitive until the child can draw it (spec §4.3). */
export function simplify(p: Primitive, caps: Capabilities): Primitive {
	let cur = p;
	for (let i = 0; i < 4 && !canDraw(cur, caps); i++) cur = FALLBACK[cur] ?? 'scribble-cluster';
	return cur;
}

/** A loop with one point pulled out: a triangle as drawn before triangles. */
export function pointyLoop(cx: number, cy: number, r: number, dir: number): Point[] {
	return g.ellipse(cx, cy, r, r * 0.85, 20).map((p) => {
		const a = Math.atan2(p.y - cy, p.x - cx);
		// a narrow, clear tip: the child means a corner even if it comes out round
		const pull = Math.max(0, Math.cos(a - dir)) ** 8 * 1.15;
		return { x: p.x + Math.cos(a) * r * pull, y: p.y + Math.sin(a) * r * pull };
	});
}

/**
 * One primitive at (cx, cy) with size s, after fallback. Returns one or more strokes.
 * `dir` orients pointy things (beaks, roofs, ears), in radians; -π/2 is up.
 */
export function drawPrimitive(part: Part, cx: number, cy: number, s: number, ctx: BuildCtx, dir = -Math.PI / 2): LocalStroke[] {
	const prim = simplify(part.primitive, ctx.caps);
	const n = part.name;
	const r = s / 2;
	const fallbackTriangle = part.primitive === 'triangle' && prim === 'loop';
	switch (prim) {
		case 'loop':
			if (fallbackTriangle) return [stroke(n, pointyLoop(cx, cy, r * 0.8, dir), true, false, true)];
			if (part.primitive === 'box') return [stroke(n, g.lumpyLoop(cx, cy, r, r * 0.85, ctx.rng, 0.06), true, false, true)];
			return [stroke(n, g.lumpyLoop(cx, cy, r, r * 0.9, ctx.rng), true, false, s > 12)];
		case 'dot':
		case 'dots': {
			const count = Math.max(1, part.count ?? (prim === 'dots' ? 3 : 1));
			return Array.from({ length: count }, (_, i) =>
				stroke(n, g.spiral(cx + (i - (count - 1) / 2) * r * 0.9, cy + ctx.rng.range(-r, r) * 0.3, Math.max(1.2, r * 0.18), 1.5, 8))
			);
		}
		case 'line':
			return [stroke(n, g.line(g.pt(cx - r * Math.cos(dir + Math.PI / 2), cy - r * Math.sin(dir + Math.PI / 2)), g.pt(cx + r * Math.cos(dir + Math.PI / 2), cy + r * Math.sin(dir + Math.PI / 2))))];
		case 'zigzag':
			return [stroke(n, g.zigzag(g.pt(cx - r, cy), g.pt(cx + r, cy), 3, r * 0.5), false, true)];
		case 'tab':
			return [stroke(n, g.tab(cx - r * 0.5, cy - r, r, s), false, true)];
		case 'box':
			return [stroke(n, g.rect(cx - r, cy - r * 0.8, s, s * 0.8), true, true, true)];
		case 'triangle':
			return [stroke(n, g.triangle(g.pt(cx + Math.cos(dir) * r, cy + Math.sin(dir) * r), g.pt(cx + Math.cos(dir + 2.1) * r, cy + Math.sin(dir + 2.1) * r), g.pt(cx + Math.cos(dir - 2.1) * r, cy + Math.sin(dir - 2.1) * r)), true, true, true)];
		case 'cross':
			return [stroke(n, g.line(g.pt(cx - r, cy), g.pt(cx + r, cy))), stroke(n, g.line(g.pt(cx, cy - r), g.pt(cx, cy + r)))];
		case 'rays':
			return g.rays(cx, cy, r * 0.2, r, part.count ?? 6, ctx.rng.range(0, 1)).map((p) => stroke(n, p));
		case 'spiral':
			return [stroke(n, g.spiral(cx, cy, r, 2.5))];
		case 'scribble-cluster':
		case 'scribble-fill':
			return [stroke(n, g.scribbleCluster(cx, cy, r, ctx.rng, 3 + ctx.rng.int(0, 2)))];
		case 'U':
			return [stroke(n, g.arc(cx, cy - r * 0.4, r, r, 0.15, Math.PI - 0.15))];
		case 'arc':
			return [stroke(n, g.arc(cx, cy + r * 0.4, r, r * 0.8, Math.PI + 0.3, Math.PI * 2 - 0.3))];
		case 'heart':
			return [stroke(n, g.heart(cx, cy, r), true, false, true)];
		default:
			return [stroke(n, g.scribbleCluster(cx, cy, r, ctx.rng))];
	}
}

/** Where an extra part goes, judged from its name. */
type Spot = 'top' | 'face' | 'hand' | 'back' | 'front' | 'side';
const SPOTS: readonly [RegExp, Spot][] = [
	[/glass|monocle|mask|beard|moustache|mustache/, 'face'],
	[/hat|bun|hair|crown|bow|horn|antler|ear|cap|helmet|halo/, 'top'],
	[/bag|stick|cane|umbrella|balloon|ball|cup|sword|wand|phone|knitting|bone|fork/, 'hand'],
	[/wing|spike|fin|shell|saddle|backpack/, 'back'],
	[/fire|flame|beak|smoke|breath|trunk|tongue/, 'front'],
	[/tail/, 'side']
];

export function spotFor(name: string): Spot {
	const lower = name.toLowerCase();
	for (const [re, spot] of SPOTS) if (re.test(lower)) return spot;
	return 'side';
}

/** Draw an extra part at its anchor. Unknown names land beside the thing. */
export function placeExtra(part: Part, a: Anchors, ctx: BuildCtx): LocalStroke[] {
	const spot = spotFor(part.name);
	const s = a.unit * 0.28;
	const { rng } = ctx;
	if (spot === 'face' && a.face) {
		const { c, r } = a.face;
		if (/glass/.test(part.name)) {
			const gr = r * 0.22;
			return [
				stroke(part.name, g.ellipse(c.x - r * 0.35, c.y - r * 0.1, gr, gr, 16), true),
				stroke(part.name, g.ellipse(c.x + r * 0.35, c.y - r * 0.1, gr, gr, 16), true),
				stroke(part.name, g.line(g.pt(c.x - r * 0.13, c.y - r * 0.12), g.pt(c.x + r * 0.13, c.y - r * 0.12)))
			];
		}
		return drawPrimitive(part, c.x, c.y + r * 0.45, r * 0.6, ctx);
	}
	if (spot === 'hand' && a.hands.length > 0) {
		const h = rng.pick(a.hands);
		if (/balloon/.test(part.name)) {
			const top = g.pt(h.x + s * 0.3, h.y - s * 2.2);
			return [stroke(part.name, g.lumpyLoop(top.x, top.y, s * 0.5, s * 0.6, rng), true, false, true), stroke(part.name, g.line(h, g.pt(top.x, top.y + s * 0.6)))];
		}
		return drawPrimitive(part, h.x + s * 0.4, h.y, s, ctx, 0);
	}
	if (spot === 'top') return drawPrimitive(part, a.top.x + rng.range(-s, s) * 0.3, a.top.y - s * 0.35, s, ctx);
	if (spot === 'back' && a.back) {
		if (/spike/.test(part.name)) return [stroke(part.name, g.zigzag(g.pt(a.back.x - s, a.back.y), g.pt(a.back.x + s, a.back.y), 4, -s * 0.35), false, true)];
		return drawPrimitive(part, a.back.x, a.back.y - s * 0.4, s * 1.3, ctx);
	}
	if (spot === 'front' && a.front) return drawPrimitive(part, a.front.x + s * 0.6, a.front.y, s, ctx, 0);
	return drawPrimitive(part, a.side.x + rng.range(0.2, 0.6) * s, a.side.y + rng.range(-0.5, 0.5) * s, s, ctx);
}

/** Is a part name in this list (case-insensitive, also matches plurals like "eye"/"eyes")? */
export function has(parts: readonly Part[], ...names: string[]): boolean {
	return parts.some((p) => names.some((n) => p.name.toLowerCase().replace(/s$/, '') === n.replace(/s$/, '')));
}

export function find(parts: readonly Part[], name: string): Part | undefined {
	return parts.find((p) => p.name.toLowerCase().replace(/s$/, '') === name.replace(/s$/, ''));
}
