<!--
	The Crayon-o-matic studio: type a motif or draw by hand, tune the child, get the drawing.
	Hosts pass their own interpreter (who reads the motif, and what it costs is theirs), and get
	the finished SVG back on done or close. Theme it with the --cs-* custom properties.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { DEFAULT_PAGE, draw, drawFreehand, type ConceptScene, type Dials, type Point } from '@crayon-o-matic/core';
	import { interpretOffline } from '@crayon-o-matic/interpret';
	import Dial from './Dial.svelte';
	import Paper from './Paper.svelte';
	import type { StudioInterpret, StudioResult } from './types.js';

	interface Props {
		/** Who reads the motif. Default: the built-in templates, in the browser. */
		interpret?: StudioInterpret;
		/** Shows a ✕; called with the drawing so far (or null if the paper is empty). */
		onclose?: (result: StudioResult | null) => void;
		/** The main button; without it the studio offers an SVG download. */
		ondone?: (result: StudioResult) => void;
		doneLabel?: string;
		title?: string;
		/** A line under the motif box, e.g. how many tries are left. */
		notice?: string;
		initialMotif?: string;
		/** Lines, shadow, highlight. */
		palette?: readonly [string, string, string];
	}
	let {
		interpret,
		onclose,
		ondone,
		doneLabel = 'Download SVG',
		title = 'Crayon-o-matic',
		notice = '',
		initialMotif = 'a furious grandma with a cat',
		palette = ['#232323', '#c8c2b4', '#f4c430']
	}: Props = $props();

	const MAX_SEED = 9999;
	// owner, 2026-11-18: nothing is kid-ified by force; freehand starts exactly as drawn
	const KIDIFY_DEFAULT = 0;

	let mode = $state<'motif' | 'freehand'>('motif');
	// Starting values only; later prop changes don't reset the person's work.
	const start = untrack(() => ({ motif: initialMotif, palette }));
	// The first picture comes from the built-in templates: no model call (and no try spent) on load.
	let motif = $state(start.motif);
	let scene = $state<ConceptScene>(interpretOffline(start.motif));
	let drawnMotif = $state(start.motif);
	let busy = $state(false);
	let note = $state('');

	let age = $state(4.5);
	let shakiness = $state(0.5);
	let adorable = $state(0.5);
	let seed = $state(1);
	let kidify = $state(KIDIFY_DEFAULT);
	let strokes = $state<Point[][]>([]);

	let line = $state(start.palette[0]);
	let shadow = $state(start.palette[1]);
	let highlight = $state(start.palette[2]);
	let shadowOn = $state(true);
	let highlightOn = $state(true);
	let shadowAngle = $state(50);
	let shadowLength = $state(9);
	let highlightAngle = $state(230);
	let highlightLength = $state(4);
	let cut = $state(0.6);

	const dials = $derived<Partial<Dials>>({
		age,
		shakiness,
		adorable,
		seed,
		palette: [line, shadow, highlight],
		shadowAngle,
		shadowLength: shadowOn ? shadowLength : 0,
		shadowCut: cut,
		highlightAngle,
		highlightLength: highlightOn ? highlightLength : 0,
		highlightCut: cut
	});

	const drawing = $derived.by(() => {
		try {
			return mode === 'motif' ? draw(scene, dials) : drawFreehand({ page: { ...DEFAULT_PAGE }, strokes: strokes.map((points) => ({ points })) }, dials, kidify);
		} catch (err) {
			console.error('crayon-o-matic: could not draw', err);
			return null;
		}
	});
	const empty = $derived(mode === 'freehand' && strokes.length === 0);
	const says = $derived(mode === 'motif' ? scene.kidSays : '');

	function result(): StudioResult | null {
		if (!drawing || empty) return null;
		return { svg: drawing.svg, mode, dials: drawing.dials, ...(mode === 'motif' ? { motif: drawnMotif, kidSays: scene.kidSays } : {}) };
	}

	async function read(e: SubmitEvent) {
		e.preventDefault();
		const text = motif.trim();
		if (!text || busy) return;
		busy = true;
		note = '';
		try {
			const reading = interpret ? await interpret(text) : { scene: interpretOffline(text) };
			scene = reading.scene;
			drawnMotif = text;
			note = reading.note ?? '';
		} catch (err) {
			console.error('crayon-o-matic: interpreter failed', err);
			scene = interpretOffline(text);
			drawnMotif = text;
			note = 'The clever reader is busy, so the built-in words drew this one.';
		} finally {
			busy = false;
		}
	}

	function again() {
		seed = (seed % MAX_SEED) + 1;
	}

	function done() {
		const r = result();
		if (!r) return;
		if (ondone) return ondone(r);
		const url = URL.createObjectURL(new Blob([r.svg], { type: 'image/svg+xml' }));
		const a = Object.assign(document.createElement('a'), { href: url, download: 'crayon-o-matic.svg' });
		a.click();
		URL.revokeObjectURL(url);
	}

	function close() {
		onclose?.(result());
	}

	function keys(e: KeyboardEvent) {
		if (e.key === 'Escape' && onclose) close();
	}
