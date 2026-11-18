import { describe, expect, it } from 'vitest';
import { interpretOffline, KNOWN_WORDS, parseScene, TEMPLATES, withoutText } from '../src/index.js';

describe('offline templates', () => {
	it('every template makes a scene that validates', () => {
		for (const t of TEMPLATES) {
			const scene = interpretOffline(`a ${t.words[0]}`);
			expect(scene.things[0]?.label, t.label).toBe(t.label);
		}
	});

	it('no template word is claimed twice', () => {
		expect(new Set(KNOWN_WORDS).size).toBe(KNOWN_WORDS.length);
	});
});

describe('interpretOffline', () => {
	it('reads the main thing, a second thing and the mood', () => {
		const s = interpretOffline('a furious grandma with a cat');
		expect(s.things.map((t) => t.label)).toEqual(['grandma', 'cat']);
		expect(s.things[0]?.expression).toBe('furious');
		expect(s.things[0]?.importance).toBe(1);
		expect(s.things[1]?.relation).toEqual({ to: 'grandma', how: 'next-to' });
	});

	it('"disappointed in me" is the cat\'s mood, not a second figure', () => {
		const s = interpretOffline('a cat who is very disappointed in me');
		expect(s.things.map((t) => t.label)).toEqual(['cat']);
		expect(s.things[0]?.expression).toBe('meh');
	});

	it('the expression override wins over the motif', () => {
		expect(interpretOffline('a furious grandma', { expression: 'laughing' }).things[0]?.expression).toBe('laughing');
	});

	it('an unknown word still gets drawn, as a smiley blob', () => {
		const s = interpretOffline('a zorblax');
		expect(s.things[0]?.kind).toBe('blob');
		expect(s.things[0]?.label).toBe('zorblax');
	});

	it('is deterministic per motif', () => {
		expect(interpretOffline('grandma at the beach, furious')).toEqual(interpretOffline('grandma at the beach, furious'));
	});

	it('kidSays never blames the main thing on itself ("dog is scared of the dog")', () => {
		for (const motif of ['a scared dog', 'a furious cat', 'a scared monster', 'a furious dog']) {
			const s = interpretOffline(motif);
			const label = s.things[0]!.label;
			expect(s.kidSays, motif).not.toMatch(new RegExp(`${label}.*the ${label}`));
		}
	});

	it('kidSays is filled in and never has a placeholder left', () => {
		const s = interpretOffline('a scared dog');
		expect(s.kidSays).not.toMatch(/\{/);
	});
});

describe('no text in the picture', () => {
	it('drops any part named like text', () => {
		const scene = withoutText({
			title: 't',
			kidSays: 'k',
			extras: [],
			things: [{ id: 'a', label: 'a', kind: 'blob', importance: 1, expression: 'happy', parts: [{ name: 'body', primitive: 'loop' }, { name: 'name tag', primitive: 'box' }, { name: 'speech bubble', primitive: 'loop' }, { name: 'letters', primitive: 'zigzag' }] }]
		});
		expect(scene.things[0]?.parts.map((p) => p.name)).toEqual(['body']);
	});

	it('rejects scenes that break the schema', () => {
		expect(() => parseScene({ title: 'x', kidSays: 'y', extras: [], things: [] })).toThrow();
		expect(() => parseScene({ title: 'x', kidSays: 'y', extras: [], things: [{ id: 'Bad Id!', label: 'a', kind: 'blob', importance: 1, expression: 'happy', parts: [{ name: 'b', primitive: 'loop' }] }] })).toThrow();
	});
});

describe('base forms as motifs', () => {
	it('a form word gets its form, with no face unless a mood is asked for', () => {
		const plain = interpretOffline('a balloon').things[0]!;
		expect(plain.form).toBe('balloon');
		expect(plain.parts.some((p) => p.name === 'face')).toBe(false);
		const sad = interpretOffline('a sad balloon').things[0]!;
		expect(sad.parts[1]!.name).toBe('face');
		expect(sad.expression).toBe('sad');
	});

	it('words like taxes and beach land on a form, not a blob', () => {
		expect(interpretOffline('a llama doing taxes').things.some((t) => t.form === 'book')).toBe(true);
		expect(interpretOffline('mum at the beach').things.some((t) => t.form === 'sea')).toBe(true);
	});
});
