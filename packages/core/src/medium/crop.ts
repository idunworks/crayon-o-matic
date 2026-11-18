/**
 * The drawing cropped to what's on the paper: lines, plus where the shadow and highlight
 * fall, plus a margin. For printing (a tee wants the drawing, not the empty paper around it).
 */
import { direction } from './shadow.js';
import type { Dials, Stroke } from '../types.js';

/** Margin around the drawing, in page units (mm). */
const PRINT_MARGIN = 4;

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** Bounding box of the lines and their cast copies; null for an empty drawing. */
export function contentBox(strokes: readonly Stroke[], dials: Dials, margin = PRINT_MARGIN): Box | null {
	const pts = strokes.flatMap((s) => s.points);
	if (pts.length === 0) return null;
	const widest = Math.max(...strokes.flatMap((s) => s.widths), 0);
	let x0 = Math.min(...pts.map((p) => p.x));
	let y0 = Math.min(...pts.map((p) => p.y));
	let x1 = Math.max(...pts.map((p) => p.x));
	let y1 = Math.max(...pts.map((p) => p.y));
	if (!dials.lineOnly) {
		const [, shadow, highlight] = dials.palette;
		const casts = [shadow ? { a: dials.shadowAngle, l: dials.shadowLength } : null, highlight ? { a: dials.highlightAngle, l: dials.highlightLength } : null];
		for (const c of casts) {
			if (!c || c.l <= 0) continue;
			const d = direction(c.a);
			x0 = Math.min(x0, x0 + d.x * c.l);
			x1 = Math.max(x1, x1 + d.x * c.l);
			y0 = Math.min(y0, y0 + d.y * c.l);
			y1 = Math.max(y1, y1 + d.y * c.l);
		}
	}
	const pad = margin + widest / 2;
	const r = (n: number) => Math.round(n * 100) / 100;
	return { x: r(x0 - pad), y: r(y0 - pad), w: r(x1 - x0 + 2 * pad), h: r(y1 - y0 + 2 * pad) };
}

/** The same SVG with its viewBox and size set to the content box. */
export function cropSvg(svg: string, box: Box | null): string {
	if (!box) return svg;
	return svg.replace(/^<svg ([^>]*)>/, (_m, attrs: string) => {
		const rest = attrs.replace(/\s*(viewBox|width|height)="[^"]*"/g, '');
		return `<svg ${rest} viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}mm" height="${box.h}mm">`;
	});
}
