/**
 * The human figure (spec §1.3, §4.3), in a local frame 100 units tall, x centred on 0.
 *   tadpole      head+body is one loop; legs come out of it; arms from the head sides
 *   transitional a small trunk loop, or just a gap between the legs; arms from head or neck
 *   conventional separate trunk; arms and legs from the trunk; hands and feet
 * The head is always the first stroke and drawn too big (headRatio).
 */
import * as g from '../geometry.js';
import type { Part, Point } from '../types.js';
import { has, placeExtra, stroke, type Anchors, type BuildCtx, type Built, type LocalStroke } from './common.js';
import { crownY, face, forehead } from './face.js';

const HEIGHT = 100;
/** Fingers per hand by age (spec §4.3: 3..8 at 4, 4..6 at 5; sun hands at 3–4). */
const SUN_HANDS_BELOW = 4;
/** Transitional figures: chance the trunk is a second loop rather than a gap (tuned). */
const TRUNK_LOOP_CHANCE = 0.5;
/** Conventional figures: chance a person with a triangle gets a triangle dress (tuned). */
const DRESS_CHANCE = 0.35;

const CORE = new Set(['head', 'eye', 'mouth', 'nose', 'leg', 'arm', 'trunk', 'body', 'hand', 'feet', 'foot', 'hair', 'ear', 'neck']);

function isCore(p: Part): boolean {
	return CORE.has(p.name.toLowerCase().replace(/s$/, ''));
}

function hands(ctx: BuildCtx, at: Point, dir: number, unit: number): LocalStroke[] {
	const { rng, caps } = ctx;
	if (caps.age < SUN_HANDS_BELOW) return g.rays(at.x, at.y, 0, unit * 0.09, rng.int(5, 8), rng.range(0, 1)).map((p) => stroke('hands', p));
	const count = caps.age < 5 ? rng.int(3, 8) : rng.int(4, 6);
	return g.fan(at, dir, unit * 0.08, count, 1.6).map((p) => stroke('hands', p));
}

/** Hair is drawn on a round head, then follows the forehead up (adorable). */
function hair(ctx: BuildCtx, c: Point, r: number): LocalStroke[] {
	return roundHair(ctx, c, r).map((s) => ({ ...s, path: forehead(s.path, c, r, ctx.adorable) }));
}

function roundHair(ctx: BuildCtx, c: Point, r: number): LocalStroke[] {
	if (ctx.expression === 'scared' && ctx.caps.expressionSkill >= 2) {
		return g.rays(c.x, c.y, r * 1.02, r * 1.4, 7, 0).filter((p) => p[1]!.y < c.y - r * 0.4).map((p) => stroke('hair', p));
	}
	const style = ctx.rng.int(0, 2);
	if (style === 0) return [stroke('hair', g.scribbleCluster(c.x, c.y - r * 0.95, r * 0.55, ctx.rng, 4))];
	if (style === 1) return g.rays(c.x, c.y, r * 1.0, r * 1.25, 9, 0).filter((p) => p[0]!.y < c.y - r * 0.5).map((p) => stroke('hair', p));
	return [stroke('hair', g.arc(c.x, c.y, r * 1.08, r * 1.08, Math.PI + 0.35, Math.PI * 2 - 0.35, 14))];
}

function feet(at: Point[], unit: number, rng: BuildCtx['rng']): LocalStroke[] {
	return at.map((p, i) => {
		const dir = i === 0 ? -1 : 1;
		return stroke('feet', g.lumpyLoop(p.x + dir * unit * 0.05, p.y + unit * 0.01, unit * 0.07, unit * 0.035, rng, 0.1, 14), true);
	});
}

