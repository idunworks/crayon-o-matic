/**
 * Colour (spec §1.6, §4.6), restricted to the drawing's palette: 1 to 3 colours.
 * Owner rule (2026-11-17): keep drawings to one colour, maybe 2–3, so they stay
 * clean vectors for printing. The colour modes still choose *within* the palette:
 *   realistic → the palette colour closest to the thing's real colour
 *   favourite → mostly the first palette colour
 *   nearest   → walk the palette, "whatever crayon was nearest"
 */
import type { Rng } from './rng.js';
import { DEFAULT_DIALS, MAX_PALETTE, type Capabilities, type ColourMode, type Thing } from './types.js';

/** Reference colours, only used to find the nearest palette colour. */
const REAL_COLOURS: Record<string, string> = {
	red: '#d7263d',
	orange: '#f46036',
	yellow: '#f4c430',
	green: '#2e9e44',
	blue: '#1f5fbf',
	purple: '#7b3fa0',
	pink: '#ef6aa8',
	brown: '#8a5a2b',
	black: '#232323'
};

/** What colour a thing "is", for the realistic mode. */
const REAL: Partial<Record<string, string>> = {
	sun: 'yellow',
	tree: 'green',
	grass: 'green',
	flower: 'pink',
	cloud: 'blue',
	house: 'red',
	fish: 'orange',
	cat: 'orange',
	dog: 'brown',
	dragon: 'green',
	car: 'red',
	heart: 'red',
	spaghetti: 'yellow',
	grandma: 'purple'
};

/** Furious things lean to the reddest palette colour (spec §4.7); tuned. */
const FURIOUS_RED = 0.7;
/** Favourite mode: share of things in the first palette colour (tuned). */
const FAVOURITE_SHARE = 0.75;
const HEX = /^#[0-9a-f]{6}$/i;

function rgb(hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function nearest(target: string, palette: readonly string[]): string {
	const [r, g, b] = rgb(target);
	let best = palette[0]!;
	let bestD = Infinity;
	for (const c of palette) {
		const [r2, g2, b2] = rgb(c);
		const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
		if (d < bestD) [best, bestD] = [c, d];
	}
	return best;
}

/** A valid palette: 1 to MAX_PALETTE distinct hex colours, lower-cased; black when empty. */
export function normalisePalette(palette: readonly string[] | undefined): string[] {
	const seen = new Set<string>();
	for (const c of palette ?? []) {
		const hex = c.trim().toLowerCase();
		if (HEX.test(hex)) seen.add(hex);
	}
	const out = [...seen].slice(0, MAX_PALETTE);
	return out.length ? out : [...DEFAULT_DIALS.palette];
}

export interface ColourPicker {
	pick(thing: Pick<Thing, 'label' | 'kind' | 'colourIdea' | 'expression'>): string;
}

/** One picker per drawing, so "favourite" and "nearest" stay consistent across things. */
export function colourPicker(mode: ColourMode, caps: Capabilities, palette: readonly string[], rng: Rng): ColourPicker {
	const pal = normalisePalette(palette);
	let walk = 0;
	return {
		pick(thing) {
			if (pal.length === 1) return pal[0]!;
			if (thing.expression === 'furious' && rng.chance(FURIOUS_RED)) return nearest(REAL_COLOURS.red!, pal);
			const realName = thing.colourIdea?.toLowerCase() ?? REAL[thing.label.toLowerCase()] ?? REAL[thing.kind];
			const real = realName ? REAL_COLOURS[realName] : undefined;
			if (real && (mode === 'realistic' || rng.chance(caps.colourRealism))) return nearest(real, pal);
			if (mode === 'favourite') return rng.chance(FAVOURITE_SHARE) ? pal[0]! : rng.pick(pal);
			if (rng.chance(0.45)) walk = (walk + 1) % pal.length;
			return pal[walk]!;
		}
	};
}
