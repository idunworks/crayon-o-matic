/**
 * [3] Plan (spec §4.3): ConceptScene × Capabilities → StrokePlan. Pure and seeded.
 *   1. which parts survive (select.ts)
 *   2. sizes: importance → size (affective size), the main thing biggest
 *   3. place: floating (no overlap before 5) or standing on a baseline
 *   4. order: main thing first, head first; colouring-in last
 */
import { build, type LocalStroke } from './builders/index.js';
import { colourPicker, normalisePalette } from './colour.js';
import { colourIn } from './fill.js';
import * as g from './geometry.js';
import { rngFor, type Rng } from './rng.js';
import { selectParts, type Selected } from './select.js';
import type { Capabilities, ConceptScene, Dials, PlannedStroke, PlannedThing, Point, StrokePlan, ThingKind } from './types.js';

/** 30 × 40 cm, in page units (1 unit = 1 mm). */
export const DEFAULT_PAGE = { w: 300, h: 400 } as const;
const MARGIN = 14;
/** Size of a thing with importance 0.5, in page units (tuned). */
const BASE_SIZE = 130;
/** The main thing is drawn bigger; less so when it shares the page, so others still fit (tuned). */
const MAIN_BOOST = 1.4;
const MAIN_BOOST_SHARED = 1.1;
/** Floating tilt range in radians: ±15° (spec §4.3); the main thing tilts less (tuned). */
const TILT = (15 * Math.PI) / 180;
const MAIN_TILT = (6 * Math.PI) / 180;
const PLACE_TRIES = 60;
const SHRINK_STEPS = 5;
const SHRINK = 0.8;
const GAP = 6;
/** Chance a "baseline-sometimes" child draws the ground line (tuned). */
const BASELINE_SOMETIMES_CHANCE = 0.5;
/** Things that float in the sky even on a baseline drawing. */
const SKY: ReadonlySet<ThingKind> = new Set(['sun', 'cloud']);

interface Placed {
	sel: Selected;
	strokes: LocalStroke[];
	scale: number;
	angle: number;
	/** Local bbox centre, the rotation pivot. */
	pivot: Point;
	dx: number;
	dy: number;
	box: g.Box;
	colour: string;
}

function targetSize(sel: Selected, shared: boolean): number {
	const boost = sel.main ? (shared ? MAIN_BOOST_SHARED : MAIN_BOOST) : 1;
	return BASE_SIZE * (0.5 + sel.thing.importance) * boost;
}

function placedBox(strokes: LocalStroke[], scale: number, angle: number, pivot: Point, dx: number, dy: number): g.Box {
	return g.bbox(strokes.map((s) => g.transform(s.path, scale, dx, dy, angle, pivot.x, pivot.y)));
}

/** Where a thing goes; returns null when it doesn't fit anywhere. */
function place(sel: Selected, strokes: LocalStroke[], page: { w: number; h: number }, caps: Capabilities, baseline: number | null, taken: g.Box[], shared: boolean, rng: Rng): Omit<Placed, 'sel' | 'strokes' | 'colour'> | null {
	const local = g.bbox(strokes.map((s) => s.path));
	if (local.w === 0 && local.h === 0) return null;
	const pivot = g.pt(local.x + local.w / 2, local.y + local.h / 2);
	let scale = targetSize(sel, shared) / Math.max(local.w, local.h);
	scale = Math.min(scale, (page.w - 2 * MARGIN) / local.w);
	const angle = baseline !== null && !SKY.has(sel.thing.kind) ? 0 : rng.range(-1, 1) * (sel.main ? MAIN_TILT : TILT);

	if (sel.main) {
		// big, near the centre, a little up and left (where the hand starts). Too tall?
		// Keep the head size and let the figure run off the bottom (head-first planning).
		const box0 = placedBox(strokes, scale, angle, pivot, 0, 0);
		const cx = page.w * 0.46 - (box0.x + box0.w / 2);
		let top: number;
		if (baseline !== null && !SKY.has(sel.thing.kind)) top = baseline - box0.h;
		else top = box0.h > page.h - 2 * MARGIN ? MARGIN : page.h * 0.45 - box0.h / 2;
		const dy = Math.max(MARGIN, top) - box0.y;
		return { scale, angle, pivot, dx: cx, dy, box: placedBox(strokes, scale, angle, pivot, cx, dy) };
	}

	let last: Omit<Placed, 'sel' | 'strokes' | 'colour'> | null = null;
	for (let step = 0; step < SHRINK_STEPS; step++) {
		for (let i = 0; i < PLACE_TRIES; i++) {
			const box0 = placedBox(strokes, scale, angle, pivot, 0, 0);
			const freeW = page.w - 2 * MARGIN - box0.w;
			const freeH = page.h - 2 * MARGIN - box0.h;
			if (freeW < 0 || freeH < 0) break;
			const x = MARGIN + rng.range(0, freeW);
			const sky = SKY.has(sel.thing.kind);
			const y = baseline !== null && !sky ? baseline - box0.h : MARGIN + rng.range(0, sky ? Math.min(freeH, page.h * 0.25) : freeH);
			const dx = x - box0.x;
			const dy = y - box0.y;
			const box = placedBox(strokes, scale, angle, pivot, dx, dy);
			const clash = taken.some((t) => g.boxesOverlap(t, box, GAP));
			if (!clash) return { scale, angle, pivot, dx, dy, box };
			last = { scale, angle, pivot, dx, dy, box };
		}
		scale *= SHRINK;
	}
	// Older children may overlap things as a last resort (spec §3: occlusion "rarely" from 5);
	// sky things never land on top of the scene.
	return caps.occlusion && !SKY.has(sel.thing.kind) ? last : null;
}

