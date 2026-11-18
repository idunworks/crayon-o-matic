/**
 * Offline templates: what a child "knows" is in each thing, parts in the order a child
 * adds them, most essential first (spec §4.1). With no API key the app builds every
 * scene from these, and the tests never touch the network.
 */
import { FORMS, formFor, PRIMITIVE_OF, type Form, type Part, type Pose, type ThingKind } from '@crayon-o-matic/core';

export interface Template {
	/** Words in a motif that pick this template. */
	words: readonly string[];
	label: string;
	kind: ThingKind;
	parts: readonly Part[];
	colourIdea?: string;
	/** Poses a child picks between for this thing when the motif doesn't say. */
	poses?: readonly Pose[];
	/** Drawn from this base form (core forms/library.ts) rather than its kind's builder. */
	form?: string;
}

const P = (name: string, primitive: Part['primitive'], count?: number): Part => (count ? { name, primitive, count } : { name, primitive });

/** The human figure, in Goodenough/Harris order (spec §1.3). */
const PERSON: readonly Part[] = [
	P('head', 'loop'),
	P('eyes', 'dots', 2),
	P('legs', 'line', 2),
	P('mouth', 'U'),
	P('arms', 'line', 2),
	P('trunk', 'loop'),
	P('nose', 'dot'),
	P('hair', 'scribble-cluster'),
	P('hands', 'rays', 2),
	P('feet', 'loop', 2),
	P('ears', 'loop', 2),
	P('neck', 'line')
];

const person = (extra: readonly Part[], at = 8): readonly Part[] => [...PERSON.slice(0, at), ...extra, ...PERSON.slice(at)];

const ANIMAL4: readonly Part[] = [
	P('head', 'loop'),
	P('eyes', 'dots', 2),
	P('body', 'loop'),
	P('legs', 'line', 4),
	P('mouth', 'U'),
	P('ears', 'triangle', 2),
	P('tail', 'arc'),
	P('nose', 'dot')
];

