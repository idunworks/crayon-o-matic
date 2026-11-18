/**
 * Seeded randomness. Every random choice in the pipeline comes from here, so the
 * same seed and dials always give the same drawing (spec §0, §4.4).
 *
 * Streams are keyed by string: `rngFor(seed, 'hand/grandma/head/0')` is independent
 * of every other key, so changing one stroke never changes the others.
 */

/** FNV-1a 32-bit hash of a string. */
export function hashString(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** Mix two 32-bit ints into one. */
function mix(a: number, b: number): number {
	let h = (a ^ Math.imul(b, 0x9e3779b1)) >>> 0;
	h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	return (h ^ (h >>> 16)) >>> 0;
}

export interface Rng {
	/** [0, 1) */
	next(): number;
	/** [min, max) */
	range(min: number, max: number): number;
	/** Integer in [min, max] inclusive. */
	int(min: number, max: number): number;
	/** true with probability p. */
	chance(p: number): boolean;
	pick<T>(items: readonly T[]): T;
	/** -1 or 1. */
	sign(): number;
	/** Roughly normal, mean 0, sd 1 (sum of uniforms). */
	gauss(): number;
}

/** mulberry32: small, fast, good enough for drawing. */
export function makeRng(seed: number): Rng {
	let a = seed >>> 0;
	const next = (): number => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		range: (min, max) => min + (max - min) * next(),
		int: (min, max) => Math.floor(min + (max - min + 1) * next()),
		chance: (p) => next() < p,
		pick: <T>(items: readonly T[]): T => {
			if (items.length === 0) throw new Error('rng.pick: empty list');
			return items[Math.floor(next() * items.length)] as T;
		},
		sign: () => (next() < 0.5 ? -1 : 1),
		gauss: () => next() + next() + next() + next() - 2
	};
}

/** An independent stream for one key under one seed. */
export function rngFor(seed: number, key: string): Rng {
	return makeRng(mix(seed >>> 0, hashString(key)));
}

/**
 * Smooth 1D value noise in [-1, 1], continuous in t. Lattice values are hashed
 * from (seed, key, i), so the curve is fixed for a key and needs no state.
 */
export function noise1(seed: number, key: string, t: number): number {
	const base = mix(seed >>> 0, hashString(key));
	const i = Math.floor(t);
	const f = t - i;
	const v = (n: number) => (mix(base, n >>> 0) / 4294967296) * 2 - 1;
	const s = f * f * (3 - 2 * f);
	return v(i) * (1 - s) + v(i + 1) * s;
}
