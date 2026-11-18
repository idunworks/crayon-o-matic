/**
 * Base forms (owner, 2026-11-18: "a ruleset with more base forms"): a thing drawn from a few
 * pieces placed in a 100 × 100 box, y down. A form is plain data, so new things are added
 * without code, and the age model still decides which pieces survive and how well each
 * shape comes out (a 3-year-old's box is a loop, a 4-year-old's star is a spiky asterisk).
 */
import * as g from '../geometry.js';
import { canDraw, pointyLoop, simplify, stroke, type BuildCtx, type LocalStroke } from '../builders/common.js';
import type { Point, Primitive } from '../types.js';

export const PIECE_SHAPES = [
	'loop',
	'box',
	'triangle',
	'line',
	'wave',
	'zigzag',
	'arc',
	'U',
	'dots',
	'rays',
	'spiral',
	'scribble',
	'heart',
	'star',
	'crescent',
	'cross',
	'tab'
] as const;
export type PieceShape = (typeof PIECE_SHAPES)[number];

export interface FormPiece {
	/** Part name: what a child calls it, and what the part budget keeps or drops. */
	name: string;
	shape: PieceShape;
	/** Centre, or the start of a line, wave or zigzag. */
	at: readonly [number, number];
	/** Width and height (lines: [_, amplitude]). */
	size?: readonly [number, number];
	/** End of a line, wave or zigzag. */
	to?: readonly [number, number];
	/** Dots, rays, zigzag teeth, wave cycles. */
	count?: number;
	/** Where a triangle points, in degrees (-90 up, 90 down). */
	dir?: number;
}

export interface Form {
	/** The form's own name, also its first motif word. */
	name: string;
	/** Other motif words that pick it. */
	words?: readonly string[];
	pieces: readonly FormPiece[];
	/** Where a face goes if the child adds one (kids put faces on everything). */
	face?: { at: readonly [number, number]; r: number };
	/** A colour a child would reach for. */
	colourIdea?: string;
}

/** The primitive a piece shape counts as, for the part list and the age model. */
export const PRIMITIVE_OF: Record<PieceShape, Primitive> = {
	loop: 'loop',
	box: 'box',
	triangle: 'triangle',
	line: 'line',
	wave: 'zigzag',
	zigzag: 'zigzag',
	arc: 'arc',
	U: 'U',
	dots: 'dots',
	rays: 'rays',
	spiral: 'spiral',
	scribble: 'scribble-cluster',
	heart: 'heart',
	star: 'cross',
	crescent: 'loop',
	cross: 'cross',
	tab: 'tab'
};

/** Stars come late: children copy one around 5 (tuned; star needs crossing diagonals). */
const STAR_FROM_AGE = 5;

const P = (xy: readonly [number, number]): Point => g.pt(xy[0], xy[1]);

/**
 * A triangle as drawn before triangles: a loop with one end pulled to a point, keeping the
 * piece's proportions (a carrot stays long). Drawn round a unit circle, then stretched along
 * and across the pointing direction.
 */
function pointyBlob(x: number, y: number, w: number, h: number, dirDeg: number): Point[] {
	const a = (dirDeg * Math.PI) / 180;
	const along = (h / 2) * 0.85;
	const across = (w / 2) * 0.9;
	return pointyLoop(0, 0, 1, 0).map((p) => g.pt(x + Math.cos(a) * p.x * along - Math.sin(a) * p.y * across, y + Math.sin(a) * p.x * along + Math.cos(a) * p.y * across));
}