const HAND_MADE: readonly Template[] = [
	{ words: ['grandma', 'granma', 'granny', 'nana', 'grandmother'], label: 'grandma', kind: 'person', colourIdea: 'purple', parts: person([P('glasses', 'loop', 2), P('bun', 'scribble-cluster')], 7) },
	{ words: ['grandpa', 'grandad', 'granddad', 'grandfather'], label: 'grandpa', kind: 'person', parts: person([P('glasses', 'loop', 2), P('beard', 'scribble-cluster')], 7) },
	{ words: ['mum', 'mom', 'mummy', 'mommy', 'mother', 'mama'], label: 'mummy', kind: 'person', colourIdea: 'pink', parts: person([P('bag', 'box')]) },
	{ words: ['dad', 'daddy', 'father', 'papa'], label: 'daddy', kind: 'person', colourIdea: 'blue', parts: person([P('hat', 'tab')]) },
	{ words: ['teacher', 'man', 'woman', 'lady', 'person', 'boss', 'friend'], label: 'person', kind: 'person', parts: PERSON },
	{ words: ['me', 'girl', 'boy', 'kid', 'child', 'baby', 'brother', 'sister'], label: 'me', kind: 'person', parts: person([P('balloon', 'loop')]) },
	{ words: ['king', 'queen', 'princess', 'prince'], label: 'princess', kind: 'person', colourIdea: 'pink', parts: person([P('crown', 'zigzag')], 4) },
	// a cat is ears, whiskers and a tail held up (owner, 2026-11-18): those come early
	{ words: ['cat', 'kitty', 'kitten'], label: 'cat', kind: 'animal4', colourIdea: 'orange', poses: ['standing', 'sitting'], parts: [P('head', 'loop'), P('eyes', 'dots', 2), P('ears', 'triangle', 2), P('body', 'loop'), P('legs', 'line', 4), P('tail', 'arc'), P('whiskers', 'line', 6), P('mouth', 'U'), P('nose', 'dot')] },
	{ words: ['dog', 'doggy', 'puppy'], label: 'dog', kind: 'animal4', colourIdea: 'brown', parts: [...ANIMAL4, P('spots', 'dots', 3)] },
	{ words: ['horse', 'pony', 'unicorn'], label: 'horse', kind: 'animal4', parts: [...ANIMAL4, P('mane', 'scribble-cluster')] },
	{ words: ['dragon', 'dinosaur', 'dino', 'monster'], label: 'dragon', kind: 'animal4', colourIdea: 'green', parts: [...ANIMAL4.slice(0, 5), P('spikes', 'zigzag'), P('wings', 'arc'), P('fire', 'scribble-cluster'), ...ANIMAL4.slice(5)] },
	{ words: ['bird', 'duck', 'chicken', 'owl', 'parrot'], label: 'bird', kind: 'animal2', parts: [P('body', 'loop'), P('head', 'loop'), P('eyes', 'dot'), P('beak', 'triangle'), P('legs', 'line', 2), P('wings', 'arc'), P('feet', 'rays', 2), P('tail', 'rays')] },
	{ words: ['fish', 'shark', 'whale', 'goldfish'], label: 'fish', kind: 'fish', colourIdea: 'orange', parts: [P('body', 'loop'), P('eyes', 'dot'), P('tail', 'triangle'), P('mouth', 'U'), P('fins', 'arc'), P('scales', 'arc')] },
	{ words: ['bug', 'ladybird', 'ladybug', 'beetle', 'bee', 'butterfly'], label: 'bug', kind: 'bug', parts: [P('body', 'loop'), P('head', 'loop'), P('legs', 'line', 6), P('eyes', 'dots', 2), P('antennae', 'line', 2), P('spots', 'dots'), P('wings', 'loop'), P('mouth', 'U')] },
	{ words: ['house', 'home'], label: 'house', kind: 'house', colourIdea: 'red', parts: [P('walls', 'box'), P('roof', 'triangle'), P('door', 'tab'), P('windows', 'box', 2), P('chimney', 'tab'), P('smoke', 'spiral')] },
	{ words: ['car', 'bus', 'truck', 'tractor', 'train'], label: 'car', kind: 'vehicle', colourIdea: 'red', parts: [P('body', 'box'), P('wheels', 'loop', 2), P('windows', 'box'), P('roof', 'arc'), P('lights', 'dot')] },
	{ words: ['tree', 'forest'], label: 'tree', kind: 'tree', colourIdea: 'green', parts: [P('trunk', 'tab'), P('crown', 'loop'), P('apples', 'dots'), P('branches', 'line')] },
	{ words: ['flower', 'rose', 'tulip', 'daisy'], label: 'flower', kind: 'flower', colourIdea: 'pink', parts: [P('middle', 'loop'), P('petals', 'loop'), P('stem', 'line'), P('leaf', 'loop')] },
	{ words: ['sun', 'sunny', 'sunshine'], label: 'sun', kind: 'sun', colourIdea: 'yellow', parts: [P('disc', 'loop'), P('rays', 'rays'), P('face', 'U'), P('sunglasses', 'loop', 2)] },
	{ words: ['cloud', 'rain', 'rainy'], label: 'cloud', kind: 'cloud', colourIdea: 'blue', parts: [P('cloud', 'loop'), P('rain', 'line'), P('face', 'U')] },
];

const key = (name: string): string => name.toLowerCase().replace(/s$/, '');

/** A base form as a template: its pieces become parts, once per name, in drawing order. */
function fromForm(f: Form): Template {
	const seen = new Set<string>();
	const parts = f.pieces.filter((p) => !seen.has(key(p.name)) && seen.add(key(p.name))).map((p) => P(p.name, PRIMITIVE_OF[p.shape]));
	return { words: [f.name, ...(f.words ?? [])], label: f.name, kind: 'object', form: f.name, parts, ...(f.colourIdea ? { colourIdea: f.colourIdea } : {}) };
}

/** Hand-made templates first (they win a shared word), then every base form. */
export const TEMPLATES: readonly Template[] = [...HAND_MADE, ...FORMS.map(fromForm)];

export function templateFor(word: string): Template | undefined {
	const w = word.toLowerCase();
	return TEMPLATES.find((t) => t.words.includes(w));
}

/**
 * A face on a thing that doesn't usually have one ("a sad banana"): only when the motif asks
 * for a mood, and placed right after the main shape so the part budget keeps it.
 */
export function withMoodFace(parts: readonly Part[], template: Template | undefined): Part[] {
	if (!formFor(template?.form)?.face) return [...parts];
	// one face, early: any face parts listed later would be the first the budget drops
	const rest = parts.filter((p) => !FACE_PART.test(p.name));
	return [...rest.slice(0, 1), P('face', 'U'), ...rest.slice(1)];
}

const FACE_PART = /^(face|eyes?|mouth|nose)$/i;
