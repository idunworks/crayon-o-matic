import type { Part, ThingKind } from '../types.js';
import { animal2, animal4, bug, fish } from './animals.js';
import type { BuildCtx, Built } from './common.js';
import { person } from './person.js';
import { blob, cloud, flower, house, sun, tree, vehicle } from './things.js';

export type { BuildCtx, Built, LocalStroke } from './common.js';

type Builder = (parts: readonly Part[], ctx: BuildCtx) => Built;

const BUILDERS: Record<ThingKind, Builder> = {
	person,
	animal4,
	animal2,
	fish,
	bug,
	house,
	vehicle,
	tree,
	flower,
	sun,
	cloud,
	food: blob,
	object: blob,
	blob
};

export function build(kind: ThingKind, parts: readonly Part[], ctx: BuildCtx): Built {
	return BUILDERS[kind](parts, ctx);
}
