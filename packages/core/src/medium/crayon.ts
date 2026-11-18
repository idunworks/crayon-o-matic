/**
 * [5] Medium: crayon (spec §4.5), kept print-friendly on purpose. Pure vector: no
 * filters, no transparency, only the palette's solid colours (owner, 2026-11-17: the
 * drawings go on tees as 1–3 colour vectors).
 *
 * The waxy look comes from geometry instead of raster effects:
 *   - pressure: the stroke is split into short runs, each with its own width
 *   - wax skipping: a second, thinner pass beside the line, broken into short dashes
 * Shadow and highlight (owner, 2026-11-17/18: "like a shadow", brutalist print style):
 *   2nd palette colour → the lines cast offset along shadowAngle × shadowLength, behind them,
 *                        but only from the edges facing away from the light (shadowCut)
 *   3rd palette colour → a thin copy from the light-facing edges, offset toward the light
 * Output: transparent background, one <g> per thing (its shadow inside it) so a designer
 * can move them.
 */
import { rngFor } from '../rng.js';
import { direction, facingRuns, facingThreshold, INNER_DETAIL } from './shadow.js';
import type { Dials, Point, Stroke, StrokePlan } from '../types.js';

/** Points per width run (tuned). */
const RUN = 10;
/** Second wax pass: width share and sideways offset as a share of width (tuned). */
const WAX_WIDTH = 0.55;
const WAX_OFFSET = 0.32;
/** The highlight is a thinner line than the drawing's (tuned). */
const HIGHLIGHT_WIDTH = 0.6;

const f = (n: number): string => (Math.round(n * 100) / 100).toString();

function d(points: readonly Point[]): string {
	return points.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join('');
}

function offset(points: readonly Point[], by: number): Point[] {
	return points.map((p, i) => {
		const a = points[Math.max(0, i - 1)]!;
		const b = points[Math.min(points.length - 1, i + 1)]!;
		const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
		return { x: p.x - ((b.y - a.y) / len) * by, y: p.y + ((b.x - a.x) / len) * by };
	});
}

function strokeSvg(s: Stroke, dials: Dials): string {
	if (s.points.length < 2) return '';
	const rng = rngFor(dials.seed, `medium/${s.key}`);
	const parts: string[] = [];
	for (let i = 0; i < s.points.length - 1; i += RUN) {
		const run = s.points.slice(i, Math.min(s.points.length, i + RUN + 1));
		const ws = s.widths.slice(i, i + run.length);
		const w = ws.reduce((a, b) => a + b, 0) / ws.length;
		parts.push(`<path d="${d(run)}" stroke-width="${f(w)}"/>`);
	}
	const avg = s.widths.reduce((a, b) => a + b, 0) / s.widths.length;
	if (s.kind !== 'fill') {
		const dash = Array.from({ length: 4 }, () => `${f(rng.range(2.5, 9))} ${f(rng.range(0.8, 3))}`).join(' ');
		parts.push(`<path d="${d(offset(s.points, avg * WAX_OFFSET * rng.sign()))}" stroke-width="${f(avg * WAX_WIDTH)}" stroke-dasharray="${dash}"/>`);
	}
	return `<g stroke="${s.colour}">${parts.join('')}</g>`;
}

/** One stroke's cast copy: only the runs that face `dir`, as plain solid paths. */
function castSvg(s: Stroke, dir: { x: number; y: number }, threshold: number, colour: string, widthScale: number): string {
	const avg = s.widths.reduce((a, b) => a + b, 0) / s.widths.length;
	return facingRuns(s.points, s.closed, dir, threshold)
		.map((run) => `<path d="${d(run)}" stroke="${colour}" stroke-width="${f(avg * widthScale)}"/>`)
		.join('');
}

interface Cast {
	cls: 'shadow' | 'highlight';
	colour: string | undefined;
	angle: number;
	length: number;
	cut: number;
	widthScale: number;
}

/** One cast layer (shadow or highlight) for a thing; empty when it's switched off. */
function castLayer(list: readonly Stroke[], c: Cast): string {
	if (!c.colour || c.length <= 0) return '';
	const threshold = facingThreshold(c.cut);
	// inner details (eyes, mouth ...) cast nothing unless every line is cast
	const casters = list.filter((s) => s.kind !== 'fill' && (c.cut === 0 || !INNER_DETAIL.test(s.part)));
	const dir = direction(c.angle);
	const body = casters.map((s) => castSvg(s, dir, threshold, c.colour!, c.widthScale)).join('');
	return `<g class="${c.cls}" transform="translate(${f(dir.x * c.length)} ${f(dir.y * c.length)})">${body}</g>`;
}

/**
 * The thing's lines, plus its shadow (2nd palette colour) and highlight (3rd), each cast
 * from the edges facing its own direction. Order, back to front: shadow, highlight, lines.
 */
function thingSvg(list: readonly Stroke[], dials: Dials): string {
	const lines = list.map((s) => strokeSvg(s, dials)).join('');
	if (dials.lineOnly) return lines;
	const [, shadow, highlight] = dials.palette;
	return [
		castLayer(list, { cls: 'shadow', colour: shadow, angle: dials.shadowAngle, length: dials.shadowLength, cut: dials.shadowCut, widthScale: 1 }),
		castLayer(list, { cls: 'highlight', colour: highlight, angle: dials.highlightAngle, length: dials.highlightLength, cut: dials.highlightCut, widthScale: HIGHLIGHT_WIDTH }),
		lines
	].join('');
}

export function crayonSvg(plan: StrokePlan, strokes: readonly Stroke[], dials: Dials): string {
	const { w, h } = plan.page;
	const byThing = new Map<string, Stroke[]>();
	for (const s of strokes) byThing.set(s.thing, [...(byThing.get(s.thing) ?? []), s]);
	const groups = [...byThing.entries()].map(([thing, list]) => {
		const label = plan.things.find((t) => t.id === thing)?.label ?? thing;
		const safeId = thing.replace(/[^a-zA-Z0-9_-]/g, '-');
		const safeLabel = label.replace(/[<>&"]/g, '');
		return `<g id="thing-${safeId}" data-label="${safeLabel}">${thingSvg(list, dials)}</g>`;
	});
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">`,
		`<g fill="none" stroke-linecap="round" stroke-linejoin="round">`,
		...groups,
		`</g></svg>`
	].join('');
}
