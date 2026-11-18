import { describe, expect, it } from 'vitest';
import { cleanSketch, drawFreehand, MAX_SKETCH_STROKES, type Sketch } from '../src/freehand.js';
import { ellipse } from '../src/geometry.js';
import { MAX_POINTS } from '../src/hand.js';
import type { Point } from '../src/types.js';

const page = { w: 300, h: 400 };
const line = (n = 40): Point[] => Array.from({ length: n }, (_, i) => ({ x: 40 + i * 5, y: 200 }));
const sketch = (...strokes: Point[][]): Sketch => ({ page, strokes: strokes.map((points) => ({ points })) });

/** Mean distance of a stroke's points from the horizontal line y = 200. */
const offLine = (pts: readonly Point[]): number => pts.reduce((m, p) => m + Math.abs(p.y - 200), 0) / pts.length;

describe('freehand', () => {
	it('kidify 0 keeps your lines exactly as drawn, at one even width', () => {
		const drawn = line();
		const out = drawFreehand(sketch(drawn), { age: 3, shakiness: 1 }, 0).strokes[0]!;
		expect(out.points).toEqual(drawn);
		expect(new Set(out.widths).size).toBe(1);
	});

	it('kid-ifying moves the line off where you drew it, more at a higher degree', () => {
		const dials = { age: 3.5, seed: 4 };
		const some = offLine(drawFreehand(sketch(line()), dials, 0.3).strokes[0]!.points);
		const full = offLine(drawFreehand(sketch(line()), dials, 1).strokes[0]!.points);
		expect(some).toBeGreaterThan(0);
		expect(full).toBeGreaterThan(some * 1.5);
	});

	it('shakiness 0 keeps a kid-ified line on its path (only the ends change)', () => {
		const out = drawFreehand(sketch(line()), { shakiness: 0 }, 1).strokes[0]!.points;
		const inner = out.slice(Math.floor(out.length * 0.15), Math.ceil(out.length * 0.85));
		expect(Math.max(...inner.map((p) => Math.abs(p.y - 200)))).toBeLessThan(0.5);
	});

	it('is deterministic for the same sketch, dials and seed', () => {
		const a = drawFreehand(sketch(line(), ellipse(150, 120, 40, 30, 40)), { seed: 9 }, 0.7);
		const b = drawFreehand(sketch(line(), ellipse(150, 120, 40, 30, 40)), { seed: 9 }, 0.7);
		expect(a.svg).toBe(b.svg);
	});

	it('a loop you closed counts as closed', () => {
		const out = drawFreehand(sketch(ellipse(150, 120, 40, 30, 40), line()), {}, 0).strokes;
		expect(out.map((s) => s.closed)).toEqual([true, false]);
	});

	it('casts the shadow and highlight on a freehand drawing too', () => {
		const { svg } = drawFreehand(sketch(ellipse(150, 120, 40, 30, 40)), { palette: ['#111111', '#c8c2b4', '#f4c430'] }, 0);
		expect(svg).toContain('class="shadow"');
		expect(svg).toContain('stroke="#c8c2b4"');
		expect(svg).toContain('stroke="#f4c430"');
	});

	it('drops broken input and bounds the work', () => {
		const bad = { page: { w: -1, h: Number.NaN }, strokes: [{ points: [{ x: 1, y: 2 }] }, { points: [{ x: Number.NaN, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }] }, null as never] };
		const clean = cleanSketch(bad);
		expect(clean.page).toEqual(page);
		expect(clean.strokes).toHaveLength(1);
		expect(clean.strokes[0]!.points).toHaveLength(2);

		const huge = Array.from({ length: 5000 }, (_, i) => ({ x: i * 0.05, y: 10 }));
		expect(cleanSketch(sketch(huge)).strokes[0]!.points.length).toBeLessThanOrEqual(MAX_POINTS);
		const many = Array.from({ length: MAX_SKETCH_STROKES + 50 }, () => line(3));
		expect(cleanSketch(sketch(...many)).strokes).toHaveLength(MAX_SKETCH_STROKES);
	});

	it('an empty sketch is an empty page, not an error', () => {
		const { svg, strokes } = drawFreehand(sketch(), {}, 0.5);
		expect(strokes).toEqual([]);
		expect(svg).toContain('viewBox="0 0 300 400"');
	});
});
