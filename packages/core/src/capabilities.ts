/**
 * [2] Age model (spec §3): age + dials → what this child can do. Pure and seeded.
 * All numbers come from anchors.ts; this file only combines them with the dials.
 */
import { AGE_MAX, AGE_MIN, FIGURE_TYPE, MILESTONE_SLACK, SHAPE_MILESTONES, lookup } from './anchors.js';
import { rngFor } from './rng.js';
import type { Capabilities, Dials, FigureType, Grip, Layout } from './types.js';

/**
 * The shakiness dial (owner, 2026-11-18: "zero at very straight to just a mess"):
 * 0 → no tremor or drift at all, 0.5 → typical for the age, 1 → this many times typical (tuned).
 */
const SHAKE_AGE_TYPICAL = 0.5;
const SHAKE_MESS = 5;

/** Wobble multiplier for the shakiness dial: 0 at 0, 1 at 0.5, SHAKE_MESS at 1. */
export function shakeFactor(shakiness: number): number {
	const s = Math.max(0, Math.min(1, shakiness));
	if (s <= SHAKE_AGE_TYPICAL) return s / SHAKE_AGE_TYPICAL;
	return 1 + ((s - SHAKE_AGE_TYPICAL) / (1 - SHAKE_AGE_TYPICAL)) * (SHAKE_MESS - 1);
}

/** Attention scales the part budget between these factors (tuned). */
const ATTENTION_BUDGET_MIN = 0.5;
/** Attention scales colouring coverage between these factors (tuned). */
const ATTENTION_FILL_MIN = 0.4;
/** The adorable dial can push the head up to this much bigger (spec §3). */
const ADORABLE_HEAD_MAX = 0.4;
/** Grip stage boundaries (Schneck & Henderson 1990, spec §1.4). */
const GRIP_PRONATE_FROM = 3;
const GRIP_TRIPOD_FROM = 4;
/** Layout boundaries (spec §1.5, §3). */
const BASELINE_SOMETIMES_FROM = 5;
const BASELINE_FROM = 6;
/** Colouring switches from sparse zigzag to hatching around here (tuned). */
const HATCH_FROM = 4.5;

export function clampAge(age: number): number {
	return Math.min(AGE_MAX, Math.max(AGE_MIN, age));
}

function figureTypeFor(age: number, seed: number): FigureType {
	const wobble = rngFor(seed, 'caps/figure').range(-FIGURE_TYPE.wobbleYears, FIGURE_TYPE.wobbleYears);
	const effective = age + wobble;
	if (effective < FIGURE_TYPE.tadpoleBelow) return 'tadpole';
	if (effective < FIGURE_TYPE.transitionalBelow) return 'transitional';
	return 'conventional';
}

function gripFor(age: number): Grip {
	if (age < GRIP_PRONATE_FROM) return 'palmar';
	if (age < GRIP_TRIPOD_FROM) return 'pronate';
	return 'tripod';
}

function layoutFor(age: number): Layout {
	if (age < BASELINE_SOMETIMES_FROM) return 'floating';
	if (age < BASELINE_FROM) return 'baseline-sometimes';
	return 'baseline';
}

export function capabilities(dials: Dials): Capabilities {
	const age = clampAge(dials.age);
	const shake = shakeFactor(dials.shakiness);
	const attention = Math.max(0, Math.min(1, dials.attention));
	const adorable = Math.max(0, Math.min(1, dials.adorable));

	// Each shape gets its own seeded slack, fixed per seed, so the set only grows with age.
	const shapes = SHAPE_MILESTONES.filter((m) => {
		const slack = rngFor(dials.seed, `caps/shape/${m.shape}`).range(-MILESTONE_SLACK.value, MILESTONE_SLACK.value);
		return m.age + slack <= age;
	}).map((m) => m.shape);

	return {
		age,
		shapes,
		figureType: figureTypeFor(age, dials.seed),
		partBudget: lookup('partBudget', age) * (ATTENTION_BUDGET_MIN + (1 - ATTENTION_BUDGET_MIN) * attention),
		headRatio: lookup('headRatio', age) * (1 + ADORABLE_HEAD_MAX * adorable),
		grip: gripFor(age),
		strokeScale: lookup('strokeScale', age),
		tremorAmp: lookup('tremor', age) * shake,
		driftAmp: lookup('drift', age) * shake,
		velocityPeaks: lookup('velocityPeaks', age),
		joinError: lookup('joinError', age),
		closureMiss: lookup('closureMiss', age),
		cornerRounding: Math.round(lookup('cornerRounding', age)),
		layout: layoutFor(age),
		occlusion: age >= BASELINE_SOMETIMES_FROM,
		xrayChance: lookup('xray', age),
		mixedViewChance: lookup('mixedView', age),
		colourRealism: lookup('colourRealism', age),
		fillStyle: age < HATCH_FROM ? 'zigzag' : 'hatch',
		fillCoverage: lookup('fillCoverage', age) * (ATTENTION_FILL_MIN + (1 - ATTENTION_FILL_MIN) * attention),
		fillOverflow: lookup('fillOverflow', age),
		fillSpacing: lookup('fillSpacing', age),
		expressionSkill: Math.floor(lookup('expressionSkill', age))
	};
}
