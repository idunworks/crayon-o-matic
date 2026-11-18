/**
 * Animals (spec §1.5, §4.3). A four-legged animal before 5 is "a person turned sideways":
 * a horizontal loop body, four stick legs under it, a head loop at one end, and often a
 * FRONT face on that side-on body (mixed view). Local frame: about 140 × 100, y down.
 */
import * as g from '../geometry.js';
import type { Part, Point } from '../types.js';
import { drawPrimitive, find, has, placeExtra, stroke, type Anchors, type BuildCtx, type Built, type LocalStroke } from './common.js';
import { crownY, face, forehead } from './face.js';

const CORE4 = /^(body|head|eyes?|mouth|nose|legs?|tail|ears?|whiskers?|spots?|feet)$/i;

/** Ears are big: they are what makes a cat a cat (owner, 2026-11-18). Share of head radius. */
const EAR_SIZE = 0.8;

/** Head, face, ears and whiskers of a four-legged animal; shared by standing and sitting. */
function animalHead(parts: readonly Part[], ctx: BuildCtx, head: Point, headR: number, side: 'left' | 'right' | undefined): { strokes: LocalStroke[]; crown: number } {
	const { rng, adorable } = ctx;
	const out: LocalStroke[] = [];
	if (has(parts, 'head')) out.push(stroke('head', forehead(g.lumpyLoop(head.x, head.y, headR, headR * 0.92, rng, 0.08), head, headR, adorable), true, false, true));
	const crown = crownY(head, headR * 0.92, adorable);
	out.push(...face(ctx, { c: head, r: headR, eyes: has(parts, 'eyes'), mouth: has(parts, 'mouth'), nose: has(parts, 'nose'), ...(side ? { side } : {}) }));
	if (has(parts, 'ears')) {
		const ear = find(parts, 'ears') ?? { name: 'ears', primitive: 'triangle' as const };
		const size = headR * EAR_SIZE;
		const earY = crown + size * 0.15;
		out.push(...drawPrimitive(ear, head.x - headR * 0.55, earY, size, ctx, -Math.PI / 2 - 0.3));
		out.push(...drawPrimitive(ear, head.x + headR * 0.55, earY, size, ctx, -Math.PI / 2 + 0.3));
	}
	if (has(parts, 'whiskers')) {
		for (const s of [-1, 1]) {
			for (const dy of [-2, 3]) out.push(stroke('whiskers', g.line(g.pt(head.x + s * headR * 0.45, head.y + headR * 0.25 + dy), g.pt(head.x + s * headR * 1.5, head.y + headR * 0.15 + dy * 1.8))));
		}
	}
	return { strokes: out, crown };
}

/**
 * A tail held up: rises from `from`, leaning away (`lean` < 0 leans left), the tip curling
 * back over (owner, 2026-11-18: ears, legs and tail stand up).
 */
function upTail(from: Point, height: number, lean: number): Point[] {
	const n = 12;
	const ctrl = g.pt(from.x + lean * 1.3, from.y - height * 0.35);
	const end = g.pt(from.x + lean * 0.7, from.y - height);
	const rise = Array.from({ length: n + 1 }, (_, i) => {
		const t = i / n;
		const u = 1 - t;
		return g.pt(u * u * from.x + 2 * u * t * ctrl.x + t * t * end.x, u * u * from.y + 2 * u * t * ctrl.y + t * t * end.y);
	});
	const r = height * 0.12;
	const dir = lean < 0 ? 1 : -1;
	const curl = g.arc(end.x + dir * r, end.y, r, r, Math.PI + (dir > 0 ? 0 : Math.PI), Math.PI + (dir > 0 ? Math.PI * 0.9 : Math.PI * 0.1), 6).slice(1);
	return [...rise, ...(dir > 0 ? curl : curl.reverse())];
}

