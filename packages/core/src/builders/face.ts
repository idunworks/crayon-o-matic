/**
 * Faces in a child's vocabulary (spec §4.7). `expressionSkill` gates what shows:
 *   0 mouth only · 1 + eye shape · 2 + brows sometimes · 3 + brows, tears, steam.
 * An expression the child "can't do yet" still comes through, crudely: a furious
 * 3-year-old is a zigzag mouth. Default is a smile (spec §1.3).
 */
import * as g from '../geometry.js';
import type { Point } from '../types.js';
import { stroke, type BuildCtx, type LocalStroke } from './common.js';

/** Chance of brows at skill 2, "sometimes" (spec §3; tuned). */
const BROWS_SOMETIMES = 0.5;
/**
 * An eye dot is a tight spiral: enough points to read round, not polygonal, and enough turns
 * that the crayon fills it in solid (tuned).
 */
const DOT_POINTS = 34;
const DOT_TURNS = 2.6;
const EYE_LOOP_POINTS = 26;
/**
 * Adorable (owner, 2026-11-18): instead of moving eyes, nose and mouth down, the forehead
 * grows higher and rounder. The face stays put, so it ends up low on the head, same effect.
 * At adorable 1 the crown rises this share of the radius, and the upper head widens this much.
 */
const FOREHEAD_LIFT = 0.45;
const FOREHEAD_BULGE = 0.08;
/** How much squarer than an ellipse the dome gets at adorable 1 (superellipse exponent 2 + this). */
const FOREHEAD_SQUARE = 1;

/**
 * A head's upper half, raised and rounded by adorable. Points below the centre are untouched.
 * The dome is a superellipse: stretching an ellipse up alone gives a lemon, so its shoulders
 * are filled out too, which keeps the crown round and broad.
 */
export function forehead(points: readonly Point[], c: Point, r: number, adorable: number): Point[] {
	const lift = 1 + FOREHEAD_LIFT * adorable;
	const widen = 1 + FOREHEAD_BULGE * adorable;
	const power = 2 / (2 + FOREHEAD_SQUARE * adorable);
	return points.map((p) => {
		if (p.y >= c.y) return { ...p };
		const u = (p.x - c.x) / r;
		const v = (c.y - p.y) / r;
		const f = Math.hypot(u, v);
		if (f === 0) return { ...p };
		const a = Math.atan2(v, u);
		const cu = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** power;
		const sv = Math.abs(Math.sin(a)) ** power;
		return { x: c.x + cu * f * r * widen, y: c.y - sv * f * r * lift };
	});
}

/** The y of the crown after the forehead grew. */
export function crownY(c: Point, r: number, adorable: number): number {
	return c.y - r * (1 + FOREHEAD_LIFT * adorable);
}

export interface FaceOptions {
	c: Point;
	/** Head radius. */
	r: number;
	eyes: boolean;
	mouth: boolean;
	nose: boolean;
	/** Side-on head: one eye, mouth at the front edge. */
	side?: 'left' | 'right';
}

function dot(part: string, x: number, y: number, r: number): LocalStroke {
	return stroke(part, g.spiral(x, y, Math.max(1.2, r), DOT_TURNS, DOT_POINTS));
}

function eyes(ctx: BuildCtx, o: FaceOptions): LocalStroke[] {
	const { c, r } = o;
	const skill = ctx.caps.expressionSkill;
	const spread = r * (0.32 + 0.14 * ctx.adorable);
	const er = r * (0.09 + 0.07 * ctx.adorable);
	const y = c.y - r * 0.18;
	const xs = o.side ? [c.x + (o.side === 'right' ? r * 0.35 : -r * 0.35)] : [c.x - spread, c.x + spread];
	const e = ctx.expression;
	if (skill < 1) return xs.map((x) => dot('eyes', x, y, er));
	switch (e) {
		case 'laughing':
			return xs.map((x) => stroke('eyes', g.arc(x, y + er, er * 1.3, er * 1.3, Math.PI + 0.3, Math.PI * 2 - 0.3, 6)));
		case 'meh':
			return xs.flatMap((x) => [stroke('eyes', g.line(g.pt(x - er * 1.3, y - er * 0.2), g.pt(x + er * 1.3, y - er * 0.2))), dot('eyes', x, y + er * 0.4, er * 0.6)]);
		case 'scared':
		case 'surprised':
			return xs.flatMap((x) => [stroke('eyes', g.ellipse(x, y, er * 2, er * 2.2, EYE_LOOP_POINTS), true), dot('eyes', x, y, er * 0.6)]);
		case 'sad':
		case 'frowned':
			return xs.map((x) => stroke('eyes', g.arc(x, y - er, er * 1.2, er, 0.3, Math.PI - 0.3, 6)));
		case 'smirk':
			// half-lidded: a flat lid across the top of each eye
			return xs.flatMap((x) => [stroke('eyes', g.line(g.pt(x - er * 1.5, y - er * 0.5), g.pt(x + er * 1.5, y - er * 0.5))), dot('eyes', x, y + er * 0.3, er * 0.7)]);
		case 'furious':
			// small dots close together
			return (o.side ? xs : [c.x - spread * 0.6, c.x + spread * 0.6]).map((x) => dot('eyes', x, y, er * 0.8));
		default:
			return xs.map((x) => dot('eyes', x, y, er));
	}
}

/** A lopsided mouth: flat on one side, curling up at the other end. */
function smirk(cx: number, cy: number, w: number, side: 1 | -1): Point[] {
	const n = 10;
	return Array.from({ length: n + 1 }, (_, i) => {
		const t = i / n;
		const lift = Math.max(0, t - 0.55) / 0.45;
		return g.pt(cx + side * (-w * 0.7 + w * 1.5 * t), cy + w * 0.08 - lift * lift * w * 0.45);
	});
}

