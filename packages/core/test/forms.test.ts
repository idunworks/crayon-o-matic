import { describe, expect, it } from 'vitest';
import { draw } from '../src/draw.js';
import { FORMS, formFor } from '../src/forms/library.js';
import { PIECE_SHAPES } from '../src/forms/pieces.js';
import type { ConceptScene, Part } from '../src/types.js';

const scene = (form: string, parts: Part[]): ConceptScene => ({
	title: form,
	kidSays: 'k',
	things: [{ id: form, label: form, kind: 'object', importance: 1, expression: 'happy', form, parts }],
	extras: []
});

const partsOf = (name: string): Part[] => formFor(name)!.pieces.map((p) => ({ name: p.name, primitive: 'loop' }));

describe('base forms', () => {
	it('every form is well made: known shapes, pieces inside the box, lines have an end', () => {
		for (const f of FORMS) {
			expect(f.pieces.length, f.name).toBeGreaterThan(0);
			for (const p of f.pieces) {
				expect(PIECE_SHAPES, `${f.name}/${p.name}`).toContain(p.shape);
				for (const v of [...p.at, ...(p.to ?? [])]) expect(v, `${f.name}/${p.name}`).toBeGreaterThanOrEqual(-10), expect(v).toBeLessThanOrEqual(110);
				if (p.shape === 'line') expect(p.to, `${f.name}/${p.name}`).toBeDefined();
			}
		}
	});

	it('no motif word picks two forms', () => {
		const words = FORMS.flatMap((f) => [f.name, ...(f.words ?? [])]);
		expect(new Set(words).size).toBe(words.length);
	});

	it('every form draws at every age without failing', () => {
		for (const f of FORMS) {
			for (const age of [2.5, 3.5, 4.5, 6]) {
				const d = draw(scene(f.name, partsOf(f.name)), { age, seed: 3, chaos: 0 });
				expect(d.strokes.length, `${f.name} at ${age}`).toBeGreaterThan(0);
			}
		}
	});

	it('only the pieces whose part survived are drawn', () => {
		const all = draw(scene('rocket', partsOf('rocket')), { age: 6, chaos: 0 }).strokes;
		const one = draw(scene('rocket', [{ name: 'rocket', primitive: 'box' }]), { age: 6, chaos: 0 }).strokes;
		expect(new Set(one.map((s) => s.part).filter((p) => p !== 'ground'))).toEqual(new Set(['rocket']));
		expect(all.length).toBeGreaterThan(one.length);
	});

	it('a star is an asterisk before 5 and a closed star after', () => {
		const young = draw(scene('star', partsOf('star')), { age: 4, chaos: 0 }).strokes;
		const old = draw(scene('star', partsOf('star')), { age: 5.5, chaos: 0 }).strokes;
		expect(young.length).toBeGreaterThan(1);
		expect(old.filter((s) => s.part === 'star').every((s) => s.closed)).toBe(true);
	});

	it('an unknown form falls back to the kind builder', () => {
		expect(() => draw(scene('no-such-form', [{ name: 'body', primitive: 'loop' }]), { chaos: 0 })).not.toThrow();
	});
});