/** Area shapes, after the age model's simplification. */
function area(piece: FormPiece, prim: Primitive, ctx: BuildCtx): LocalStroke[] {
	const [x, y] = piece.at;
	const [w, h] = piece.size ?? [20, 20];
	const n = piece.name;
	const { rng } = ctx;
	switch (prim) {
		case 'box':
			return [stroke(n, g.rect(x - w / 2, y - h / 2, w, h), true, true, true)];
		case 'tab':
			return [stroke(n, g.tab(x - w / 2, y - h / 2, w, h), false, true)];
		case 'triangle': {
			const a = ((piece.dir ?? -90) * Math.PI) / 180;
			const ux = Math.cos(a);
			const uy = Math.sin(a);
			const tip = g.pt(x + ux * h / 2, y + uy * h / 2);
			const base = g.pt(x - ux * h / 2, y - uy * h / 2);
			return [stroke(n, g.triangle(tip, g.pt(base.x - uy * w / 2, base.y + ux * w / 2), g.pt(base.x + uy * w / 2, base.y - ux * w / 2)), true, true, true)];
		}
		case 'heart':
			return [stroke(n, g.heart(x, y, Math.min(w, h) / 2), true, false, true)];
		case 'spiral':
			return [stroke(n, g.spiral(x, y, Math.min(w, h) / 2, 2.5))];
		case 'scribble-cluster':
		case 'scribble-fill':
			return [stroke(n, g.scribbleCluster(x, y, Math.min(w, h) / 2, rng, 4))];
		case 'loop':
		default: {
			// a triangle or box the child can't make yet still means "pointy" or "boxy"
			if (piece.shape === 'triangle') return [stroke(n, pointyBlob(x, y, w, h, piece.dir ?? -90), true, false, true)];
			const lumps = piece.shape === 'box' ? 0.05 : 0.07;
			return [stroke(n, g.lumpyLoop(x, y, w / 2, h / 2, rng, lumps), true, false, w * h > 150)];
		}
	}
}

/** One piece → its strokes, as this child can draw it. */
export function pieceStrokes(piece: FormPiece, ctx: BuildCtx): LocalStroke[] {
	const n = piece.name;
	const [x, y] = piece.at;
	const [w, h] = piece.size ?? [20, 20];
	const { rng, caps } = ctx;
	const to = piece.to ? P(piece.to) : g.pt(x + w, y);
	switch (piece.shape) {
		case 'line':
			return [stroke(n, g.line(P(piece.at), to))];
		case 'wave':
			return [stroke(n, g.wave(P(piece.at), to, piece.count ?? 2, h))];
		case 'zigzag':
			if (!canDraw('zigzag', caps)) return [stroke(n, g.wave(P(piece.at), to, piece.count ?? 3, h))];
			return [stroke(n, g.zigzag(P(piece.at), to, piece.count ?? 4, h), false, true)];
		case 'arc':
			return [stroke(n, g.arc(x, y + h / 2, w / 2, h, Math.PI, Math.PI * 2, 16))];
		case 'U':
			return [stroke(n, g.arc(x, y - h / 2, w / 2, h, 0.1, Math.PI - 0.1, 14))];
		case 'dots': {
			const count = piece.count ?? 3;
			return Array.from({ length: count }, (_, i) => {
				const t = count === 1 ? 0.5 : i / (count - 1);
				return stroke(n, g.spiral(x - w / 2 + w * t + rng.range(-2, 2), y + rng.range(-h, h) * 0.4, 1.6, 2.6, 30));
			});
		}
		case 'rays':
			return g.rays(x, y, Math.min(w, h) * 0.2, Math.min(w, h) / 2, piece.count ?? 6, rng.range(0, 1)).map((p) => stroke(n, p));
		case 'cross':
			return [stroke(n, g.line(g.pt(x - w / 2, y), g.pt(x + w / 2, y))), stroke(n, g.line(g.pt(x, y - h / 2), g.pt(x, y + h / 2)))];
		case 'star':
			if (caps.age >= STAR_FROM_AGE) return [stroke(n, g.star(x, y, Math.min(w, h) / 2), true, true, true)];
			// before 5: an asterisk of crossing lines
			return g.rays(x, y, 0, Math.min(w, h) / 2, 5, -Math.PI / 2).map((p) => stroke(n, [g.pt(x, y), ...p.slice(1)]));
		case 'crescent':
			return [stroke(n, g.crescent(x, y, Math.min(w, h) / 2), true, false, true)];
		default:
			return area(piece, simplify(PRIMITIVE_OF[piece.shape], caps), ctx);
	}
}