function mouth(ctx: BuildCtx, o: FaceOptions): LocalStroke[] {
	const { r } = o;
	const cx = o.side ? o.c.x + (o.side === 'right' ? r * 0.55 : -r * 0.55) : o.c.x;
	const cy = o.c.y + r * 0.35;
	const w = r * (o.side ? 0.3 : 0.5);
	const skill = ctx.caps.expressionSkill;
	switch (ctx.expression) {
		case 'sad':
		case 'frowned':
			return [stroke('mouth', g.arc(cx, cy + w * 0.6, w, w * 0.6, Math.PI + 0.4, Math.PI * 2 - 0.4, 10))];
		case 'furious': {
			const teeth = skill >= 2 ? 4 : 3;
			return [stroke('mouth', g.zigzag(g.pt(cx - w, cy), g.pt(cx + w, cy), teeth, w * 0.35), false, true)];
		}
		case 'laughing': {
			const open = stroke('mouth', g.ellipse(cx, cy, w, w * 0.75, 18), true);
			if (skill < 2) return [open];
			return [open, stroke('mouth', g.zigzag(g.pt(cx - w * 0.8, cy - w * 0.25), g.pt(cx + w * 0.8, cy - w * 0.25), 3, w * 0.2), false, true)];
		}
		case 'meh':
			return [stroke('mouth', g.line(g.pt(cx - w * 0.6 + r * 0.08, cy), g.pt(cx + w * 0.6 + r * 0.08, cy)))];
		case 'smirk':
			return [stroke('mouth', smirk(cx, cy, w, o.side === 'left' ? -1 : 1))];
		case 'scared':
			return [stroke('mouth', g.ellipse(cx, cy, w * 0.25, w * 0.3, 12), true)];
		case 'surprised':
			return [stroke('mouth', g.ellipse(cx, cy, w * 0.45, w * 0.55, 14), true)];
		default:
			// happy / none: a big U, wonkier with adorable
			return [stroke('mouth', g.arc(cx + ctx.adorable * r * 0.06, cy - w * 0.3, w, w * 0.8, 0.25, Math.PI - 0.25, 12))];
	}
}

function brows(ctx: BuildCtx, o: FaceOptions): LocalStroke[] {
	const skill = ctx.caps.expressionSkill;
	if (skill < 2 || o.side) return [];
	if (skill === 2 && !ctx.rng.chance(BROWS_SOMETIMES)) return [];
	const { c, r } = o;
	const y = c.y - r * 0.42;
	const s = r * 0.3;
	const e = ctx.expression;
	const pair = (inner: number, outer: number) => [
		stroke('brows', g.line(g.pt(c.x - s * 0.4, y + inner), g.pt(c.x - s * 1.6, y + outer))),
		stroke('brows', g.line(g.pt(c.x + s * 0.4, y + inner), g.pt(c.x + s * 1.6, y + outer)))
	];
	if (e === 'furious' || e === 'frowned') return pair(s * 0.35, -s * 0.25); // V
	if (e === 'sad') return pair(-s * 0.3, s * 0.2);
	if (e === 'surprised') return pair(-s * 0.4, -s * 0.4);
	if (e === 'smirk') {
		// one brow flat, the other cocked up
		return [stroke('brows', g.line(g.pt(c.x - s * 1.6, y + s * 0.1), g.pt(c.x - s * 0.4, y + s * 0.1))), stroke('brows', g.line(g.pt(c.x + s * 0.4, y), g.pt(c.x + s * 1.6, y - s * 0.45)))];
	}
	return [];
}

function extras(ctx: BuildCtx, o: FaceOptions): LocalStroke[] {
	if (ctx.caps.expressionSkill < 3) return [];
	const { c, r } = o;
	switch (ctx.expression) {
		case 'sad':
			return [stroke('tear', g.ellipse(c.x - r * 0.38, c.y + r * 0.08, r * 0.06, r * 0.1, 10), true)];
		case 'furious':
			return [
				stroke('steam', g.spiral(c.x - r * 1.15, c.y - r * 0.9, r * 0.2, 1.5, 14)),
				stroke('steam', g.spiral(c.x + r * 1.15, c.y - r * 0.9, r * 0.2, 1.5, 14)),
				stroke('cheeks', g.scribbleCluster(c.x - r * 0.55, c.y + r * 0.15, r * 0.14, ctx.rng, 2)),
				stroke('cheeks', g.scribbleCluster(c.x + r * 0.55, c.y + r * 0.15, r * 0.14, ctx.rng, 2))
			];
		case 'laughing':
			return [stroke('tear', g.line(g.pt(c.x - r * 0.5, c.y - r * 0.1), g.pt(c.x - r * 0.8, c.y - r * 0.3)))];
		case 'happy':
			return [dot('cheeks', c.x - r * 0.55, c.y + r * 0.15, r * 0.05), dot('cheeks', c.x + r * 0.55, c.y + r * 0.15, r * 0.05)];
		default:
			return [];
	}
}

/** The face, in drawing order: eyes, mouth, nose, then brows and extras. */
export function face(ctx: BuildCtx, o: FaceOptions): LocalStroke[] {
	const out: LocalStroke[] = [];
	if (o.eyes) out.push(...eyes(ctx, o));
	if (o.mouth) out.push(...mouth(ctx, o));
	if (o.nose) {
		const nx = o.side ? o.c.x + (o.side === 'right' ? o.r * 0.75 : -o.r * 0.75) : o.c.x;
		out.push(dot('nose', nx, o.c.y + o.r * 0.06, o.r * 0.05));
	}
	if (o.eyes) out.push(...brows(ctx, o));
	if (o.mouth) out.push(...extras(ctx, o));
	return out;
}