</script>

<svelte:window onkeydown={keys} />

<section class="cs-studio" aria-label={title}>
	<header class="cs-head">
		<h2>{title}</h2>
		{#if onclose}
			<button type="button" class="cs-close" onclick={close} aria-label="Close and keep the drawing">✕</button>
		{/if}
	</header>

	<div class="cs-body">
		<div class="cs-stage">
			<Paper
				svg={drawing?.svg ?? ''}
				page={DEFAULT_PAGE}
				drawing={mode === 'freehand'}
				ink={line}
				label={mode === 'motif' ? `A child's drawing of ${drawnMotif}` : 'Your drawing'}
				onstroke={(points) => (strokes = [...strokes, points])}
			/>
			<p class="cs-says" aria-live="polite">
				{#if empty}Draw on the paper with your finger or mouse.{:else if says}“{says}”{/if}
			</p>
		</div>

		<div class="cs-panel">
			<div class="cs-modes" role="tablist" aria-label="How to make the drawing">
				<button type="button" role="tab" aria-selected={mode === 'motif'} onclick={() => (mode = 'motif')}>Type it</button>
				<button type="button" role="tab" aria-selected={mode === 'freehand'} onclick={() => (mode = 'freehand')}>Draw it yourself</button>
			</div>

			{#if mode === 'motif'}
				<form class="cs-motif" onsubmit={read}>
					<label for="cs-motif">What should the kid draw?</label>
					<div class="cs-row">
						<input id="cs-motif" type="text" maxlength="200" bind:value={motif} placeholder="a llama doing taxes" />
						<button type="submit" class="cs-go" disabled={busy}>{busy ? 'Thinking…' : 'Draw it!'}</button>
					</div>
					{#if notice}<p class="cs-notice">{notice}</p>{/if}
					{#if note}<p class="cs-notice" role="status">{note}</p>{/if}
				</form>
			{:else}
				<div class="cs-free">
					<Dial label="Kid-ify" bind:value={kidify} min={0} max={1} step={0.05} ends={['exactly as drawn', 'all kid']} />
					<div class="cs-row">
						<button type="button" onclick={() => (strokes = strokes.slice(0, -1))} disabled={!strokes.length}>Undo</button>
						<button type="button" onclick={() => (strokes = [])} disabled={!strokes.length}>Clear</button>
					</div>
				</div>
			{/if}

			<fieldset>
				<legend>The kid</legend>
				<Dial label="Age" bind:value={age} min={2.5} max={6} step={0.1} format={(v) => `${v.toFixed(1)} years`} />
				<Dial label="Shaky" bind:value={shakiness} min={0} max={1} step={0.05} ends={['straight', 'a mess']} />
				{#if mode === 'motif'}
					<Dial label="Adorable" bind:value={adorable} min={0} max={1} step={0.05} ends={['plain', 'very cute']} />
				{/if}
				<button type="button" onclick={again}>Ask again</button>
			</fieldset>

			<fieldset class="cs-colours">
				<legend>Colours</legend>
				<label><input type="color" bind:value={line} /> Lines</label>
				<label><input type="checkbox" bind:checked={shadowOn} /><input type="color" bind:value={shadow} disabled={!shadowOn} /> Shadow</label>
				<label><input type="checkbox" bind:checked={highlightOn} /><input type="color" bind:value={highlight} disabled={!highlightOn} /> Highlight</label>
			</fieldset>

			<details>
				<summary>Light and shadow</summary>
				<Dial label="Shadow falls" bind:value={shadowAngle} min={0} max={360} step={5} format={(v) => `${v}°`} />
				<Dial label="Shadow length" bind:value={shadowLength} min={0} max={30} step={0.5} />
				<Dial label="Highlight from" bind:value={highlightAngle} min={0} max={360} step={5} format={(v) => `${v}°`} />
				<Dial label="Highlight length" bind:value={highlightLength} min={0} max={30} step={0.5} />
				<Dial label="Which edges" bind:value={cut} min={0} max={1} step={0.05} ends={['all', 'only the facing ones']} />
			</details>

			<button type="button" class="cs-done" onclick={done} disabled={!result()}>{doneLabel}</button>
		</div>
	</div>
</section>

<style>
	.cs-studio {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		color: var(--cs-ink, #222);
		background: var(--cs-bg, #efece4);
		font: var(--cs-font, 15px/1.4 system-ui, sans-serif);
	}
	.cs-studio :global(*) {
		box-sizing: border-box;
	}
	.cs-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 16px;
		border-bottom: 1px solid rgb(0 0 0 / 0.1);
	}
	h2 {
		margin: 0;
		font: var(--cs-title-font, 700 1.25em/1.2 system-ui, sans-serif);
	}
	.cs-close {
		width: 44px;
		height: 44px;
		font-size: 22px;
		line-height: 1;
		border-radius: 50%;
	}
	.cs-body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
		gap: 20px;
		padding: 16px;
	}
	.cs-stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 0;
	}
	.cs-stage > :global(.cs-paper) {
		max-width: min(100%, calc((100dvh - 140px) * 0.75));
	}
	.cs-says {
		min-height: 1.4em;
		font-style: italic;
		opacity: 0.8;
		text-align: center;
	}
	.cs-panel {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.cs-modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}
	.cs-modes [aria-selected='true'] {
		background: var(--cs-accent, #232323);
		color: var(--cs-accent-ink, #fff);
		border-color: var(--cs-accent, #232323);
	}
	.cs-motif label {
		display: block;
		font-weight: 600;
		margin-bottom: 4px;
	}
	.cs-row {
		display: flex;
		gap: 6px;
	}
	.cs-row input {
		flex: 1;
		min-width: 0;
	}
	input[type='text'] {
		font: inherit;
		padding: 10px 12px;
		border: 1px solid rgb(0 0 0 / 0.25);
		border-radius: var(--cs-radius, 6px);
		background: #fff;
		color: #222;
	}
	button {
		font: inherit;
		padding: 8px 12px;
		border: 1px solid rgb(0 0 0 / 0.25);
		border-radius: var(--cs-radius, 6px);
		background: var(--cs-button, #fff);
		color: inherit;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	button:focus-visible,
	input:focus-visible,
	summary:focus-visible {
		outline: 3px solid var(--cs-focus, #1f3bff);
		outline-offset: 2px;
	}
	.cs-go,
	.cs-done {
		background: var(--cs-accent, #232323);
		color: var(--cs-accent-ink, #fff);
		border-color: var(--cs-accent, #232323);
		font-weight: 700;
	}
	.cs-done {
		padding: 14px;
		font-size: 1.1em;
	}
	.cs-notice {
		margin: 6px 0 0;
		font-size: 0.85em;
		opacity: 0.8;
	}
	fieldset {
		border: 0;
		border-top: 1px solid rgb(0 0 0 / 0.1);
		margin: 0;
		padding: 10px 0 0;
	}
	legend {
		font-weight: 700;
		padding: 0 0 6px;
	}
	.cs-colours label {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 4px 0;
	}
	summary {
		cursor: pointer;
		font-weight: 700;
		padding: 6px 0;
	}
	@media (max-width: 760px) {
		.cs-body {
			grid-template-columns: 1fr;
		}
		.cs-stage > :global(.cs-paper) {
			max-width: min(100%, 60dvh);
		}
	}
</style>
