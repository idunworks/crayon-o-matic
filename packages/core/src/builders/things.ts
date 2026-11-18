/**
 * Everything that isn't a person or an animal. Known part names get their usual
 * place (a house's roof goes on top); anything else lands at an anchor via placeExtra.
 */
import * as g from '../geometry.js';
import type { Part } from '../types.js';
import { canDraw, drawPrimitive, has, placeExtra, pointyLoop, stroke, type Anchors, type BuildCtx, type Built, type LocalStroke } from './common.js';
import { face } from './face.js';

function finish(parts: readonly Part[], core: RegExp, out: LocalStroke[], anchors: Anchors, ctx: BuildCtx): Built {
	for (const p of parts) if (!core.test(p.name)) out.push(...placeExtra(p, anchors, ctx));
	return { strokes: out, anchors };
}

const HOUSE = /^(walls?|body|roof|door|windows?|chimney|smoke|face|eyes?|mouth)$/i;

export function house(parts: readonly Part[], ctx: BuildCtx): Built {
	const { rng, caps } = ctx;
	const out: LocalStroke[] = [];
	const w = 80;
	const h = 60;
	const top = 45;
	if (has(parts, 'walls', 'body')) {
		out.push(canDraw('box', caps)
			? stroke('walls', g.rect(-w / 2, top, w, h), true, true, true)
			: stroke('walls', g.lumpyLoop(0, top + h / 2, w / 2, h / 2, rng, 0.06), true, false, true));
	}
	if (has(parts, 'roof')) {
		if (canDraw('triangle', caps)) out.push(stroke('roof', g.triangle(g.pt(-w / 2 - 6, top), g.pt(0, top - 42), g.pt(w / 2 + 6, top)), true, true, true));
		else out.push(stroke('roof', pointyLoop(0, top - 12, w * 0.42, -Math.PI / 2), true, false, true));
	}
	if (has(parts, 'door')) out.push(...drawPrimitive({ name: 'door', primitive: 'tab' }, rng.range(-12, 12), top + h - 15, 22, ctx));
	if (has(parts, 'windows')) {
		for (const x of [-w * 0.3, w * 0.3]) {
			out.push(...drawPrimitive({ name: 'windows', primitive: 'box' }, x, top + h * 0.3, 18, ctx));
			if (canDraw('cross', caps)) out.push(...drawPrimitive({ name: 'windows', primitive: 'cross' }, x, top + h * 0.28, 15, ctx));
		}
	}
	if (has(parts, 'chimney')) out.push(...drawPrimitive({ name: 'chimney', primitive: 'tab' }, w * 0.25, top - 22, 16, ctx));
	if (has(parts, 'smoke')) out.push(stroke('smoke', g.spiral(w * 0.3, top - 50, 9, 2)));
	if (has(parts, 'face')) out.push(...face(ctx, { c: g.pt(0, top + h * 0.45), r: w * 0.3, eyes: true, mouth: true, nose: false }));
	const anchors: Anchors = { top: g.pt(0, top - 42), hands: [g.pt(w / 2 + 4, top + h * 0.5)], side: g.pt(w / 2 + 14, top + h * 0.6), front: g.pt(w / 2, top + h / 2), unit: w * 0.6 };
	return finish(parts, HOUSE, out, anchors, ctx);
}

const VEHICLE = /^(body|wheels?|windows?|door|lights?|face|eyes?|mouth|roof)$/i;

export function vehicle(parts: readonly Part[], ctx: BuildCtx): Built {
	const { rng, caps } = ctx;
	const out: LocalStroke[] = [];
	if (has(parts, 'body')) {
		out.push(canDraw('box', caps)
			? stroke('body', g.rect(-55, 30, 110, 34), true, true, true)
			: stroke('body', g.lumpyLoop(0, 47, 56, 20, rng, 0.06), true, false, true));
	}
	if (has(parts, 'roof')) out.push(stroke('roof', g.arc(0, 32, 30, 22, Math.PI, Math.PI * 2, 12)));
	if (has(parts, 'wheels')) for (const x of [-32, 32]) out.push(stroke('wheels', g.lumpyLoop(x, 68, 13, 13, rng, 0.05), true, false, true));
	if (has(parts, 'windows')) out.push(...drawPrimitive({ name: 'windows', primitive: 'box' }, 8, 22, 18, ctx));
	if (has(parts, 'lights')) out.push(stroke('lights', g.spiral(52, 42, 4, 1.5, 8)));
	if (has(parts, 'face')) out.push(...face(ctx, { c: g.pt(34, 44), r: 14, eyes: true, mouth: true, nose: false }));
	const anchors: Anchors = { top: g.pt(0, 10), hands: [g.pt(58, 40)], side: g.pt(-64, 40), back: g.pt(0, 30), front: g.pt(58, 45), unit: 50 };
	return finish(parts, VEHICLE, out, anchors, ctx);
}

const TREE = /^(trunk|crown|leaves|apples?|fruit|branch(es)?|face|eyes?|mouth)$/i;

export function tree(parts: readonly Part[], ctx: BuildCtx): Built {
	const { rng } = ctx;
	const out: LocalStroke[] = [];
	if (has(parts, 'trunk')) out.push(stroke('trunk', g.tab(-9, 60, 18, 60), false, true));
	if (has(parts, 'crown', 'leaves')) out.push(stroke('crown', g.cloudLoop(0, 38, 38, 30, 5), true, false, true));
	if (has(parts, 'branches', 'branch')) out.push(stroke('branches', g.line(g.pt(0, 75), g.pt(22, 58))));
	if (has(parts, 'apples', 'fruit')) for (let i = 0; i < 4; i++) out.push(stroke('apples', g.lumpyLoop(rng.range(-25, 25), rng.range(20, 55), 4, 4, rng, 0.05, 10), true));
	if (has(parts, 'face')) out.push(...face(ctx, { c: g.pt(0, 38), r: 22, eyes: true, mouth: true, nose: false }));
	const anchors: Anchors = { top: g.pt(0, 4), hands: [g.pt(30, 60)], side: g.pt(44, 80), back: g.pt(0, 10), front: g.pt(38, 40), unit: 40 };
	return finish(parts, TREE, out, anchors, ctx);
}

