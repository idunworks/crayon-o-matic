import { describe, expect, it } from 'vitest';
import { capabilities } from '../src/capabilities.js';
import { ellipse } from '../src/geometry.js';
import { hand, MAX_POINTS } from '../src/hand.js';
import { DEFAULT_DIALS, type Dials, type PlannedStroke, type Point } from '../src/types.js';

const dials = (over: Partial<Dials> = {}): Dials => ({ ...DEFAULT_DIALS, ...over });

const lineStroke = (key = 'a/line/0', over: Partial<PlannedStroke> = {}): PlannedStroke => ({
	key,
	thing: 'a',
	part: 'line',
	kind: 'outline',
	order: 0,
	path: [{ x: 20, y: 100 }, { x: 220, y: 100 }],
	closed: false,
	corners: false,
	size: 200,
	colour: '#232323',
	...over
});

const loopStroke = (key: string): PlannedStroke => ({
	...lineStroke(key),
	part: 'head',
	path: ellipse(150, 150, 60, 60, 32),
	closed: true,
	size: 170
});

function distToSegment(p: Point, a: Point, b: Point): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
	return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

describe('hand', () => {
	it('same seed gives the same stroke, exactly', () => {
		const d = dials({ age: 3.5, seed: 12 });
		const caps = capabilities(d);
		expect(hand(loopStroke('x/head/0'), caps, d)).toEqual(hand(loopStroke('x/head/0'), caps, d));
	});

	it('a different seed gives a different stroke', () => {
		const a = dials({ age: 3.5, seed: 12 });
		const b = dials({ age: 3.5, seed: 13 });
		expect(hand(loopStroke('x'), capabilities(a), a).points).not.toEqual(hand(loopStroke('x'), capabilities(b), b).points);
	});

	it('changing one stroke never changes another (noise is keyed per stroke)', () => {
		const d = dials({ age: 4, seed: 5 });
		const caps = capabilities(d);
		const before = hand(lineStroke('keep/line/0'), caps, d);
		hand(lineStroke('other/line/0', { path: [{ x: 0, y: 0 }, { x: 50, y: 90 }] }), caps, d);
		expect(hand(lineStroke('keep/line/0'), caps, d)).toEqual(before);
	});

	it('at shakiness 0 the line is straight: no wobble off the intended path', () => {
		for (const age of [3, 6]) {
			const d = dials({ age, shakiness: 0, seed: 3 });
			const s = lineStroke();
			const out = hand(s, capabilities(d), d).points;
			const inner = out.slice(Math.floor(out.length * 0.1), Math.ceil(out.length * 0.9));
			// only the hand's slant remains: a 0.03 shear on a horizontal line is ~0
			expect(Math.max(...inner.map((p) => distToSegment(p, s.path[0]!, s.path[1]!)))).toBeLessThan(0.5);
		}
	});

	it('at age-typical shakiness and age 6, the line stays within ~2% of its intended path', () => {
		const d = dials({ age: 6, shakiness: 0.5, seed: 3 });
		const s = lineStroke();
		const out = hand(s, capabilities(d), d).points;
		const inner = out.slice(Math.floor(out.length * 0.1), Math.ceil(out.length * 0.9));
		const worst = Math.max(...inner.map((p) => distToSegment(p, s.path[0]!, s.path[1]!)));
		expect(worst / s.size).toBeLessThanOrEqual(0.02);
	});

	it('a 3-year-old mostly misses closing a loop', () => {
		let missed = 0;
		for (let seed = 0; seed < 50; seed++) {
			const d = dials({ age: 3, seed });
			const s = loopStroke(`l/head/${seed}`);
			const pts = hand(s, capabilities(d), d).points;
			const gap = Math.hypot(pts[0]!.x - pts[pts.length - 1]!.x, pts[0]!.y - pts[pts.length - 1]!.y);
			if (gap > s.size * 0.02) missed++;
		}
		expect(missed).toBeGreaterThanOrEqual(35);
	});

	it('younger hands wobble more than older ones', () => {
		const wobble = (age: number) => {
			let total = 0;
			for (let seed = 0; seed < 10; seed++) {
				const d = dials({ age, seed });
				const s = lineStroke(`w/line/${seed}`);
				const pts = hand(s, capabilities(d), d).points;
				total += pts.reduce((m, p) => m + distToSegment(p, s.path[0]!, s.path[1]!), 0) / pts.length;
			}
			return total;
		};
		expect(wobble(3)).toBeGreaterThan(wobble(6) * 1.5);
	});

	it('keeps the point count bounded, even for huge strokes', () => {
		const d = dials({ age: 3 });
		const huge = lineStroke('h', { path: [{ x: 0, y: 0 }, { x: 5000, y: 0 }], size: 5000 });
		const out = hand(huge, capabilities(d), d);
		expect(out.points.length).toBeLessThanOrEqual(MAX_POINTS);
		expect(out.widths.length).toBe(out.points.length);
	});

	it('pressing hard makes a wider line than pressing lightly', () => {
		const avg = (w: number[]) => w.reduce((a, b) => a + b, 0) / w.length;
		const light = dials({ pressure: 'light' });
		const hard = dials({ pressure: 'hard' });
		expect(avg(hand(lineStroke(), capabilities(hard), hard).widths)).toBeGreaterThan(avg(hand(lineStroke(), capabilities(light), light).widths));
	});
});
