import { describe, expect, it } from 'vitest';
import { crownY, forehead } from '../src/builders/face.js';
import { ellipse } from '../src/geometry.js';

const c = { x: 0, y: 0 };
const r = 20;
const head = ellipse(0, 0, r, r, 40);
const top = (pts: { y: number }[]) => Math.min(...pts.map((p) => p.y));

describe('adorable forehead', () => {
	it('at adorable 0 the head is unchanged', () => {
		forehead(head, c, r, 0).forEach((p, i) => {
			expect(p.x).toBeCloseTo(head[i]!.x, 9);
			expect(p.y).toBeCloseTo(head[i]!.y, 9);
		});
	});

	it('raises the crown and leaves the lower face where it was', () => {
		const grown = forehead(head, c, r, 1);
		expect(top(grown)).toBeLessThan(top(head) - r * 0.3);
		expect(top(grown)).toBeCloseTo(crownY(c, r, 1), 0);
		grown.forEach((p, i) => {
			if (head[i]!.y >= 0) expect(p).toEqual(head[i]);
		});
	});

	it('the dome stays round: broad near the crown, not a lemon', () => {
		const grown = forehead(head, c, r, 1);
		const crown = top(grown);
		// width of the dome a fifth of the way down from its top
		const band = grown.filter((p) => p.y < crown * 0.8);
		const width = Math.max(...band.map((p) => p.x)) - Math.min(...band.map((p) => p.x));
		expect(width).toBeGreaterThan(r * 0.9);
	});
});
