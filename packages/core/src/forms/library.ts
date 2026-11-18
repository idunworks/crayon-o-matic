/**
 * The base-form library: things a child draws from a few simple pieces. Coordinates are in
 * a 100 × 100 box, y down; pieces are listed in the order a child draws them, most essential
 * first, because the part budget keeps them from the top. Plain data on purpose: adding a
 * thing is adding an entry here (by hand, or written in bulk by a model at build time).
 */
import type { Form } from './pieces.js';

export const FORMS: readonly Form[] = [
	// ── toys and party ────────────────────────────────────────────────────────
	{ name: 'balloon', words: ['balloons'], colourIdea: 'red', face: { at: [50, 32], r: 18 }, pieces: [
		{ name: 'balloon', shape: 'loop', at: [50, 32], size: [44, 52] },
		{ name: 'string', shape: 'wave', at: [50, 58], to: [46, 98], size: [0, 3], count: 1.5 },
		{ name: 'knot', shape: 'triangle', at: [50, 60], size: [6, 5], dir: -90 }
	] },
	{ name: 'ball', words: ['football', 'beachball'], face: { at: [50, 50], r: 22 }, pieces: [
		{ name: 'ball', shape: 'loop', at: [50, 50], size: [60, 60] },
		{ name: 'stripes', shape: 'arc', at: [50, 46], size: [56, 18] },
		{ name: 'stripe', shape: 'U', at: [50, 62], size: [56, 14] }
	] },
	{ name: 'kite', colourIdea: 'blue', pieces: [
		{ name: 'kite', shape: 'box', at: [50, 30], size: [36, 36] },
		{ name: 'string', shape: 'wave', at: [50, 48], to: [30, 98], size: [0, 4], count: 2 },
		{ name: 'cross', shape: 'cross', at: [50, 30], size: [34, 34] },
		{ name: 'bows', shape: 'dots', at: [40, 70], size: [20, 6], count: 3 }
	] },
	{ name: 'present', words: ['gift', 'parcel', 'presents'], colourIdea: 'pink', pieces: [
		{ name: 'box', shape: 'box', at: [50, 62], size: [56, 44] },
		{ name: 'ribbon', shape: 'line', at: [50, 40], to: [50, 84] },
		{ name: 'bow', shape: 'heart', at: [50, 34], size: [20, 14] }
	] },
	{ name: 'robot', words: ['robots', 'android'], colourIdea: 'grey', face: { at: [50, 22], r: 14 }, pieces: [
		{ name: 'head', shape: 'box', at: [50, 22], size: [34, 28] },
		{ name: 'body', shape: 'box', at: [50, 58], size: [42, 40] },
		{ name: 'legs', shape: 'line', at: [40, 78], to: [40, 98] },
		{ name: 'leg', shape: 'line', at: [60, 78], to: [60, 98] },
		{ name: 'arms', shape: 'line', at: [29, 50], to: [12, 62] },
		{ name: 'arm', shape: 'line', at: [71, 50], to: [88, 62] },
		{ name: 'antenna', shape: 'line', at: [50, 8], to: [50, -2] },
		{ name: 'buttons', shape: 'dots', at: [50, 58], size: [18, 4], count: 3 }
	] },

	// ── food ──────────────────────────────────────────────────────────────────
	{ name: 'cake', words: ['cupcake', 'birthday'], colourIdea: 'pink', face: { at: [50, 66], r: 16 }, pieces: [
		{ name: 'cake', shape: 'box', at: [50, 66], size: [64, 36] },
		{ name: 'icing', shape: 'wave', at: [18, 50], to: [82, 50], size: [0, 3], count: 4 },
		{ name: 'candle', shape: 'box', at: [50, 38], size: [6, 20] },
		{ name: 'flame', shape: 'triangle', at: [50, 22], size: [8, 12], dir: -90 }
	] },
	{ name: 'icecream', words: ['ice', 'cone', 'lolly'], colourIdea: 'pink', face: { at: [50, 34], r: 14 }, pieces: [
		{ name: 'scoop', shape: 'loop', at: [50, 34], size: [40, 34] },
		{ name: 'cone', shape: 'triangle', at: [50, 70], size: [36, 50], dir: 90 },
		{ name: 'cherry', shape: 'loop', at: [52, 13], size: [8, 8] }
	] },
	{ name: 'pizza', colourIdea: 'yellow', pieces: [
		{ name: 'pizza', shape: 'loop', at: [50, 50], size: [80, 80] },
		{ name: 'slices', shape: 'cross', at: [50, 50], size: [76, 76] },
		{ name: 'pepperoni', shape: 'dots', at: [50, 34], size: [40, 10], count: 3 },
		{ name: 'cheese', shape: 'dots', at: [50, 66], size: [40, 10], count: 3 }
	] },
	{ name: 'spaghetti', words: ['pasta', 'noodles'], colourIdea: 'yellow', pieces: [
		{ name: 'plate', shape: 'loop', at: [50, 64], size: [86, 30] },
		{ name: 'noodles', shape: 'scribble', at: [50, 54], size: [46, 30] },
		{ name: 'meatballs', shape: 'dots', at: [50, 50], size: [24, 6], count: 2 },
		{ name: 'fork', shape: 'line', at: [84, 30], to: [70, 56] }
	] },
	{ name: 'apple', colourIdea: 'red', face: { at: [50, 58], r: 18 }, pieces: [
		{ name: 'apple', shape: 'loop', at: [50, 58], size: [56, 52] },
		{ name: 'stalk', shape: 'line', at: [50, 32], to: [53, 18] },
		{ name: 'leaf', shape: 'loop', at: [62, 22], size: [14, 7] }
	] },
	{ name: 'banana', colourIdea: 'yellow', face: { at: [50, 58], r: 12 }, pieces: [
		{ name: 'banana', shape: 'U', at: [50, 52], size: [70, 30] },
		{ name: 'inside', shape: 'U', at: [50, 46], size: [60, 20] },
		{ name: 'tip', shape: 'line', at: [15, 37], to: [12, 32] }
	] },
	{ name: 'carrot', colourIdea: 'orange', pieces: [
		{ name: 'carrot', shape: 'triangle', at: [50, 60], size: [26, 64], dir: 90 },
		{ name: 'leaves', shape: 'rays', at: [50, 22], size: [24, 24], count: 4 }
	] },
	{ name: 'cup', words: ['mug', 'tea', 'coffee'], colourIdea: 'blue', face: { at: [44, 60], r: 13 }, pieces: [
		{ name: 'cup', shape: 'box', at: [44, 60], size: [44, 46] },
		{ name: 'handle', shape: 'loop', at: [68, 58], size: [16, 22] },
		{ name: 'steam', shape: 'wave', at: [40, 32], to: [44, 10], size: [0, 3], count: 1.5 }
	] },

	// ── sky and nature ────────────────────────────────────────────────────────
	{ name: 'star', words: ['stars'], colourIdea: 'yellow', face: { at: [50, 52], r: 12 }, pieces: [
		{ name: 'star', shape: 'star', at: [50, 50], size: [70, 70] }
	] },
	{ name: 'moon', colourIdea: 'yellow', face: { at: [40, 50], r: 12 }, pieces: [
		{ name: 'moon', shape: 'crescent', at: [50, 50], size: [70, 70] }
	] },
	{ name: 'rainbow', colourIdea: 'red', pieces: [
		{ name: 'rainbow', shape: 'arc', at: [50, 45], size: [90, 40] },
		{ name: 'band', shape: 'arc', at: [50, 51], size: [72, 31] },
		{ name: 'band', shape: 'arc', at: [50, 57], size: [54, 22] }
	] },
	{ name: 'mountain', words: ['mountains', 'hill', 'volcano'], colourIdea: 'green', pieces: [
		{ name: 'mountain', shape: 'triangle', at: [42, 58], size: [70, 60], dir: -90 },
		{ name: 'snow', shape: 'zigzag', at: [33, 40], to: [51, 40], size: [0, 4], count: 2 },
		{ name: 'hill', shape: 'arc', at: [76, 76], size: [44, 16] }
	] },
	{ name: 'sea', words: ['beach', 'waves', 'water', 'ocean', 'lake', 'river', 'pond'], colourIdea: 'blue', pieces: [
		{ name: 'waves', shape: 'wave', at: [4, 50], to: [96, 50], size: [0, 4], count: 4 },
		{ name: 'wave', shape: 'wave', at: [8, 64], to: [92, 64], size: [0, 4], count: 4 },
		{ name: 'sand', shape: 'dots', at: [50, 84], size: [70, 6], count: 5 }
	] },
	{ name: 'snowman', colourIdea: 'blue', face: { at: [50, 26], r: 12 }, pieces: [
		{ name: 'body', shape: 'loop', at: [50, 70], size: [50, 44] },
		{ name: 'head', shape: 'loop', at: [50, 28], size: [32, 30] },
		{ name: 'buttons', shape: 'dots', at: [50, 66], size: [4, 24], count: 3 },
		{ name: 'nose', shape: 'triangle', at: [58, 30], size: [6, 12], dir: 0 },
		{ name: 'hat', shape: 'box', at: [50, 8], size: [22, 12] },
		{ name: 'arms', shape: 'line', at: [26, 64], to: [8, 50] },
		{ name: 'arm', shape: 'line', at: [74, 64], to: [92, 50] }
	] },
	{ name: 'ghost', words: ['ghosts', 'spooky'], face: { at: [50, 40], r: 16 }, pieces: [
		{ name: 'ghost', shape: 'U', at: [50, 70], size: [50, 64] },
		{ name: 'hem', shape: 'zigzag', at: [25, 70], to: [75, 70], size: [0, 6], count: 3 }
	] },

	// ── things and places ─────────────────────────────────────────────────────
	{ name: 'umbrella', colourIdea: 'red', pieces: [
		{ name: 'umbrella', shape: 'arc', at: [50, 28], size: [80, 26] },
		{ name: 'edge', shape: 'wave', at: [10, 41], to: [90, 41], size: [0, 3], count: 3 },
		{ name: 'handle', shape: 'line', at: [50, 41], to: [50, 86] },
		{ name: 'hook', shape: 'U', at: [44, 92], size: [12, 8] }
	] },
	{ name: 'book', words: ['books', 'diary', 'homework', 'taxes', 'tax', 'paper', 'papers', 'letter', 'bills'], colourIdea: 'blue', pieces: [
		{ name: 'page', shape: 'box', at: [36, 50], size: [32, 44] },
		{ name: 'page', shape: 'box', at: [66, 50], size: [32, 44] },
		{ name: 'lines', shape: 'wave', at: [24, 40], to: [46, 40], size: [0, 1.5], count: 2 },
		{ name: 'lines', shape: 'wave', at: [56, 40], to: [78, 40], size: [0, 1.5], count: 2 }
	] },
	{ name: 'phone', words: ['phones', 'tablet', 'ipad'], colourIdea: 'black', face: { at: [50, 48], r: 12 }, pieces: [
		{ name: 'phone', shape: 'box', at: [50, 50], size: [34, 62] },
		{ name: 'screen', shape: 'box', at: [50, 46], size: [26, 42] },
		{ name: 'button', shape: 'dots', at: [50, 74], size: [2, 2], count: 1 }
	] },
	{ name: 'computer', words: ['laptop', 'computers', 'screen', 'tv', 'television'], colourIdea: 'grey', face: { at: [50, 38], r: 14 }, pieces: [
		{ name: 'screen', shape: 'box', at: [50, 38], size: [64, 44] },
		{ name: 'keyboard', shape: 'box', at: [50, 74], size: [74, 14] },
		{ name: 'keys', shape: 'dots', at: [50, 74], size: [50, 2], count: 4 }
	] },
	{ name: 'guitar', words: ['guitars', 'ukulele', 'violin'], colourIdea: 'brown', pieces: [
		{ name: 'body', shape: 'loop', at: [50, 70], size: [44, 40] },
		{ name: 'neck', shape: 'box', at: [50, 30], size: [8, 44] },
		{ name: 'hole', shape: 'loop', at: [50, 70], size: [12, 12] },
		{ name: 'strings', shape: 'line', at: [50, 10], to: [50, 82] }
	] },
	{ name: 'boat', words: ['ship', 'sailboat', 'pirate'], colourIdea: 'blue', pieces: [
		{ name: 'boat', shape: 'U', at: [50, 74], size: [76, 22] },
		{ name: 'mast', shape: 'line', at: [50, 63], to: [50, 12] },
		{ name: 'sail', shape: 'triangle', at: [64, 38], size: [26, 46], dir: 0 },
		{ name: 'water', shape: 'wave', at: [4, 90], to: [96, 90], size: [0, 3], count: 4 }
	] },
	{ name: 'rocket', words: ['spaceship', 'rockets'], colourIdea: 'red', pieces: [
		{ name: 'rocket', shape: 'box', at: [50, 54], size: [28, 50] },
		{ name: 'nose', shape: 'triangle', at: [50, 20], size: [28, 22], dir: -90 },
		{ name: 'window', shape: 'loop', at: [50, 46], size: [12, 12] },
		{ name: 'fins', shape: 'triangle', at: [30, 76], size: [12, 16], dir: 180 },
		{ name: 'fin', shape: 'triangle', at: [70, 76], size: [12, 16], dir: 0 },
		{ name: 'fire', shape: 'zigzag', at: [40, 86], to: [60, 86], size: [0, 8], count: 3 }
	] },
	{ name: 'plane', words: ['aeroplane', 'airplane', 'jet'], colourIdea: 'blue', pieces: [
		{ name: 'plane', shape: 'loop', at: [50, 50], size: [80, 18] },
		{ name: 'wing', shape: 'triangle', at: [48, 64], size: [16, 26], dir: 90 },
		{ name: 'tail', shape: 'triangle', at: [16, 36], size: [10, 16], dir: -90 },
		{ name: 'windows', shape: 'dots', at: [58, 48], size: [26, 2], count: 3 }
	] },
	{ name: 'bike', words: ['bicycle', 'cycling'], colourIdea: 'red', pieces: [
		{ name: 'wheel', shape: 'loop', at: [24, 68], size: [32, 32] },
		{ name: 'wheel', shape: 'loop', at: [76, 68], size: [32, 32] },
		{ name: 'frame', shape: 'triangle', at: [50, 58], size: [44, 22], dir: 90 },
		{ name: 'seat', shape: 'line', at: [34, 42], to: [44, 42] },
		{ name: 'handlebars', shape: 'line', at: [70, 40], to: [76, 34] }
	] },
	{ name: 'tent', words: ['camping'], colourIdea: 'green', pieces: [
		{ name: 'tent', shape: 'triangle', at: [50, 58], size: [80, 60], dir: -90 },
		{ name: 'door', shape: 'triangle', at: [50, 74], size: [22, 28], dir: -90 }
	] },
	{ name: 'castle', words: ['sandcastle', 'palace'], colourIdea: 'grey', pieces: [
		{ name: 'castle', shape: 'box', at: [50, 64], size: [70, 50] },
		{ name: 'battlements', shape: 'zigzag', at: [15, 39], to: [85, 39], size: [0, -8], count: 4 },
		{ name: 'door', shape: 'tab', at: [50, 78], size: [18, 22] },
		{ name: 'flag', shape: 'triangle', at: [58, 12], size: [10, 14], dir: 0 },
		{ name: 'pole', shape: 'line', at: [50, 39], to: [50, 6] }
	] },
	{ name: 'crown', words: ['tiara'], colourIdea: 'yellow', pieces: [
		{ name: 'crown', shape: 'zigzag', at: [20, 40], to: [80, 40], size: [0, -20], count: 3 },
		{ name: 'band', shape: 'box', at: [50, 52], size: [60, 22] },
		{ name: 'jewels', shape: 'dots', at: [50, 52], size: [36, 2], count: 3 }
	] },
	{ name: 'heart', words: ['hearts', 'love'], colourIdea: 'red', face: { at: [50, 46], r: 14 }, pieces: [
		{ name: 'heart', shape: 'heart', at: [50, 50], size: [70, 70] }
	] }
];

/** Forms by name and by any of their words. */
export const FORM_BY_WORD: ReadonlyMap<string, Form> = new Map(FORMS.flatMap((f) => [f.name, ...(f.words ?? [])].map((w) => [w, f] as const)));

export function formFor(name: string | undefined): Form | undefined {
	return name ? FORM_BY_WORD.get(name.toLowerCase()) : undefined;
}