const FLOWER = /^(stem|petals?|middle|centre|center|leaf|leaves|face|eyes?|mouth)$/i;

export function flower(parts: readonly Part[], ctx: BuildCtx): Built {
	const { rng } = ctx;
	const out: LocalStroke[] = [];
	const c = g.pt(0, 28);
	if (has(parts, 'middle', 'centre', 'center')) out.push(stroke('middle', g.lumpyLoop(c.x, c.y, 9, 9, rng, 0.05, 16), true, false, true));
	if (has(parts, 'petals')) {
		const n = rng.int(5, 8);
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2;
			out.push(stroke('petals', g.ellipse(c.x + Math.cos(a) * 18, c.y + Math.sin(a) * 18, 9, 9, 12), true, false, true));
		}
	}
	if (has(parts, 'stem')) out.push(stroke('stem', g.line(g.pt(c.x, c.y + 26), g.pt(c.x + rng.range(-4, 4), 110))));
	if (has(parts, 'leaf', 'leaves')) out.push(stroke('leaf', g.ellipse(c.x + 12, 80, 11, 5, 12), true, false, true));
	if (has(parts, 'face')) out.push(...face(ctx, { c, r: 9, eyes: true, mouth: true, nose: false }));
	const anchors: Anchors = { top: g.pt(0, 0), hands: [g.pt(16, 80)], side: g.pt(28, 90), front: g.pt(28, 28), unit: 26 };
	return finish(parts, FLOWER, out, anchors, ctx);
}

const SUN = /^(disc|body|circle|rays?|face|eyes?|mouth|nose)$/i;

export function sun(parts: readonly Part[], ctx: BuildCtx): Built {
	const { rng } = ctx;
	const out: LocalStroke[] = [];
	const c = g.pt(0, 0);
	const r = 22;
	out.push(stroke('disc', g.lumpyLoop(c.x, c.y, r, r, rng, 0.05), true, false, true));
	if (has(parts, 'rays')) for (const p of g.rays(c.x, c.y, r * 1.2, r * 1.9, rng.int(7, 12), rng.range(0, 1))) out.push(stroke('rays', p));
	if (has(parts, 'face', 'eyes', 'mouth')) out.push(...face(ctx, { c, r, eyes: has(parts, 'face', 'eyes'), mouth: has(parts, 'face', 'mouth'), nose: has(parts, 'nose') }));
	const anchors: Anchors = { top: g.pt(0, -r), face: { c, r }, hands: [g.pt(r * 1.5, 0)], side: g.pt(r * 2.2, 0), front: g.pt(r, 0), unit: r * 1.4 };
	return finish(parts, SUN, out, anchors, ctx);
}

export function cloud(parts: readonly Part[], ctx: BuildCtx): Built {
	const out: LocalStroke[] = [stroke('cloud', g.cloudLoop(0, 0, 40, 18, 5), true, false, true)];
	if (has(parts, 'rain')) for (let i = 0; i < 5; i++) out.push(stroke('rain', g.line(g.pt(-28 + i * 14, 24), g.pt(-31 + i * 14, 36))));
	if (has(parts, 'face', 'eyes', 'mouth')) out.push(...face(ctx, { c: g.pt(0, 0), r: 15, eyes: true, mouth: true, nose: false }));
	const anchors: Anchors = { top: g.pt(0, -20), hands: [g.pt(42, 0)], side: g.pt(50, 0), unit: 30 };
	return finish(parts, /^(cloud|body|rain|face|eyes?|mouth)$/i, out, anchors, ctx);
}

/** Food, objects and blobs: a main loop (or the first part's shape) plus the listed parts around it. */
export function blob(parts: readonly Part[], ctx: BuildCtx): Built {
	const { rng } = ctx;
	const out: LocalStroke[] = [];
	const [first, ...rest] = parts;
	if (first) out.push(...drawPrimitive(first, 0, 30, 60, ctx));
	const anchors: Anchors = { top: g.pt(0, 0), face: { c: g.pt(0, 30), r: 26 }, hands: [g.pt(34, 34)], side: g.pt(38, 30), back: g.pt(0, 4), front: g.pt(32, 30), unit: 40 };
	for (const p of rest) {
		if (/^(face|eyes?|mouth)$/i.test(p.name)) {
			if (/^(face|eyes?)$/i.test(p.name)) out.push(...face(ctx, { c: g.pt(0, 30), r: 26, eyes: true, mouth: /face/i.test(p.name), nose: false }));
			else out.push(...face(ctx, { c: g.pt(0, 30), r: 26, eyes: false, mouth: true, nose: false }));
			continue;
		}
		const spot = rng.range(0, Math.PI * 2);
		const inside = p.primitive === 'dots' || p.primitive === 'dot' || p.primitive === 'scribble-fill' || p.primitive === 'zigzag';
		const rad = inside ? rng.range(5, 16) : 40;
		out.push(...drawPrimitive(p, Math.cos(spot) * rad, 30 + Math.sin(spot) * rad * 0.8, inside ? 14 : 22, ctx, spot));
	}
	return { strokes: out, anchors };
}
