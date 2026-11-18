/**
 * Every science number in the app, in one place (spec §1, §3). Mirrored in SCIENCE.md.
 *
 * status:
 *   'verify' — from the literature named in `source`, not yet checked against the paper.
 *   'tuned'  — chosen by eye to look right; no citation. Never present a tuned value as science.
 *
 * Curves are piecewise-linear over age; values outside the first/last anchor are clamped.
 * A PR that changes a number must change its source note too.
 */
import type { Shape } from './types.js';

export type AnchorStatus = 'verify' | 'tuned';

export interface Anchor {
	/** [age, value] pairs, ascending by age. */
	points: readonly (readonly [number, number])[];
	source: string;
	status: AnchorStatus;
}

export interface Milestone {
	shape: Shape;
	/** Typical age the shape can be copied. */
	age: number;
	source: string;
	status: AnchorStatus;
}

const COPY_NORMS = 'Gesell / Beery VMI shape-copying norms (spec §1.2)';

/** Shapes a child can copy, by age (spec §1.2). A child can't use a shape before its milestone. */
export const SHAPE_MILESTONES: readonly Milestone[] = [
	{ shape: 'vline', age: 2.0, source: COPY_NORMS, status: 'verify' },
	{ shape: 'hline', age: 2.5, source: COPY_NORMS, status: 'verify' },
	{ shape: 'circle', age: 3.0, source: COPY_NORMS, status: 'verify' },
	{ shape: 'cross', age: 4.0, source: COPY_NORMS, status: 'verify' },
	{ shape: 'diagonal', age: 4.5, source: COPY_NORMS, status: 'verify' },
	{ shape: 'square', age: 4.75, source: `${COPY_NORMS}; spec gives 4.5–5, midpoint used`, status: 'verify' },
	{ shape: 'x', age: 5.0, source: COPY_NORMS, status: 'verify' },
	{ shape: 'triangle', age: 5.0, source: COPY_NORMS, status: 'verify' }
];

/** Seeded slack on milestones, in years: some children are early, some late. */
export const MILESTONE_SLACK = { value: 0.2, source: 'small, so age 3.0 never gets a square', status: 'tuned' } as const;

/** Figure type boundaries and their seeded wobble (spec §1.3, §3). */
export const FIGURE_TYPE = {
	tadpoleBelow: 4.0,
	transitionalBelow: 5.0,
	wobbleYears: 0.3,
	source: 'Cox 1992; Freeman 1980 (tadpole ~3–4.5, transitional ~4–5, conventional ~5–6); ±0.3 wobble from spec §3',
	status: 'verify' as AnchorStatus
};

