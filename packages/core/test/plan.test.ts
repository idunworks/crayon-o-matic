import { describe, expect, it } from 'vitest';
import { capabilities } from '../src/capabilities.js';
import { bbox } from '../src/geometry.js';
import { plan } from '../src/plan.js';
import { DEFAULT_DIALS, type ConceptScene, type Dials, type Thing } from '../src/types.js';

const dials = (over: Partial<Dials> = {}): Dials => ({ ...DEFAULT_DIALS, ...over });

const grandma: Thing = {
	id: 'grandma',
	label: 'grandma',
	kind: 'person',
	importance: 1,
	expression: 'furious',
	parts: [
		{ name: 'head', primitive: 'loop' },
		{ name: 'eyes', primitive: 'dots', count: 2 },
		{ name: 'legs', primitive: 'line', count: 2 },
		{ name: 'mouth', primitive: 'U' },
		{ name: 'arms', primitive: 'line', count: 2 },
		{ name: 'trunk', primitive: 'loop' },
		{ name: 'nose', primitive: 'dot' },
		{ name: 'hair', primitive: 'scribble-cluster' },
		{ name: 'glasses', primitive: 'loop', count: 2 },
		{ name: 'hands', primitive: 'rays' },
		{ name: 'feet', primitive: 'loop' },
		{ name: 'bun', primitive: 'scribble-cluster' }
	]
};

const cat: Thing = {
	id: 'cat',
	label: 'cat',
	kind: 'animal4',
	importance: 0.5,
	expression: 'meh',
	parts: [
		{ name: 'head', primitive: 'loop' },
		{ name: 'eyes', primitive: 'dots', count: 2 },
		{ name: 'body', primitive: 'loop' },
		{ name: 'legs', primitive: 'line', count: 4 },
		{ name: 'ears', primitive: 'triangle', count: 2 },
		{ name: 'tail', primitive: 'arc' },
		{ name: 'whiskers', primitive: 'line' }
	]
};

const house: Thing = {
	id: 'house',
	label: 'house',
	kind: 'house',
	importance: 0.4,
	expression: 'none',
	parts: [
		{ name: 'walls', primitive: 'box' },
		{ name: 'roof', primitive: 'triangle' },
		{ name: 'door', primitive: 'tab' },
		{ name: 'windows', primitive: 'box' }
	]
};

const scene = (...things: Thing[]): ConceptScene => ({ title: 't', kidSays: 'k', things, extras: ['sun', 'heart'] });

const planFor = (s: ConceptScene, d: Dials, page?: { w: number; h: number }) => plan(s, capabilities(d), d, page);