/** Quadrupeds: cats, dogs, dragons, horses. Faces right; sits facing you when the pose says so. */
export function animal4(parts: readonly Part[], ctx: BuildCtx): Built {
	if (ctx.pose === 'sitting') return animal4Sitting(parts, ctx);
	const { rng, adorable } = ctx;
	const out: LocalStroke[] = [];
	const bodyRx = 48;
	const bodyRy = 22 + rng.range(-3, 5);
	const body = g.pt(0, 52);
	const headR = 18 * (1 + 0.35 * adorable) * (ctx.caps.age < 5 ? 1.15 : 1);
	const head = g.pt(bodyRx + headR * 0.55, body.y - bodyRy - headR * 0.35);

	// head first (it's what the child cares about), then the body
	const side = ctx.mixedView ? undefined : 'right';
	const { strokes: headStrokes, crown } = animalHead(parts, ctx, head, headR, side);
	out.push(...headStrokes);
	if (has(parts, 'body')) out.push(stroke('body', g.lumpyLoop(body.x, body.y, bodyRx, bodyRy, rng, 0.07), true, false, true));

	// four stick legs, all visible (intellectual realism), none overlapping
	if (has(parts, 'legs')) {
		const legLen = 26 + rng.range(-4, 6);
		for (const fx of [-0.75, -0.35, 0.3, 0.7]) {
			const x = body.x + fx * bodyRx;
			const y0 = body.y + bodyRy * Math.sqrt(Math.max(0, 1 - fx * fx)) * 0.92;
			out.push(stroke('legs', g.line(g.pt(x, y0), g.pt(x + rng.range(-3, 3), body.y + bodyRy + legLen))));
		}
	}
	if (has(parts, 'tail')) out.push(stroke('tail', upTail(g.pt(body.x - bodyRx * 0.95, body.y - bodyRy * 0.3), bodyRy * 1.9, -12)));
	if (has(parts, 'spots')) {
		for (let i = 0; i < 3; i++) out.push(stroke('spots', g.spiral(body.x + rng.range(-0.6, 0.4) * bodyRx, body.y + rng.range(-0.4, 0.4) * bodyRy, 3, 1.5, 8)));
	}

	const anchors: Anchors = {
		top: g.pt(head.x, crown),
		face: { c: head, r: headR },
		hands: [g.pt(head.x + headR, head.y + headR * 0.4)],
		side: g.pt(body.x - bodyRx * 1.2, body.y),
		back: g.pt(body.x - bodyRx * 0.2, body.y - bodyRy),
		front: g.pt(head.x + headR, head.y + headR * 0.2),
		unit: bodyRx * 0.9
	};
	for (const p of parts) if (!CORE4.test(p.name)) out.push(...placeExtra(p, anchors, ctx));
	return { strokes: out, anchors };
}

/**
 * Sitting, facing you: the head on top, a pear-shaped body under it, two front legs down the
 * front with paws, the tail curling up one side.
 */