export const ANCHORS = {
	/** Recognisable parts in a human figure (spec §1.3). */
	partBudget: {
		points: [[2.5, 2], [3, 3], [4, 7], [5, 11], [6, 14]],
		source: 'Goodenough 1926 / Harris 1963 Draw-a-Man scoring: ~2–4 at 3, ~5–8 at 4, ~8–12 at 5, ~12–16 at 6 (midpoints); 2.5 tuned',
		status: 'verify'
	},
	/** Head height ÷ rest of the figure (spec §1.3). */
	headRatio: {
		points: [[2.5, 1.4], [3, 1.3], [4, 1.0], [5, 0.7], [6, 0.5]],
		source: "Freeman 1980 body-proportion effect; Thomas & Tsalimi: ~1:1 at 4 → ~1:2 by 6; 2.5–3 tuned",
		status: 'verify'
	},
	/** Movement size multiplier from grip stage (palmar → tripod). */
	strokeScale: {
		points: [[2.5, 1.25], [3, 1.2], [4, 1.05], [5, 1.0], [6, 0.95]],
		source: 'Schneck & Henderson 1990 grip stages (direction only); magnitudes tuned',
		status: 'tuned'
	},
	/** High-frequency wiggle, as a fraction of part size, before shakiness. */
	tremor: {
		points: [[2.5, 0.022], [3, 0.018], [4, 0.012], [5, 0.008], [6, 0.005]],
		source: 'Rueckriegel et al. 2008 drawing kinematics (smoothness improves with age); magnitudes tuned',
		status: 'tuned'
	},
	/** Slow wander off the intended path, fraction of part size, before shakiness. */
	drift: {
		points: [[2.5, 0.06], [3, 0.05], [4, 0.035], [5, 0.022], [6, 0.012]],
		source: 'Rueckriegel et al. 2008 (more drift when younger); magnitudes tuned',
		status: 'tuned'
	},
	/** Velocity peaks per stroke: jerkiness (spec §3). */
	velocityPeaks: {
		points: [[2.5, 6], [3, 6], [6, 2]],
		source: 'Rueckriegel et al. 2008: more velocity peaks per stroke when younger; spec §3 lerp 3→6, 6→2',
		status: 'verify'
	},
	/** Gap or overshoot at joins, fraction of part size. */
	joinError: {
		points: [[2.5, 0.2], [3, 0.16], [4, 0.1], [5, 0.06], [6, 0.035]],
		source: 'Luquet 1927 synthetic incapacity (direction); magnitudes tuned',
		status: 'tuned'
	},
	/** How far a closed loop misses its start, fraction of part size. */
	closureMiss: {
		points: [[2.5, 0.2], [3, 0.16], [4, 0.1], [5, 0.06], [6, 0.035]],
		source: 'spec §3 "3 → often open, 6 → mostly closed, small tail"; magnitudes tuned',
		status: 'tuned'
	},
	/** Chaikin passes on intended corners; children under 5 round them off. */
	cornerRounding: {
		points: [[2.5, 3], [4.5, 2], [5, 1], [6, 0]],
		source: 'spec §4.4 "sharp corner → rounded if age < 5"; tuned',
		status: 'tuned'
	},
	/** Chance an animal gets a front face on a side-on body. */
	mixedView: {
		points: [[2.5, 0.6], [4, 0.85], [5, 0.85], [6, 0.5]],
		source: 'Cox (mixed views in animal drawings, high at 4–5)',
		status: 'verify'
	},
	/** Chance of x-ray / transparency drawing. */
	xray: {
		points: [[2.5, 0], [4.5, 0], [6, 0.3]],
		source: 'spec §1.5: rare at 4, ~5–7; tuned to ~0.3 at 6',
		status: 'verify'
	},
	/** How often colour follows reality (spec §1.6). */
	colourRealism: {
		points: [[2.5, 0.05], [3, 0.1], [6, 0.6]],
		source: 'Lowenfeld: emotional colour in preschool, realistic from ~5–6',
		status: 'verify'
	},
	/** Share of a shape that gets coloured in, before attention. */
	fillCoverage: {
		points: [[2.5, 0.25], [3, 0.3], [6, 0.8]],
		source: 'spec §3 lerp 3→0.3, 6→0.8; tuned',
		status: 'tuned'
	},
	/** How far colouring escapes the outline, fraction of shape size. */
	fillOverflow: {
		points: [[2.5, 0.3], [3, 0.25], [6, 0.03]],
		source: 'spec §1.6 "way outside the lines" (young) → "mostly inside" (older); tuned',
		status: 'tuned'
	},
	/** Gap between colouring strokes, fraction of shape size. */
	fillSpacing: {
		points: [[2.5, 0.28], [3, 0.24], [6, 0.08]],
		source: 'spec §1.6 sparse zigzag → dense hatch; tuned',
		status: 'tuned'
	},
	/** Expression vocabulary: 0 mouth only, 1 + eyes, 2 + brows sometimes, 3 + brows, tears, steam. */
	expressionSkill: {
		points: [[2.5, 0], [3, 0], [4, 1], [5, 2], [6, 3]],
		source: 'spec §1.3: mouth curve first (4–5 intentional happy/sad), brows later and less reliable',
		status: 'verify'
	}
} as const satisfies Record<string, Anchor>;

export type AnchorKey = keyof typeof ANCHORS;

/** Piecewise-linear lookup, clamped at both ends. */
export function lookup(key: AnchorKey, age: number): number {
	const pts = ANCHORS[key].points;
	const first = pts[0];
	const last = pts[pts.length - 1];
	if (!first || !last) throw new Error(`anchor ${key} has no points`);
	if (age <= first[0]) return first[1];
	if (age >= last[0]) return last[1];
	for (let i = 1; i < pts.length; i++) {
		const [a1, v1] = pts[i] as readonly [number, number];
		const [a0, v0] = pts[i - 1] as readonly [number, number];
		if (age <= a1) return v0 + ((v1 - v0) * (age - a0)) / (a1 - a0);
	}
	return last[1];
}

/** Ages the anchor table is defined over (the age dial range). */
export const AGE_MIN = 2.5;
export const AGE_MAX = 6.0;
