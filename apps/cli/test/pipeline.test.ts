import { draw } from '@crayon-o-matic/core';
import { interpretOffline } from '@crayon-o-matic/interpret';
import { describe, expect, it } from 'vitest';

const grandma = interpretOffline('a furious grandma with a cat');

describe('the whole pipeline (offline)', () => {
	it('same motif, dials and seed give the same SVG, byte for byte', () => {
		expect(draw(grandma, { age: 4, seed: 11 }).svg).toBe(draw(grandma, { age: 4, seed: 11 }).svg);
	});

	it('the age scrub changes the drawing without a new interpretation', () => {
		const at3 = draw(grandma, { age: 3, seed: 11 }).svg;
		const at5 = draw(grandma, { age: 5, seed: 11 }).svg;
		expect(at3).not.toBe(at5);
	});

	it('never puts text, images, filters or transparency in the picture', () => {
		for (const age of [3, 4, 5, 6]) {
			const { svg } = draw(grandma, { age, seed: 2, chaos: 1 });
			expect(svg).not.toMatch(/<text|<tspan|<image|<filter|opacity/);
		}
	});

	it('uses one colour by default: black', () => {
		const { svg } = draw(grandma, { age: 5, seed: 4, chaos: 1 });
		expect(new Set(svg.match(/#[0-9a-f]{6}/gi))).toEqual(new Set(['#232323']));
	});

	it('uses only the palette colours it was given (max 3)', () => {
		const palette = ['#d7263d', '#1f5fbf', '#232323', '#00ff00'];
		for (let seed = 0; seed < 10; seed++) {
			const { svg } = draw(grandma, { age: 5, seed, chaos: 1, colourMode: 'nearest', palette });
			for (const c of svg.match(/#[0-9a-f]{6}/gi) ?? []) expect(palette.slice(0, 3)).toContain(c.toLowerCase());
		}
	});

	it('the second colour is a cast shadow behind each thing, the third a highlight', () => {
		const pal = ['#232323', '#c8c2b4'];
		expect(draw(grandma, { age: 5, seed: 3 }).svg).not.toContain('class="shadow"');
		const two = draw(grandma, { age: 5, seed: 3, palette: pal });
		const shadows = two.svg.match(/<g class="shadow" transform="translate\(5\.79 6\.89\)">/g) ?? [];
		expect(shadows.length).toBe(new Set(two.strokes.map((s) => s.thing)).size);
		// the shadow sits behind the lines: it comes first inside each thing's group
		expect(two.svg.indexOf('class="shadow"')).toBeLessThan(two.svg.indexOf('stroke="#232323"'));
		expect(draw(grandma, { age: 5, seed: 3, palette: [...pal, '#ffffff'] }).svg).toContain('class="highlight"');
		expect(draw(grandma, { age: 5, seed: 3, palette: pal, lineOnly: true }).svg).not.toContain('class="shadow"');
		expect(draw(grandma, { age: 5, seed: 3, palette: pal, shadowLength: 0 }).svg).not.toContain('class="shadow"');
	});

	it('the shadow dials: cut shades fewer edges, angle moves the shadow', () => {
		const pal = ['#232323', '#c8c2b4'];
		const shadowPaths = (svg: string) => (svg.match(/stroke="#c8c2b4"/g) ?? []).length;
		const shadowPoints = (svg: string) =>
			[...svg.matchAll(/<g class="shadow"[^>]*>(.*?)<\/g>/g)].reduce((n, m) => n + (m[1]!.match(/L/g) ?? []).length, 0);
		const all = draw(grandma, { age: 5, seed: 3, palette: pal, shadowCut: 0 }).svg;
		const some = draw(grandma, { age: 5, seed: 3, palette: pal, shadowCut: 0.6 }).svg;
		const few = draw(grandma, { age: 5, seed: 3, palette: pal, shadowCut: 1 }).svg;
		expect(shadowPaths(all)).toBeGreaterThan(0);
		expect(shadowPoints(some)).toBeLessThan(shadowPoints(all));
		expect(shadowPoints(few)).toBeLessThan(shadowPoints(some));
		expect(draw(grandma, { age: 5, seed: 3, palette: pal, shadowAngle: 225 }).svg).toMatch(/class="shadow" transform="translate\(-6\.36 -6\.36\)"/);
	});

	it('the highlight has its own controls and works without the shadow', () => {
		const pal = ['#232323', '#c8c2b4', '#f4c430'];
		const on = draw(grandma, { age: 5, seed: 3, palette: pal }).svg;
		expect(on).toMatch(/class="highlight" transform="translate\(-2\.57 -3\.06\)"/);
		expect(on).toContain('stroke="#f4c430"');
		expect(draw(grandma, { age: 5, seed: 3, palette: pal, highlightLength: 0 }).svg).not.toContain('class="highlight"');
		const alone = draw(grandma, { age: 5, seed: 3, palette: pal, shadowLength: 0 }).svg;
		expect(alone).not.toContain('class="shadow"');
		expect(alone).toContain('class="highlight"');
		expect(draw(grandma, { age: 5, seed: 3, palette: pal, highlightAngle: 0, highlightLength: 5 }).svg).toMatch(/class="highlight" transform="translate\(5 0\)"/);
		// back to front: shadow, highlight, lines
		expect(on.indexOf('class="shadow"')).toBeLessThan(on.indexOf('class="highlight"'));
	});

	it('groups strokes per thing, so a designer can move them', () => {
		const d = draw(grandma, { age: 5, seed: 3 });
		for (const t of d.plan.things) expect(d.svg).toContain(`id="thing-${t.id}"`);
	});

	it('stays small enough to handle (< 400 kB)', () => {
		const { svg } = draw(grandma, { age: 3, seed: 1, shakiness: 1, chaos: 1, attention: 1 });
		expect(svg.length).toBeLessThan(400_000);
	});

	it('every offline motif draws at every age without throwing', () => {
		for (const motif of ['cat', 'dog', 'house', 'sun', 'car', 'dragon eating spaghetti', 'mummy angry', 'tree', 'flower', 'fish', 'bird', 'bug', 'cake', 'zorblax']) {
			for (const age of [2.5, 3, 4, 5, 6]) {
				expect(() => draw(interpretOffline(motif), { age, seed: 7 })).not.toThrow();
			}
		}
	});
});

describe('golden drawings', () => {
	for (const age of [3, 4, 5]) {
		it(`furious grandma with a cat, age ${age}, seed 1`, () => {
			expect(draw(grandma, { age, seed: 1 }).svg).toMatchSnapshot();
		});
	}
});
