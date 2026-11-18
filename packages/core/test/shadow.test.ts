import { describe, expect, it } from 'vitest';
import { ellipse } from '../src/geometry.js';
import { direction, facingRuns, facingThreshold } from '../src/medium/shadow.js';

const centre = { x: 100, y: 100 };
const loop = ellipse(centre.x, centre.y, 50, 40, 48);
const downRight = direction(45);
/** How far (in units) a shaded point may sit on the lit side: on an ellipse the edge
 *  direction isn't exactly the direction from the centre, so the boundary wanders a bit. */
const SLACK = 8;
const side = (p: { x: number; y: number }, d: { x: number; y: number }) => (p.x - centre.x) * d.x + (p.y - centre.y) * d.y;
const centroidSide = (pts: { x: number; y: number }[], d: { x: number; y: number }) => side({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length }, d);

describe('cast shadows', () => {
	it('a loop casts only from the side facing the shadow (either drawing direction)', () => {
		for (const pts of [loop, [...loop].reverse()]) {
			const kept = facingRuns(pts, true, downRight, facingThreshold(0.6)).flat();
			expect(kept.length).toBeGreaterThan(5);
			expect(kept.length).toBeLessThan(pts.length);
			expect(centroidSide(kept, downRight)).toBeGreaterThan(20);
			for (const p of kept) expect(side(p, downRight)).toBeGreaterThan(-SLACK);
		}
	});

	it('cut 0 shades the whole loop; a stricter cut shades less', () => {
		const all = facingRuns(loop, true, downRight, facingThreshold(0)).flat().length;
		const half = facingRuns(loop, true, downRight, facingThreshold(0.6)).flat().length;
		const strict = facingRuns(loop, true, downRight, facingThreshold(1)).flat().length;
		expect(all).toBe(loop.length);
		expect(half).toBeLessThan(all);
		expect(strict).toBeLessThan(half);
	});

	it('the shadow follows the angle: light from the other side shades the other side', () => {
		const upLeft = direction(225);
		const kept = facingRuns(loop, true, upLeft, facingThreshold(0.6)).flat();
		expect(centroidSide(kept, upLeft)).toBeGreaterThan(20);
		for (const p of kept) expect(side(p, upLeft)).toBeGreaterThan(-SLACK);
	});

	it('an open line lying across the light casts its whole shadow, at any cut', () => {
		const line = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }];
		expect(facingRuns(line, false, { x: 0, y: 1 }, facingThreshold(1))).toEqual([line]);
	});

	it('the cut works on open lines too: a line along the light drops out as the cut rises', () => {
		const along = [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }];
		expect(facingRuns(along, false, downRight, facingThreshold(0))).toEqual([along]);
		expect(facingRuns(along, false, downRight, facingThreshold(0.6))).toEqual([]);
	});

	it('an open curve keeps only its stretches across the light at a strict cut', () => {
		const arc = Array.from({ length: 41 }, (_, i) => ({ x: 50 * Math.cos((i / 40) * Math.PI), y: -50 * Math.sin((i / 40) * Math.PI) }));
		const all = facingRuns(arc, false, { x: 0, y: 1 }, facingThreshold(0)).flat().length;
		const strict = facingRuns(arc, false, { x: 0, y: 1 }, facingThreshold(1)).flat().length;
		expect(strict).toBeGreaterThan(0);
		expect(strict).toBeLessThan(all * 0.7);
	});

	it('angles read like a clock in screen space: 0 right, 90 down', () => {
		expect(direction(0).x).toBeCloseTo(1);
		expect(direction(90).y).toBeCloseTo(1);
	});
});
