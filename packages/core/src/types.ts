/**
 * Shared shapes for the whole pipeline (spec §0):
 *   ConceptScene (what is in the picture, age-free)
 *   → Capabilities (what a child of this age can do)
 *   → StrokePlan (which parts, where, in what order)
 *   → Stroke (wobbly points with widths)
 *   → SVG
 */

// ── [1] ConceptScene: the motif as a child understands it (spec §4.1) ──────────

/** The shared shape vocabulary: Kellogg's diagrams plus a few comedy extras. */
export const PRIMITIVES = [
	'loop',
	'dot',
	'dots',
	'line',
	'zigzag',
	'tab',
	'box',
	'triangle',
	'cross',
	'rays',
	'spiral',
	'scribble-cluster',
	'scribble-fill',
	'U',
	'arc',
	'heart'
] as const;
export type Primitive = (typeof PRIMITIVES)[number];

export const THING_KINDS = [
	'person',
	'animal4',
	'animal2',
	'fish',
	'bug',
	'house',
	'vehicle',
	'tree',
	'flower',
	'sun',
	'cloud',
	'food',
	'object',
	'blob'
] as const;
export type ThingKind = (typeof THING_KINDS)[number];

export const EXPRESSIONS = [
	'happy',
	'sad',
	'frowned',
	'smirk',
	'furious',
	'laughing',
	'meh',
	'scared',
	'surprised',
	'none'
] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export const POSES = ['standing', 'lying', 'flying', 'sitting', 'jumping'] as const;
export type Pose = (typeof POSES)[number];

export const RELATIONS = ['holding', 'next-to', 'on', 'inside'] as const;
export type RelationKind = (typeof RELATIONS)[number];

export interface Part {
	name: string;
	primitive: Primitive;
	count?: number;
	/** 0..1, how much the child cares. Listed order already ranks parts; this breaks ties. */
	priority?: number;
}

export interface Thing {
	id: string;
	label: string;
	kind: ThingKind;
	/** 0..1, drives size (affective size). */
	importance: number;
	expression: Expression;
	/** In the order a child adds them, most essential first. */
	parts: Part[];
	knownInside?: string[];
	colourIdea?: string;
	pose?: Pose;
	relation?: { to: string; how: RelationKind };
}

export interface ConceptScene {
	/** Kid-style title, UI only. */
	title: string;
	/** One line in a 4-year-old's voice, UI only. Never drawn. */
	kidSays: string;
	/** 1–5 things, the main one first. */
	things: Thing[];
	/** Things a child adds on their own; the chaos dial draws from these. */
	extras: string[];
}

// ── Dials: the only thing the person sets (spec §2) ───────────────────────────

export type Pressure = 'light' | 'normal' | 'hard';
/** Phase 1 ships crayon; pencil, felt-tip and marker come in phase 4. */
export type Tool = 'crayon';
export type Handedness = 'right' | 'left';
export type ColourMode = 'realistic' | 'favourite' | 'nearest';

export interface Dials {
	/** 2.5 → 6.0, continuous. */
	age: number;
	/** 0 → dead straight lines, 0.5 → typical for the age, 1 → a mess. */
		shakiness: number;
	pressure: Pressure;
	tool: Tool;
	hand: Handedness;
	/** 0 → 1: "bored after 30 s" → "very focused". */
	attention: number;
	/** 0 → 1: how much the child improvises extras. */
	chaos: number;
	colourMode: ColourMode;
	/** 0 → 1: the comedy dial, inside what a child could plausibly draw. */
	adorable: number;
	seed: number;
	/** One colour: no shadow, highlight or colouring-in. */
	lineOnly: boolean;
	/** Colour shapes in with the second palette colour (off by default; the second colour is a shadow). */
	colourIn: boolean;
	/** Where the shadow falls, in degrees: 0 = right, 90 = down (screen coordinates). */
	shadowAngle: number;
	/** How far the shadow is cast, in page units (mm). */
	shadowLength: number;
	/**
	 * 0 → every line casts a shadow; 1 → only edges facing straight away from the light.
	 * In between keeps the shadow on the side of each shape that faces the shadow.
	 */
	shadowCut: number;
	/** Where the highlight is cast, in degrees (default: toward the light, opposite the shadow). */
	highlightAngle: number;
	/** How far the highlight is cast, in mm. It needs to clear the line to show. */
	highlightLength: number;
	/** Like shadowCut, for the highlight: which edges get one. */
	highlightCut: number;
	/**
	 * The only colours the drawing may use, 1 to 3 hex colours (owner, 2026-11-17: few-colour
	 * vectors for tees). 1st: the lines. 2nd: a hard offset shadow behind them (brutalist print
	 * look). 3rd: a thin offset highlight. Not accents: no colour is used to fill things in
	 * unless `colourIn` is on.
	 */
	palette: readonly string[];
}