export function person(parts: readonly Part[], ctx: BuildCtx): Built {
	const { caps, rng, adorable } = ctx;
	const r = caps.headRatio;
	const headH = (HEIGHT * r) / (1 + r);
	const rest = HEIGHT - headH;
	const type = caps.figureType;
	const out: LocalStroke[] = [];
	const unit = HEIGHT;

	// 1. the head (always first)
	const headR = headH / 2;
	const tadpole = type === 'tadpole';
	const head = { c: g.pt(0, headR), r: headR * (tadpole ? 0.92 : 1) };
	const skull = g.lumpyLoop(head.c.x, head.c.y, head.r * (tadpole ? 0.95 : 0.9), headR, rng, tadpole ? 0.12 : 0.07);
	out.push(stroke('head', forehead(skull, head.c, headR, adorable), true, false, true));

	// 2. face
	out.push(...face(ctx, { c: head.c, r: head.r, eyes: has(parts, 'eyes'), mouth: has(parts, 'mouth'), nose: has(parts, 'nose') }));
	if (has(parts, 'hair')) out.push(...hair(ctx, head.c, head.r));
	if (has(parts, 'ears')) {
		out.push(stroke('ears', g.ellipse(-head.r * 1.02, head.c.y, head.r * 0.15, head.r * 0.22, 10), true));
		out.push(stroke('ears', g.ellipse(head.r * 1.02, head.c.y, head.r * 0.15, head.r * 0.22, 10), true));
	}

	// 3. trunk, by figure type
	let hip = g.pt(0, headH * 0.96);
	let shoulderY = head.c.y + head.r * 0.25;
	let shoulderX = head.r * 0.95;
	const keepTrunk = has(parts, 'trunk', 'body') && !tadpole;
	if (keepTrunk && type === 'transitional') {
		if (rng.chance(TRUNK_LOOP_CHANCE)) {
			const th = rest * 0.32;
			out.push(stroke('trunk', g.lumpyLoop(0, headH + th / 2, headR * 0.5, th / 2, rng, 0.1), true, false, true));
			hip = g.pt(0, headH + th);
		}
		// else: the "trunk" is the open space between the legs (spec §1.3)
	} else if (keepTrunk) {
		const th = rest * 0.48;
		const tw = headR * 0.75;
		const neck = has(parts, 'neck') ? rest * 0.06 : 0;
		if (neck) out.push(stroke('neck', g.line(g.pt(0, headH), g.pt(0, headH + neck))));
		const top = headH + neck;
		const dress = caps.shapes.includes('triangle') && rng.chance(DRESS_CHANCE);
		if (dress) out.push(stroke('trunk', g.triangle(g.pt(0, top), g.pt(tw * 1.25, top + th), g.pt(-tw * 1.25, top + th)), true, true, true));
		else if (caps.shapes.includes('square')) out.push(stroke('trunk', g.rect(-tw, top, tw * 2, th), true, true, true));
		else out.push(stroke('trunk', g.lumpyLoop(0, top + th / 2, tw, th / 2, rng, 0.08), true, false, true));
		hip = g.pt(0, top + th);
		shoulderY = top + th * 0.12;
		shoulderX = tw;
	}

	// 4. legs (from the loop for tadpoles, from the trunk otherwise)
	const legLen = HEIGHT - hip.y;
	const splay = rng.range(0.05, 0.25) * legLen;
	const legGap = tadpole ? head.r * 0.35 : Math.max(headR * 0.25, shoulderX * 0.45);
	const legEnds = [g.pt(-legGap - splay * 0.5, HEIGHT), g.pt(legGap + splay * 0.5, HEIGHT)];
	if (has(parts, 'legs')) {
		out.push(stroke('legs', g.line(g.pt(-legGap, hip.y), legEnds[0]!)));
		out.push(stroke('legs', g.line(g.pt(legGap, hip.y), legEnds[1]!)));
		if (has(parts, 'feet')) out.push(...feet(legEnds, unit, rng));
	}

	// 5. arms: stubby when adorable, sideways (no crossing the body: Goodnow's own space)
	const handPts: Point[] = [];
	if (has(parts, 'arms')) {
		const armLen = unit * (0.32 - 0.12 * adorable) * (tadpole ? 0.9 : 1);
		for (const side of [-1, 1]) {
			const from = g.pt(side * shoulderX, shoulderY);
			const angle = (side < 0 ? Math.PI : 0) + side * rng.range(-0.35, 0.45);
			const to = g.pt(from.x + Math.cos(angle) * armLen, from.y + Math.sin(angle) * armLen);
			out.push(stroke('arms', g.line(from, to)));
			handPts.push(to);
			if (has(parts, 'hands')) out.push(...hands(ctx, to, angle, unit));
		}
	}

	const anchors: Anchors = {
		top: g.pt(0, crownY(head.c, headR, adorable)),
		face: head,
		hands: handPts.length ? handPts : [g.pt(head.r * 1.3, head.c.y + head.r)],
		side: g.pt(Math.max(head.r, shoulderX) * 1.4, HEIGHT * 0.55),
		back: g.pt(0, hip.y - rest * 0.2),
		front: g.pt(head.r, head.c.y + head.r * 0.3),
		unit: headR * 1.4
	};

	// 6. everything else the scene asked for (glasses, bun, bag ...)
	for (const p of parts) if (!isCore(p)) out.push(...placeExtra(p, anchors, ctx));
	return { strokes: out, anchors };
}
