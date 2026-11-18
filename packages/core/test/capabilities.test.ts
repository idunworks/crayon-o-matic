import { describe, expect, it } from 'vitest';
import { ANCHORS, SHAPE_MILESTONES, lookup } from '../src/anchors.js';
import { capabilities } from '../src/capabilities.js';
import { DEFAULT_DIALS, type Dials } from '../src/types.js';

const dials = (over: Partial<Dials> = {}): Dials => ({ ...DEFAULT_DIALS, ...over });
const ages = [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];

describe('anchors', () => {
	it('every anchor carries a source note and a status', () => {
		for (const [key, a] of Object.entries(ANCHORS)) {
			expect(a.source.length, key).toBeGreaterThan(5);
			expect(['verify', 'tuned'], key).toContain(a.status);
		}
		for (const m of SHAPE_MILESTONES) expect(m.source.length, m.shape).toBeGreaterThan(5);
	});

	it('anchor ages ascend', () => {
		for (const [key, a] of Object.entries(ANCHORS)) {
			const xs = a.points.map((p) => p[0]);
			expect(xs, key).toEqual([...xs].sort((p, q) => p - q));
		}
	});

	it('lookup interpolates and clamps', () => {
		expect(lookup('partBudget', 3.5)).toBe(5);
		expect(lookup('partBudget', 1)).toBe(2);
		expect(lookup('partBudget', 9)).toBe(14);
	});
});

describe('capabilities', () => {
	it('never gets worse with age at a fixed seed (budget, closure, smoothness)', () => {
		for (const seed of [1, 2, 3, 42]) {
			const caps = ages.map((age) => capabilities(dials({ age, seed, attention: 1 })));
			for (let i = 1; i < caps.length; i++) {
				const [prev, cur] = [caps[i - 1]!, caps[i]!];
				expect(cur.partBudget).toBeGreaterThanOrEqual(prev.partBudget);
				expect(cur.closureMiss).toBeLessThanOrEqual(prev.closureMiss);
				expect(cur.tremorAmp).toBeLessThanOrEqual(prev.tremorAmp);
				expect(cur.velocityPeaks).toBeLessThanOrEqual(prev.velocityPeaks);
				expect(cur.shapes.length).toBeGreaterThanOrEqual(prev.shapes.length);
			}
		}
	});

	it('at age 3.0 there is never a triangle or a square', () => {
		for (let seed = 0; seed < 200; seed++) {
			const { shapes } = capabilities(dials({ age: 3, seed }));
			expect(shapes).not.toContain('triangle');
			expect(shapes).not.toContain('square');
		}
	});

	it('at age 3.5 the figure is mostly a tadpole (>= 80% of 100 seeds)', () => {
		let tadpoles = 0;
		for (let seed = 0; seed < 100; seed++) {
			if (capabilities(dials({ age: 3.5, seed })).figureType === 'tadpole') tadpoles++;
		}
		expect(tadpoles).toBeGreaterThanOrEqual(80);
	});

	it('at age 6 the figure is conventional and the triangle is available', () => {
		const caps = capabilities(dials({ age: 6 }));
		expect(caps.figureType).toBe('conventional');
		expect(caps.shapes).toContain('triangle');
	});

	it('shakiness runs from dead straight (0) through age-typical (0.5) to a mess (1)', () => {
		const straight = capabilities(dials({ age: 4, shakiness: 0 }));
		const typical = capabilities(dials({ age: 4, shakiness: 0.5 }));
		const mess = capabilities(dials({ age: 4, shakiness: 1 }));
		expect(straight.tremorAmp).toBe(0);
		expect(straight.driftAmp).toBe(0);
		expect(mess.tremorAmp).toBeGreaterThanOrEqual(typical.tremorAmp * 4);
		expect(mess.driftAmp).toBeGreaterThanOrEqual(typical.driftAmp * 4);
		const ladder = [0, 0.25, 0.5, 0.75, 1].map((s) => capabilities(dials({ age: 4, shakiness: s })).tremorAmp);
		expect(ladder).toEqual([...ladder].sort((a, b) => a - b));
	});

	it('attention shrinks the part budget and the colouring', () => {
		const bored = capabilities(dials({ age: 5, attention: 0 }));
		const focused = capabilities(dials({ age: 5, attention: 1 }));
		expect(bored.partBudget).toBeLessThan(focused.partBudget);
		expect(bored.fillCoverage).toBeLessThan(focused.fillCoverage);
	});

	it('adorable makes the head bigger, by at most 40%', () => {
		const plain = capabilities(dials({ age: 4, adorable: 0 }));
		const cute = capabilities(dials({ age: 4, adorable: 1 }));
		expect(cute.headRatio).toBeGreaterThan(plain.headRatio);
		expect(cute.headRatio).toBeLessThanOrEqual(plain.headRatio * 1.4 + 1e-9);
	});

	it('no occlusion and floating layout before 5', () => {
		const caps = capabilities(dials({ age: 4.5 }));
		expect(caps.occlusion).toBe(false);
		expect(caps.layout).toBe('floating');
		expect(capabilities(dials({ age: 6 })).layout).toBe('baseline');
	});

	it('is deterministic for the same dials', () => {
		expect(capabilities(dials({ age: 4.2, seed: 9 }))).toEqual(capabilities(dials({ age: 4.2, seed: 9 })));
	});

	it('clamps the age to the dial range', () => {
		expect(capabilities(dials({ age: 1 })).age).toBe(2.5);
		expect(capabilities(dials({ age: 9 })).age).toBe(6);
	});
});
