/**
 * Rules over models: where the built-in templates know better, they win. Small models get
 * the gist right but slip on details (a mum without legs, "grumpy" read as sad), and the
 * rules are free, instant and the same every time. The model fills in what the rules don't
 * know: new things, poses, relations and the kid's line.
 */
import type { ConceptScene, Expression, Part, Thing } from '@crayon-o-matic/core';
import { moodOf } from './offline.js';
import { templateFor, type Template } from './templates.js';

/** Most parts a thing keeps after merging the template's with the model's own. */
const MAX_PARTS = 20;

function templateOf(label: string): Template | undefined {
	for (const word of label.toLowerCase().match(/[a-z]+/g) ?? []) {
		const t = templateFor(word);
		if (t) return t;
	}
	return undefined;
}

const key = (name: string): string => name.toLowerCase().replace(/s$/, '');

/** The template's parts in the template's order, then any extra parts the model added. */
function mergedParts(template: Template, own: readonly Part[]): Part[] {
	const known = new Set(template.parts.map((p) => key(p.name)));
	return [...template.parts.map((p) => ({ ...p })), ...own.filter((p) => !known.has(key(p.name)))].slice(0, MAX_PARTS);
}

function ruled(thing: Thing): Thing {
	const template = templateOf(thing.label);
	if (!template) return thing;
	const { pose, ...rest } = thing;
	const keepPose = pose && template.poses?.includes(pose);
	return { ...rest, kind: template.kind, parts: mergedParts(template, thing.parts), ...(keepPose ? { pose } : {}) };
}

/** Apply the rules to a model's scene: known things, the motif's mood, the person's override. */
export function withRules(scene: ConceptScene, motif: string, expression?: Expression): ConceptScene {
	const mood = expression ?? moodOf(motif.toLowerCase());
	return {
		...scene,
		things: scene.things.map((t, i) => {
			const thing = ruled(t);
			return i === 0 && mood ? { ...thing, expression: mood } : thing;
		})
	};
}