function strokeSize(path: Point[], thingSize: number): number {
	const b = g.bbox([path]);
	return Math.max(Math.hypot(b.w, b.h), thingSize * 0.2);
}

export function plan(scene: ConceptScene, caps: Capabilities, dials: Dials, page: { w: number; h: number } = DEFAULT_PAGE): StrokePlan {
	const seed = dials.seed;
	const selected = selectParts(scene, caps, dials.chaos, rngFor(seed, 'plan/select'));
	const layoutRng = rngFor(seed, 'plan/layout');
	const useBaseline = caps.layout === 'baseline' || (caps.layout === 'baseline-sometimes' && layoutRng.chance(BASELINE_SOMETIMES_CHANCE));
	const baseline = useBaseline ? page.h - MARGIN * 2.5 : null;
	const palette = normalisePalette(dials.palette);
	// Lines are always the first palette colour. The second is a shadow (drawn by the medium),
	// and only becomes a colouring-in colour when colourIn is asked for (owner, 2026-11-17).
	const line = palette[0]!;
	const fillPalette = palette.slice(1);
	const colouring = dials.colourIn && !dials.lineOnly && fillPalette.length > 0;
	const colours = colourPicker(dials.colourMode, caps, colouring ? fillPalette : [line], rngFor(seed, 'plan/colour'));
	const pageBox: g.Box = { x: 0, y: 0, w: page.w, h: page.h };

	const placed: Placed[] = [];
	for (const sel of selected) {
		const kidRng = rngFor(seed, `build/${sel.thing.id}`);
		const animal = sel.thing.kind === 'animal4' || sel.thing.kind === 'animal2' || sel.thing.kind === 'fish';
		const built = build(sel.thing.kind, sel.parts, {
			caps,
			rng: kidRng,
			adorable: dials.adorable,
			expression: sel.thing.expression,
			mixedView: animal && kidRng.chance(caps.mixedViewChance),
			...(sel.thing.pose ? { pose: sel.thing.pose } : {})
		}, sel.thing.form);
		const where = place(sel, built.strokes, page, caps, baseline, placed.map((p) => p.box), selected.filter((s) => !s.extra).length > 1, rngFor(seed, `place/${sel.thing.id}`));
		if (!where) continue;
		const colour = colouring ? colours.pick(sel.thing) : line;
		placed.push({ sel, strokes: built.strokes, colour, ...where });
	}

	const strokes: PlannedStroke[] = [];
	let order = 0;
	const fillable: { path: Point[]; size: number; thing: string; colour: string; part: string }[] = [];
	for (const p of placed) {
		const thingSize = Math.max(p.box.w, p.box.h);
		p.strokes.forEach((ls, i) => {
			const moved = g.transform(ls.path, p.scale, p.dx, p.dy, p.angle, p.pivot.x, p.pivot.y);
			const runs = g.clipToBox(moved, ls.closed, pageBox);
			runs.forEach((path, r) => {
				const whole = runs.length === 1 && path.length === moved.length;
				strokes.push({
					key: `${p.sel.thing.id}/${ls.part}/${i}${r ? `/${r}` : ''}`,
					thing: p.sel.thing.id,
					part: ls.part,
					kind: 'outline',
					order: order++,
					path,
					closed: ls.closed && whole,
					corners: ls.corners,
					size: strokeSize(path, thingSize),
					colour: line
				});
			});
			if (ls.fillable && ls.closed && runs.length === 1) fillable.push({ path: moved, size: strokeSize(moved, thingSize), thing: p.sel.thing.id, colour: p.colour, part: ls.part });
		});
	}

	if (baseline !== null) {
		const groundRng = rngFor(seed, 'plan/ground');
		const y = baseline + groundRng.range(1, 4);
		strokes.push({ key: 'ground/0', thing: 'ground', part: 'ground', kind: 'ground', order: order++, path: [g.pt(MARGIN * 0.5, y), g.pt(page.w - MARGIN * 0.5, y + groundRng.range(-4, 4))], closed: false, corners: false, size: page.w, colour: line });
	}

	// colouring-in comes last, and only as far as attention lasts (spec §4.3 step 4)
	if (colouring) {
		const fillRng = rngFor(seed, 'plan/fill');
		const hatchAngle = fillRng.range(-0.8, 0.8);
		const big = [...fillable].sort((a, b) => b.size - a.size);
		const count = Math.ceil(big.length * caps.fillCoverage);
		big.slice(0, count).forEach((f, i) => {
			const zig = colourIn(f.path, f.size, caps, rngFor(seed, `fill/${f.thing}/${f.part}/${i}`), { hatchAngle });
			zig.flatMap((run) => g.clipToBox(run, false, pageBox)).forEach((path, j) => {
				strokes.push({ key: `fill/${f.thing}/${f.part}/${i}/${j}`, thing: f.thing, part: f.part, kind: 'fill', order: order++, path, closed: false, corners: false, size: f.size, colour: f.colour });
			});
		});
	}

	const things: PlannedThing[] = placed.map((p) => ({
		id: p.sel.thing.id,
		label: p.sel.thing.label,
		kind: p.sel.thing.kind,
		main: p.sel.main,
		box: p.box,
		keptParts: p.sel.parts.map((pt) => pt.name),
		colour: p.colour
	}));
	return { page: { ...page }, things, strokes };
}