export const DEFAULT_DIALS: Readonly<Dials> = {
	age: 4,
	shakiness: 0.5,
	pressure: 'normal',
	tool: 'crayon',
	hand: 'right',
	attention: 0.6,
	chaos: 0.3,
	colourMode: 'favourite',
	adorable: 0.5,
	seed: 1,
	lineOnly: false,
	colourIn: false,
	shadowAngle: 50,
	shadowLength: 9,
	shadowCut: 0.6,
	highlightAngle: 230,
	highlightLength: 4,
	highlightCut: 0.6,
	palette: ['#232323']
};

/** Most colours a drawing may use. */
export const MAX_PALETTE = 3;

// ── [2] Capabilities: what a child of this age can do (spec §3) ───────────────

/** Shapes from the copying milestones (spec §1.2). */
export const SHAPES = ['vline', 'hline', 'circle', 'cross', 'diagonal', 'square', 'x', 'triangle'] as const;
export type Shape = (typeof SHAPES)[number];

export type FigureType = 'tadpole' | 'transitional' | 'conventional';
export type Grip = 'palmar' | 'pronate' | 'tripod';
export type Layout = 'floating' | 'baseline-sometimes' | 'baseline';
export type FillStyle = 'zigzag' | 'hatch';

export interface Capabilities {
	age: number;
	shapes: readonly Shape[];
	figureType: FigureType;
	partBudget: number;
	/** Head height ÷ rest of the figure. */
	headRatio: number;
	grip: Grip;
	strokeScale: number;
	/** Fractions of part size. */
	tremorAmp: number;
	driftAmp: number;
	velocityPeaks: number;
	joinError: number;
	closureMiss: number;
	/** Chaikin passes on intended corners (0 = sharp). */
	cornerRounding: number;
	layout: Layout;
	occlusion: boolean;
	xrayChance: number;
	mixedViewChance: number;
	colourRealism: number;
	fillStyle: FillStyle;
	fillCoverage: number;
	fillOverflow: number;
	fillSpacing: number;
	/** 0 mouth only, 1 + eyes, 2 + brows sometimes, 3 + brows, tears, steam. */
	expressionSkill: number;
}

// ── [3] StrokePlan ─────────────────────────────────────────────────────────────

export interface Point {
	x: number;
	y: number;
}

export type StrokeKind = 'outline' | 'fill' | 'ground';

export interface PlannedStroke {
	/** Stable key, also the noise seed for this stroke: thing/part/index. */
	key: string;
	thing: string;
	part: string;
	kind: StrokeKind;
	/** Drawing order across the whole picture. */
	order: number;
	path: Point[];
	closed: boolean;
	/** The path has intended sharp corners (box, triangle, zigzag). */
	corners: boolean;
	/** Reference length for noise, in page units. */
	size: number;
	colour: string;
}

export interface PlannedThing {
	id: string;
	label: string;
	kind: ThingKind;
	main: boolean;
	/** Bounding box on the page after placement. */
	box: { x: number; y: number; w: number; h: number };
	keptParts: string[];
	colour: string;
}

export interface StrokePlan {
	page: { w: number; h: number };
	things: PlannedThing[];
	strokes: PlannedStroke[];
}

// ── [4] Hand output ────────────────────────────────────────────────────────────

export interface Stroke {
	key: string;
	thing: string;
	part: string;
	kind: StrokeKind;
	/** Meant as a closed shape (a loop), even if the hand left it a little open. */
	closed: boolean;
	points: Point[];
	widths: number[];
	colour: string;
}
