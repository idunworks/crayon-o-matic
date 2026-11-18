/**
 * Offline interpreter (spec §4.1): motif text → ConceptScene from keyword templates.
 * Deterministic per motif, no network. Phase 2's Claude step returns the same shape.
 */
import { hashString, makeRng, type ConceptScene, type Expression, type Part, type Pose, type Thing } from '@crayon-o-matic/core';
import { parseScene } from './schema.js';
import { TEMPLATES, templateFor, type Template } from './templates.js';

const MAX_MOTIF = 200;
const MAX_THINGS = 3;
const IMPORTANCE = [1, 0.55, 0.4] as const;

const MOODS: readonly [RegExp, Expression][] = [
	[/\b(furious|angry|mad|cross|raging|livid)\b/, 'furious'],
	[/\b(grumpy|smirk|smirking|smug|sly|sarcastic|sassy|cheeky)\b/, 'smirk'],
	[/\b(frowning|frown|annoyed)\b/, 'frowned'],
	[/\b(sad|crying|upset|lonely)\b/, 'sad'],
	[/\b(laughing|giggling|funny|lol)\b/, 'laughing'],
	[/\b(bored|meh|unimpressed|disappointed|tired|sleepy)\b/, 'meh'],
	[/\b(scared|afraid|frightened|spooked)\b/, 'scared'],
	[/\b(surprised|shocked|amazed)\b/, 'surprised'],
	[/\b(happy|smiling|glad|cheerful|excited)\b/, 'happy']
];

const POSE_WORDS: readonly [RegExp, Pose][] = [
	[/\b(sitting|sits|sat|seated)\b/, 'sitting'],
	[/\b(standing|stands|walking|walks)\b/, 'standing']
];

/** The motif's pose word if it has one, else a child's pick among the template's poses. */
function poseFor(text: string, t: Template, rng: ReturnType<typeof makeRng>): Pose | undefined {
	if (!t.poses?.length) return undefined;
	const said = POSE_WORDS.find(([re, pose]) => re.test(text) && t.poses!.includes(pose));
	return said ? said[1] : rng.pick(t.poses);
}

/** Who the kid's line blames when the motif has no second thing. */
const STAND_INS = ['monster', 'dog', 'cat', 'baby'] as const;

/** "me" after these words is the viewer, not a thing to draw ("disappointed in me"). */
const OBJECT_PREPOSITIONS = new Set(['in', 'at', 'on', 'to', 'of', 'for', 'with', 'by', 'about']);

const KID_SAYS: Record<Expression, readonly string[]> = {
	furious: ['this is {main} she is angry because the {other} did a wee', 'that is {main} being VERY cross', '{main} is so angry her head is going to pop'],
	frowned: ['{main} is cross today', 'this is {main} doing a frown'],
	smirk: ['{main} is grumpy and knows something', 'this is {main} doing the face', '{main} says I told you so'],
	sad: ['{main} is sad because nobody gave her a biscuit', 'this is {main} crying a bit'],
	laughing: ['{main} is laughing so much', 'this is {main} and she thinks it is so funny'],
	meh: ['{main} is not impressed', 'this is {main} and she is bored of you'],
	scared: ['{main} is scared of the {other}', 'this is {main} and something is behind her'],
	surprised: ['{main} said WHAT', 'this is {main} and she got a surprise'],
	happy: ['this is {main} she is happy', '{main} is happy because it is my birthday'],
	none: ['this is {main}', 'I drawed {main}']
};

export function moodOf(text: string): Expression | undefined {
	for (const [re, mood] of MOODS) if (re.test(text)) return mood;
	return undefined;
}

function idFor(label: string, used: Set<string>): string {
	const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'thing';
	let id = base;
	for (let i = 2; used.has(id); i++) id = `${base}-${i}`;
	used.add(id);
	return id;
}

/** A smiley blob for a word no template knows: a child draws *something*. */
function unknownThing(word: string): Template {
	const parts: Part[] = [{ name: 'body', primitive: 'loop' }, { name: 'eyes', primitive: 'dots', count: 2 }, { name: 'mouth', primitive: 'U' }];
	return { words: [word], label: word, kind: 'blob', parts };
}

export interface OfflineOptions {
	/** Overrides the mood read from the motif. */
	expression?: Expression;
}

export function interpretOffline(motif: string, opts: OfflineOptions = {}): ConceptScene {
	const text = motif.slice(0, MAX_MOTIF).toLowerCase();
	const words = text.match(/[a-z]+/g) ?? [];
	const rng = makeRng(hashString(text));

	const found: Template[] = [];
	words.forEach((w, i) => {
		if (w === 'me' && OBJECT_PREPOSITIONS.has(words[i - 1] ?? '')) return;
		const t = templateFor(w);
		if (t && !found.includes(t) && found.length < MAX_THINGS) found.push(t);
	});
	if (found.length === 0) {
		const noun = [...words].filter((w) => w.length > 2).sort((a, b) => b.length - a.length)[0] ?? 'blob';
		found.push(unknownThing(noun));
	}

	const mood = opts.expression ?? moodOf(text) ?? 'happy';
	const used = new Set<string>();
	const things: Thing[] = found.map((t, i) => {
		const pose = poseFor(text, t, rng);
		const thing: Thing = {
			id: idFor(t.label, used),
			label: t.label,
			kind: t.kind,
			importance: IMPORTANCE[i] ?? 0.3,
			expression: i === 0 ? mood : rng.pick<Expression>(['happy', 'meh', 'none']),
			parts: t.parts.map((p) => ({ ...p })),
			...(t.colourIdea ? { colourIdea: t.colourIdea } : {}),
			...(pose ? { pose } : {})
		};
		return thing;
	});
	const main = things[0]!;
	const second = things[1];
	if (second && /\bwith\b|\band\b|\bholding\b/.test(text)) second.relation = { to: main.id, how: /\bholding\b/.test(text) ? 'holding' : 'next-to' };

	const other = second?.label ?? STAND_INS.find((s) => s !== main.label) ?? 'monster';
	const says = rng.pick(KID_SAYS[mood]).replaceAll('{main}', main.label).replaceAll('{other}', other);
	return parseScene({
		title: `${mood === 'none' || mood === 'happy' ? '' : `${mood} `}${main.label}${second ? ` and the ${second.label}` : ''}`.trim(),
		kidSays: says,
		things,
		extras: ['sun', 'heart', 'cloud', 'flower']
	});
}

/** Every motif word the offline templates know, for help text and tests. */
export const KNOWN_WORDS: readonly string[] = TEMPLATES.flatMap((t) => t.words);