describe('plan', () => {
	it('a person at age 3.2 has no separate trunk in most seeds', () => {
		let withTrunk = 0;
		for (let seed = 0; seed < 50; seed++) {
			const p = planFor(scene(grandma), dials({ age: 3.2, seed, attention: 1 }));
			if (p.strokes.some((s) => s.thing === 'grandma' && s.part === 'trunk')) withTrunk++;
		}
		expect(withTrunk).toBeLessThan(10);
	});

	it('draws the head first for persons', () => {
		for (const age of [3, 4, 5, 6]) {
			const p = planFor(scene(grandma), dials({ age }));
			const mine = p.strokes.filter((s) => s.thing === 'grandma').sort((a, b) => a.order - b.order);
			expect(mine[0]?.part).toBe('head');
			expect(Math.min(...p.strokes.map((s) => s.order))).toBe(mine[0]?.order);
		}
	});

	it('before 5, no two things overlap (each to its own space)', () => {
		for (let seed = 0; seed < 30; seed++) {
			const p = planFor(scene(grandma, cat, house), dials({ age: 4.5, seed, chaos: 1 }));
			for (let i = 0; i < p.things.length; i++) {
				for (let j = i + 1; j < p.things.length; j++) {
					const a = p.things[i]!.box;
					const b = p.things[j]!.box;
					const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
					expect(overlap, `seed ${seed}: ${p.things[i]!.id} vs ${p.things[j]!.id}`).toBe(false);
				}
			}
		}
	});

	it('low attention drops parts from the tail, never the head or eyes', () => {
		const focused = planFor(scene(grandma), dials({ age: 5, attention: 1 })).things[0]!.keptParts;
		const bored = planFor(scene(grandma), dials({ age: 5, attention: 0 })).things[0]!.keptParts;
		expect(bored.length).toBeLessThan(focused.length);
		expect(bored).toContain('head');
		expect(bored).toContain('eyes');
		expect(focused.slice(0, bored.length)).toEqual(bored);
	});

	it('the main thing always keeps head and eyes, even at the youngest and most bored', () => {
		const kept = planFor(scene(grandma, cat), dials({ age: 2.5, attention: 0 })).things[0]!.keptParts;
		expect(kept.slice(0, 2)).toEqual(['head', 'eyes']);
	});

	it('a tall figure that runs out of room keeps its head size', () => {
		const d = dials({ age: 4, seed: 3 });
		const roomy = planFor(scene(grandma), d, { w: 300, h: 400 });
		const cramped = planFor(scene(grandma), d, { w: 300, h: 220 });
		const head = (p: ReturnType<typeof planFor>) => bbox(p.strokes.filter((s) => s.part === 'head').map((s) => s.path));
		expect(head(cramped).h).toBeCloseTo(head(roomy).h, 5);
		// and the figure got cut at the page edge instead
		const maxY = Math.max(...cramped.strokes.flatMap((s) => s.path.map((pt) => pt.y)));
		expect(maxY).toBeLessThanOrEqual(220);
	});

	it('shapes the child cannot make yet are simplified (a 3-year-old has no corners)', () => {
		const p = planFor(scene(house), dials({ age: 3, attention: 1 }));
		expect(p.strokes.some((s) => s.corners)).toBe(false);
		const older = planFor(scene(house), dials({ age: 6, attention: 1 }));
		expect(older.strokes.some((s) => s.part === 'roof' && s.corners)).toBe(true);
	});

	it('is deterministic: same scene and dials give the same plan', () => {
		const d = dials({ age: 4.3, seed: 77, chaos: 0.8 });
		expect(planFor(scene(grandma, cat), d)).toEqual(planFor(scene(grandma, cat), d));
	});

	it('colouring-in comes after every outline, and none in line-only mode', () => {
		const two = ['#232323', '#d7263d'];
		const p = planFor(scene(grandma, cat), dials({ age: 5, attention: 1, palette: two, colourIn: true }));
		const lastOutline = Math.max(...p.strokes.filter((s) => s.kind === 'outline').map((s) => s.order));
		const fills = p.strokes.filter((s) => s.kind === 'fill');
		expect(fills.length).toBeGreaterThan(0);
		expect(Math.min(...fills.map((s) => s.order))).toBeGreaterThan(lastOutline);
		expect(planFor(scene(grandma, cat), dials({ age: 5, lineOnly: true, palette: two, colourIn: true })).strokes.some((s) => s.kind === 'fill')).toBe(false);
	});

	it('a second colour is not a fill: no colouring-in unless asked for', () => {
		const p = planFor(scene(grandma, cat), dials({ age: 5, attention: 1, palette: ['#232323', '#d7263d'] }));
		expect(p.strokes.some((s) => s.kind === 'fill')).toBe(false);
		expect(new Set(p.strokes.map((s) => s.colour))).toEqual(new Set(['#232323']));
	});

	it('one colour is a clean monoline; with colouring-in on, lines take the first and colouring the rest', () => {
		const mono = planFor(scene(grandma, cat), dials({ age: 5, attention: 1 }));
		expect(mono.strokes.some((s) => s.kind === 'fill')).toBe(false);
		expect(new Set(mono.strokes.map((s) => s.colour))).toEqual(new Set(['#232323']));

		const three = ['#232323', '#d7263d', '#1f5fbf'];
		const p = planFor(scene(grandma, cat), dials({ age: 5, attention: 1, palette: three, colourIn: true }));
		expect(new Set(p.strokes.filter((s) => s.kind === 'outline').map((s) => s.colour))).toEqual(new Set(['#232323']));
		for (const s of p.strokes.filter((s) => s.kind === 'fill')) expect(three.slice(1)).toContain(s.colour);
	});

	it('sky things (the sun) never land on top of the scene', () => {
		const withSun: ConceptScene = { ...scene(house), things: [house, { id: 'sun', label: 'sun', kind: 'sun', importance: 0.4, expression: 'happy', parts: [{ name: 'disc', primitive: 'loop' }, { name: 'rays', primitive: 'rays' }] }] };
		for (let seed = 0; seed < 30; seed++) {
			const p = planFor(withSun, dials({ age: 6, seed, chaos: 0 }));
			const [a, b] = [p.things.find((t) => t.id === 'house'), p.things.find((t) => t.id === 'sun')];
			if (!a || !b) continue;
			const overlap = a.box.x < b.box.x + b.box.w && b.box.x < a.box.x + a.box.w && a.box.y < b.box.y + b.box.h && b.box.y < a.box.y + a.box.h;
			expect(overlap, `seed ${seed}`).toBe(false);
		}
	});

	it('chaos adds extras; chaos 0 adds none', () => {
		const calm = planFor(scene(grandma), dials({ chaos: 0 }));
		expect(calm.things.map((t) => t.id)).toEqual(['grandma']);
		let extras = 0;
		for (let seed = 0; seed < 20; seed++) extras += planFor(scene(grandma), dials({ chaos: 1, seed })).things.length - 1;
		expect(extras).toBeGreaterThan(10);
	});

	it('keeps everything on the page', () => {
		for (let seed = 0; seed < 20; seed++) {
			const p = planFor(scene(grandma, cat, house), dials({ age: 4, seed, chaos: 1 }));
			for (const s of p.strokes) {
				for (const pt of s.path) {
					expect(pt.x).toBeGreaterThanOrEqual(-1);
					expect(pt.x).toBeLessThanOrEqual(p.page.w + 1);
					expect(pt.y).toBeGreaterThanOrEqual(-1);
					expect(pt.y).toBeLessThanOrEqual(p.page.h + 1);
				}
			}
		}
	});
});