function animal4Sitting(parts: readonly Part[], ctx: BuildCtx): Built {
	const { rng, adorable } = ctx;
	const headR = 20 * (1 + 0.35 * adorable) * (ctx.caps.age < 5 ? 1.15 : 1);
	const head = g.pt(0, headR);
	const { strokes: out, crown } = animalHead(parts, ctx, head, headR, undefined);
	const bodyRx = headR * 1.1;
	const bodyRy = headR * 1.35;
	const body = g.pt(0, head.y + headR * 0.75 + bodyRy);
	if (has(parts, 'body')) {
		// a pear: wider at the bottom
		const pear = g.lumpyLoop(body.x, body.y, bodyRx, bodyRy, rng, 0.05).map((p) => ({ x: body.x + (p.x - body.x) * (1 + 0.28 * ((p.y - body.y) / bodyRy)), y: p.y }));
		out.push(stroke('body', pear, true, false, true));
	}
	const floor = body.y + bodyRy;
	if (has(parts, 'legs')) {
		for (const s of [-1, 1]) {
			const x = s * bodyRx * 0.32;
			out.push(stroke('legs', g.line(g.pt(x, body.y + bodyRy * 0.1), g.pt(x + rng.range(-1.5, 1.5), floor - 2))));
			out.push(stroke('feet', g.lumpyLoop(x + s * 2, floor - 1, bodyRx * 0.2, bodyRx * 0.1, rng, 0.08, 14), true));
		}
	}
	// from the pear's right edge near the floor, out and up beside the body
	if (has(parts, 'tail')) out.push(stroke('tail', upTail(g.pt(bodyRx * 0.75, floor - bodyRy * 0.2), bodyRy * 1.25, 22)));
	if (has(parts, 'spots')) {
		for (let i = 0; i < 3; i++) out.push(stroke('spots', g.spiral(body.x + rng.range(-0.5, 0.5) * bodyRx, body.y + rng.range(-0.5, 0.3) * bodyRy, 3, 1.5, 8)));
	}
	const anchors: Anchors = {
		top: g.pt(0, crown),
		face: { c: head, r: headR },
		hands: [g.pt(bodyRx * 0.4, floor)],
		side: g.pt(-bodyRx * 1.6, body.y),
		back: g.pt(-bodyRx * 0.6, body.y - bodyRy * 0.6),
		front: g.pt(bodyRx, body.y),
		unit: bodyRx
	};
	for (const p of parts) if (!CORE4.test(p.name)) out.push(...placeExtra(p, anchors, ctx));
	return { strokes: out, anchors };
}

const CORE2 = /^(body|head|eyes?|mouth|beak|legs?|wings?|feet|tail)$/i;

/** Birds and other two-legged animals. */
export function animal2(parts: readonly Part[], ctx: BuildCtx): Built {
	const { rng } = ctx;
	const out: LocalStroke[] = [];
	const body = g.pt(0, 55);
	const head = g.pt(26, 22);
	const headR = 16 * (1 + 0.3 * ctx.adorable);
	if (has(parts, 'head')) out.push(stroke('head', g.lumpyLoop(head.x, head.y, headR, headR, rng, 0.06), true, false, true));
	out.push(...face(ctx, { c: head, r: headR, eyes: has(parts, 'eyes'), mouth: false, nose: false, ...(ctx.mixedView ? {} : { side: 'right' as const }) }));
	if (has(parts, 'beak', 'mouth')) out.push(...drawPrimitive({ name: 'beak', primitive: 'triangle' }, head.x + headR * 1.15, head.y + 3, headR * 0.7, ctx, 0));
	if (has(parts, 'body')) out.push(stroke('body', g.lumpyLoop(body.x, body.y, 34, 26, rng, 0.08), true, false, true));
	if (has(parts, 'wings')) out.push(stroke('wings', g.arc(body.x - 4, body.y - 4, 20, 12, 0.2, Math.PI - 0.2, 10)));
	if (has(parts, 'legs')) {
		for (const x of [-8, 8]) out.push(stroke('legs', g.line(g.pt(x, body.y + 25), g.pt(x + rng.range(-2, 2), body.y + 45))));
		if (has(parts, 'feet')) for (const x of [-8, 8]) out.push(...g.fan(g.pt(x, body.y + 45), 0, 7, 3, 1.4).map((p) => stroke('feet', p)));
	}
	if (has(parts, 'tail')) out.push(...g.fan(g.pt(body.x - 33, body.y - 2), Math.PI, 14, 3, 0.9).map((p) => stroke('tail', p)));
	const anchors: Anchors = { top: g.pt(head.x, head.y - headR), face: { c: head, r: headR }, hands: [g.pt(head.x + headR * 1.6, head.y)], side: g.pt(-40, body.y), back: g.pt(body.x, body.y - 26), front: g.pt(head.x + headR, head.y), unit: 30 };
	for (const p of parts) if (!CORE2.test(p.name)) out.push(...placeExtra(p, anchors, ctx));
	return { strokes: out, anchors };
}

const COREF = /^(body|eyes?|mouth|tail|fins?|scales?)$/i;

