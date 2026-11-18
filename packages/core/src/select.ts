/**
 * Which parts survive (spec §4.3 step 1). Parts are listed in the order a child adds
 * them, so the budget cuts from the tail. The main thing always keeps its first two
 * parts (head and eyes for a person); a young, bored child may skip the rest of the scene.
 */
import type { Rng } from './rng.js';
import type { Capabilities, ConceptScene, Part, Thing } from './types.js';

/** Share of the part budget the main thing takes when there are others (tuned). */
const MAIN_SHARE = 0.65;
/** The main thing never drops below this many parts. */
const MAIN_MIN_PARTS = 2;
/** chaos 1 → this chance per extra slot (tuned); two slots. */
const EXTRA_CHANCE_AT_FULL_CHAOS = 0.8;
const EXTRA_SLOTS = 2;

export interface Selected {
	thing: Thing;
	parts: Part[];
	main: boolean;
	extra: boolean;
}

function isTrunk(p: Part): boolean {
	return /^(trunk|body)$/i.test(p.name);
}

/** Parts a figure type can't have at all (tadpoles have no separate trunk). */
function allowed(thing: Thing, caps: Capabilities): Part[] {
	if (thing.kind === 'person' && caps.figureType === 'tadpole') return thing.parts.filter((p) => !isTrunk(p));
	return [...thing.parts];
}

/** Small things a child adds on their own (spec §4.1 extras, chaos dial). */
export function extraThing(name: string, index: number): Thing {
	const id = `extra-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
	const base = { id, label: name, importance: 0.15, expression: 'happy' as const };
	switch (name.toLowerCase()) {
		case 'sun':
			return { ...base, kind: 'sun', parts: [{ name: 'disc', primitive: 'loop' }, { name: 'rays', primitive: 'rays' }, { name: 'face', primitive: 'U' }] };
		case 'cloud':
			return { ...base, kind: 'cloud', expression: 'none', parts: [{ name: 'cloud', primitive: 'loop' }] };
		case 'flower':
			return { ...base, kind: 'flower', expression: 'none', parts: [{ name: 'middle', primitive: 'loop' }, { name: 'petals', primitive: 'loop' }, { name: 'stem', primitive: 'line' }] };
		case 'bird':
			return { ...base, kind: 'blob', expression: 'none', parts: [{ name: 'bird', primitive: 'arc' }] };
		default:
			return { ...base, kind: 'blob', expression: 'none', parts: [{ name: name.toLowerCase(), primitive: name.toLowerCase() === 'heart' ? 'heart' : 'loop' }] };
	}
}

export function selectParts(scene: ConceptScene, caps: Capabilities, chaos: number, rng: Rng): Selected[] {
	const budget = Math.max(MAIN_MIN_PARTS, Math.floor(caps.partBudget));
	const [main, ...others] = scene.things;
	if (!main) return [];

	const out: Selected[] = [];
	const mainParts = allowed(main, caps);
	const mainKeep = Math.min(mainParts.length, Math.max(MAIN_MIN_PARTS, others.length ? Math.round(budget * MAIN_SHARE) : budget));
	out.push({ thing: main, parts: mainParts.slice(0, mainKeep), main: true, extra: false });

	let left = budget - mainKeep;
	for (const thing of others) {
		if (left < 1) break;
		const parts = allowed(thing, caps);
		const othersLeft = others.length - (out.length - 1);
		const keep = Math.min(parts.length, Math.max(1, Math.floor(left / othersLeft)));
		out.push({ thing, parts: parts.slice(0, keep), main: false, extra: false });
		left -= keep;
	}

	// chaos: the child improvises a sun in the corner, a heart ...
	const pool = scene.extras.length ? scene.extras : ['sun', 'heart'];
	for (let i = 0; i < EXTRA_SLOTS; i++) {
		if (!rng.chance(chaos * EXTRA_CHANCE_AT_FULL_CHAOS)) continue;
		const t = extraThing(rng.pick(pool), i);
		out.push({ thing: t, parts: t.parts, main: false, extra: true });
	}
	return out;
}
