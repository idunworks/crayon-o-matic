/**
 * Draw a thing from its base form: the pieces whose part survived the budget, each as this
 * child can draw it, then a face if one was asked for, then any extras the scene added.
 */
import * as g from '../geometry.js';
import { pieceStrokes, type Form } from '../forms/pieces.js';
import type { Part } from '../types.js';
import { has, placeExtra, type Anchors, type BuildCtx, type Built, type LocalStroke } from './common.js';
import { face } from './face.js';

const FACE_PARTS = /^(face|eyes?|mouth|nose)$/i;
const key = (name: string): string => name.toLowerCase().replace(/s$/, '');

function anchorsFor(form: Form, strokes: readonly LocalStroke[]): Anchors {
	const b = strokes.length ? g.bbox(strokes.map((s) => s.path)) : { x: 0, y: 0, w: 100, h: 100 };
	const unit = Math.max(b.w, b.h) * 0.8;
	return {
		top: g.pt(b.x + b.w / 2, b.y),
		...(form.face ? { face: { c: g.pt(form.face.at[0], form.face.at[1]), r: form.face.r } } : {}),
		hands: [g.pt(b.x + b.w, b.y + b.h * 0.5)],
		side: g.pt(b.x + b.w * 1.15, b.y + b.h * 0.6),
		back: g.pt(b.x + b.w / 2, b.y + b.h * 0.2),
		front: g.pt(b.x + b.w, b.y + b.h * 0.4),
		unit
	};
}

export function formBuilder(form: Form, parts: readonly Part[], ctx: BuildCtx): Built {
	const kept = new Set(parts.map((p) => key(p.name)));
	const out: LocalStroke[] = form.pieces.filter((p) => kept.has(key(p.name))).flatMap((p) => pieceStrokes(p, ctx));
	const anchors = anchorsFor(form, out);
	if (form.face && has(parts, 'face', 'eyes', 'mouth')) {
		const c = g.pt(form.face.at[0], form.face.at[1]);
		out.push(...face(ctx, { c, r: form.face.r, eyes: has(parts, 'face', 'eyes'), mouth: has(parts, 'face', 'mouth'), nose: has(parts, 'nose') }));
	}
	const own = new Set(form.pieces.map((p) => key(p.name)));
	for (const p of parts) if (!own.has(key(p.name)) && !FACE_PARTS.test(p.name)) out.push(...placeExtra(p, anchors, ctx));
	return { strokes: out, anchors };
}