export function fish(parts: readonly Part[], ctx: BuildCtx): Built {
	const { rng } = ctx;
	const out: LocalStroke[] = [];
	const c = g.pt(0, 40);
	if (has(parts, 'body')) out.push(stroke('body', g.lumpyLoop(c.x, c.y, 45, 24, rng, 0.06), true, false, true));
	out.push(...face(ctx, { c: g.pt(c.x + 22, c.y - 2), r: 16, eyes: has(parts, 'eyes'), mouth: has(parts, 'mouth'), nose: false, ...(ctx.mixedView ? {} : { side: 'right' as const }) }));
	if (has(parts, 'tail')) out.push(...drawPrimitive({ name: 'tail', primitive: 'triangle' }, c.x - 56, c.y, 26, ctx, Math.PI));
	if (has(parts, 'fins')) out.push(stroke('fins', g.arc(c.x - 4, c.y - 22, 12, 9, Math.PI + 0.4, Math.PI * 2 - 0.4, 8)));
	if (has(parts, 'scales')) for (let i = 0; i < 4; i++) out.push(stroke('scales', g.arc(c.x - 22 + i * 10, c.y + rng.range(-4, 6), 5, 5, 0.2, Math.PI - 0.2, 6)));
	const anchors: Anchors = { top: g.pt(c.x, c.y - 26), face: { c: g.pt(c.x + 22, c.y - 2), r: 16 }, hands: [g.pt(c.x + 46, c.y)], side: g.pt(c.x - 60, c.y - 20), back: g.pt(c.x, c.y - 24), front: g.pt(c.x + 45, c.y), unit: 40 };
	for (const p of parts) if (!COREF.test(p.name)) out.push(...placeExtra(p, anchors, ctx));
	return { strokes: out, anchors };
}

const COREB = /^(body|head|eyes?|mouth|legs?|antennae?|wings?|spots?)$/i;

export function bug(parts: readonly Part[], ctx: BuildCtx): Built {
	const { rng } = ctx;
	const out: LocalStroke[] = [];
	const body = g.pt(0, 50);
	const head = g.pt(34, 40);
	if (has(parts, 'head')) out.push(stroke('head', g.lumpyLoop(head.x, head.y, 13, 13, rng, 0.06), true, false, true));
	out.push(...face(ctx, { c: head, r: 13, eyes: has(parts, 'eyes'), mouth: has(parts, 'mouth'), nose: false }));
	if (has(parts, 'antennae', 'antenna')) for (const s of [-1, 1]) out.push(stroke('antennae', g.line(g.pt(head.x + s * 5, head.y - 12), g.pt(head.x + s * 12, head.y - 28))));
	if (has(parts, 'body')) out.push(stroke('body', g.lumpyLoop(body.x, body.y, 26, 19, rng, 0.06), true, false, true));
	if (has(parts, 'legs')) for (const x of [-14, 0, 14]) for (const s of [-1, 1]) out.push(stroke('legs', g.line(g.pt(x, body.y + s * 17), g.pt(x + rng.range(-4, 4), body.y + s * 32))));
	if (has(parts, 'spots')) for (let i = 0; i < 4; i++) out.push(stroke('spots', g.spiral(body.x + rng.range(-16, 16), body.y + rng.range(-10, 10), 3, 1.5, 8)));
	if (has(parts, 'wings')) out.push(stroke('wings', g.ellipse(body.x - 6, body.y - 22, 16, 9, 16), true));
	const anchors: Anchors = { top: g.pt(head.x, head.y - 14), face: { c: head, r: 13 }, hands: [g.pt(head.x + 14, head.y)], side: g.pt(-34, body.y), back: g.pt(body.x, body.y - 20), front: g.pt(head.x + 13, head.y), unit: 26 };
	for (const p of parts) if (!COREB.test(p.name)) out.push(...placeExtra(p, anchors, ctx));
	return { strokes: out, anchors };
}
