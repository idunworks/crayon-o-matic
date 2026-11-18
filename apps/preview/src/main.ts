/**
 * Dev preview: sliders for the dials, redrawn on every change. A tuning tool, not the
 * phase 3 web app. The SVG comes from our own pure pipeline (no user HTML goes in it:
 * labels are stripped of markup in the medium), so it's inserted as markup.
 *
 * Two modes: a motif (offline templates), or freehand: you draw on the paper, then pick
 * how much to kid-ify it (0 = exactly as drawn).
 */
import { DEFAULT_PAGE, draw, drawFreehand, type Dials, type Point, type Sketch } from '@crayon-o-matic/core';
import { interpretOffline } from '@crayon-o-matic/interpret';

const $ = <T extends HTMLElement>(id: string): T => {
	const el = document.getElementById(id);
	if (!el) throw new Error(`preview: missing #${id}`);
	return el as T;
};

const SLIDERS = ['age', 'shakiness', 'attention', 'chaos', 'adorable', 'seed', 'shadowAngle', 'shadowLength', 'shadowCut', 'highlightAngle', 'highlightLength', 'highlightCut'] as const;
const MAX_SEED = 200;
const STORE_KEY = 'crayon-o-matic/sketch';
/** Skip pointer samples closer than this (mm), so a slow hand doesn't flood a stroke. */
const MIN_SAMPLE = 0.6;
const SVG_NS = 'http://www.w3.org/2000/svg';

let lastSvg = '';
let sketch: Sketch = loadSketch();
let live: Point[] | null = null;

function loadSketch(): Sketch {
	try {
		const raw = localStorage.getItem(STORE_KEY);
		const parsed = raw ? (JSON.parse(raw) as Sketch) : null;
		if (parsed && Array.isArray(parsed.strokes)) return { page: { ...DEFAULT_PAGE }, strokes: parsed.strokes };
	} catch (err) {
		console.warn('preview: ignoring a stored sketch that does not parse', err);
	}
	return { page: { ...DEFAULT_PAGE }, strokes: [] };
}

function saveSketch(): void {
	try {
		localStorage.setItem(STORE_KEY, JSON.stringify(sketch));
	} catch (err) {
		console.warn('preview: could not store the sketch', err);
	}
}

const freehand = (): boolean => document.body.classList.contains('freehand');

function value(id: string): number {
	return Number($<HTMLInputElement>(id).value);
}

/** Palette is positional (lines, shadow, highlight); a switched-off layer gets length 0. */
function colours(dials: Partial<Dials>): void {
	dials.palette = [$<HTMLInputElement>('line').value, $<HTMLInputElement>('shadow').value, $<HTMLInputElement>('highlight').value];
	if (!$<HTMLInputElement>('shadowOn').checked) dials.shadowLength = 0;
	if (!$<HTMLInputElement>('highlightOn').checked) dials.highlightLength = 0;
}

function showValues(): void {
	document.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((input) => {
		const out = input.parentElement?.querySelector('output');
		if (out) out.textContent = input.value;
	});
}

function render(): void {
	showValues();
	const dials: Partial<Dials> = {};
	for (const id of SLIDERS) dials[id] = value(id);
	colours(dials);
	try {
		if (freehand()) {
			const drawing = drawFreehand(sketch, dials, value('kidify'));
			lastSvg = drawing.svg;
			$('says').textContent = sketch.strokes.length ? `${sketch.strokes.length} strokes` : 'Draw something on the paper.';
		} else {
			const scene = interpretOffline($<HTMLInputElement>('motif').value || 'a blob');
			lastSvg = draw(scene, dials).svg;
			$('says').textContent = `“${scene.kidSays}”`;
		}
		$('paper').innerHTML = lastSvg;
	} catch (err) {
		$('says').textContent = `Could not draw that: ${err instanceof Error ? err.message : String(err)}`;
	}
}

// ── drawing on the paper ───────────────────────────────────────────────────────

function toPage(e: PointerEvent): Point {
	const r = $('paper').getBoundingClientRect();
	return { x: ((e.clientX - r.left) / r.width) * DEFAULT_PAGE.w, y: ((e.clientY - r.top) / r.height) * DEFAULT_PAGE.h };
}

/** The stroke in progress, drawn raw on top until the pointer lifts. */
function livepath(): SVGPathElement | null {
	const svg = $('paper').querySelector('svg');
	if (!svg) return null;
	let path = svg.querySelector<SVGPathElement>('#live');
	if (!path) {
		path = document.createElementNS(SVG_NS, 'path');
		path.id = 'live';
		path.setAttribute('fill', 'none');
		path.setAttribute('stroke', $<HTMLInputElement>('line').value);
		path.setAttribute('stroke-width', '2.4');
		path.setAttribute('stroke-linecap', 'round');
		path.setAttribute('stroke-linejoin', 'round');
		svg.append(path);
	}
	return path;
}

function onDown(e: PointerEvent): void {
	if (!freehand() || e.button !== 0) return;
	$('paper').setPointerCapture(e.pointerId);
	live = [toPage(e)];
}

function onMove(e: PointerEvent): void {
	if (!live) return;
	const p = toPage(e);
	const last = live[live.length - 1]!;
	if (Math.hypot(p.x - last.x, p.y - last.y) < MIN_SAMPLE) return;
	live = [...live, p];
	livepath()?.setAttribute('d', live.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(2)} ${q.y.toFixed(2)}`).join(''));
}

function onUp(): void {
	if (!live) return;
	const done = live;
	live = null;
	if (done.length >= 2) {
		sketch = { ...sketch, strokes: [...sketch.strokes, { points: done }] };
		saveSketch();
	}
	render();
}

const paper = $('paper');
paper.addEventListener('pointerdown', onDown);
paper.addEventListener('pointermove', onMove);
paper.addEventListener('pointerup', onUp);
paper.addEventListener('pointercancel', onUp);

// ── controls ───────────────────────────────────────────────────────────────────

document.querySelectorAll('input:not([name="mode"])').forEach((el) => el.addEventListener('input', render));
document.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((el) =>
	el.addEventListener('change', () => {
		document.body.classList.toggle('freehand', el.value === 'freehand' && el.checked);
		render();
	})
);
$('undo').addEventListener('click', () => {
	sketch = { ...sketch, strokes: sketch.strokes.slice(0, -1) };
	saveSketch();
	render();
});
$('clear').addEventListener('click', () => {
	sketch = { ...sketch, strokes: [] };
	saveSketch();
	render();
});
$('again').addEventListener('click', () => {
	const seed = $<HTMLInputElement>('seed');
	seed.value = String((Number(seed.value) % MAX_SEED) + 1);
	render();
});
$('save').addEventListener('click', () => {
	const url = URL.createObjectURL(new Blob([lastSvg], { type: 'image/svg+xml' }));
	const a = Object.assign(document.createElement('a'), { href: url, download: 'crayon-o-matic.svg' });
	a.click();
	URL.revokeObjectURL(url);
});
render();
