import { describe, expect, it } from 'vitest';
import { drawFreehand } from '../src/freehand.js';
import { contentBox, cropSvg } from '../src/medium/crop.js';

const sketch = { page: { w: 300, h: 400 }, strokes: [{ points: [{ x: 100, y: 100 }, { x: 150, y: 120 }] }] };

describe('crop for print', () => {
	it('boxes the lines plus the shadow cast and a margin', () => {
		const lines = drawFreehand(sketch, { palette: ['#111111'] }, 0);
		const shaded = drawFreehand(sketch, { palette: ['#111111', '#cccccc'], shadowAngle: 0, shadowLength: 10 }, 0);
		const a = contentBox(lines.strokes, lines.dials)!;
		const b = contentBox(shaded.strokes, shaded.dials)!;
		expect(a.x).toBeLessThan(100);
		expect(a.x + a.w).toBeGreaterThan(150);
		expect(a.w).toBeLessThan(70);
		expect(b.w).toBeCloseTo(a.w + 10, 1);
	});

	it('rewrites only the root viewBox and size', () => {
		const d = drawFreehand(sketch, {}, 0);
		const out = cropSvg(d.svg, { x: 1, y: 2, w: 30, h: 40 });
		expect(out.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 2 30 40" width="30mm" height="40mm">')).toBe(true);
		expect(out.slice(out.indexOf('>'))).toBe(d.svg.slice(d.svg.indexOf('>')));
	});

	it('an empty drawing stays as it is', () => {
		const d = drawFreehand({ page: { w: 300, h: 400 }, strokes: [] }, {}, 0);
		expect(contentBox(d.strokes, d.dials)).toBeNull();
		expect(cropSvg(d.svg, null)).toBe(d.svg);
	});
});
