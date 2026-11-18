import { describe, expect, it } from 'vitest';
import { extend, pathD, toPage } from '../src/sketch.js';

describe('freehand sketch helpers', () => {
	it('maps a pointer to page units whatever size the paper is shown at', () => {
		expect(toPage(150, 250, { left: 100, top: 50, width: 100, height: 400 }, { w: 300, h: 400 })).toEqual({ x: 150, y: 200 });
	});

	it('skips samples that are too close, keeps the rest, never mutates', () => {
		const a = [{ x: 0, y: 0 }];
		expect(extend(a, { x: 0.1, y: 0.1 })).toBe(a);
		const b = extend(a, { x: 5, y: 0 });
		expect(b).toEqual([{ x: 0, y: 0 }, { x: 5, y: 0 }]);
		expect(a).toHaveLength(1);
	});

	it('writes an SVG path', () => {
		expect(pathD([{ x: 1, y: 2 }, { x: 3.25, y: 4 }])).toBe('M1.0 2.0L3.3 4.0');
	});
});
