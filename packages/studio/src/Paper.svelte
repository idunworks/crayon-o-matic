<!--
	The paper: shows the drawing, and in freehand mode takes pointer strokes.
	The SVG comes from our own pure pipeline (labels are stripped of markup in the medium),
	so it's inserted as markup.
-->
<script lang="ts">
	import type { Point } from '@crayon-o-matic/core';
	import { extend, pathD, toPage } from './sketch.js';

	interface Props {
		svg: string;
		page: { w: number; h: number };
		/** Freehand mode: pointer strokes are captured. */
		drawing: boolean;
		/** Colour of the stroke while it's being drawn. */
		ink: string;
		label: string;
		onstroke: (points: Point[]) => void;
	}
	let { svg, page, drawing, ink, label, onstroke }: Props = $props();

	let el: HTMLDivElement | undefined = $state();
	let live = $state<readonly Point[] | null>(null);

	function at(e: PointerEvent): Point {
		const r = el!.getBoundingClientRect();
		return toPage(e.clientX, e.clientY, r, page);
	}

	function down(e: PointerEvent) {
		if (!drawing || !el || e.button !== 0) return;
		el.setPointerCapture(e.pointerId);
		live = [at(e)];
	}

	function move(e: PointerEvent) {
		if (live) live = extend(live, at(e));
	}

	function up() {
		if (!live) return;
		const done = live;
		live = null;
		if (done.length >= 2) onstroke([...done]);
	}
</script>

<div
	class="cs-paper"
	class:cs-drawing={drawing}
	bind:this={el}
	role="img"
	aria-label={label}
	onpointerdown={down}
	onpointermove={move}
	onpointerup={up}
	onpointercancel={up}
>
	{@html svg}
	{#if live}
		<svg class="cs-live" viewBox="0 0 {page.w} {page.h}" aria-hidden="true">
			<path d={pathD(live)} fill="none" stroke={ink} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	{/if}
</div>

<style>
	.cs-paper {
		position: relative;
		width: 100%;
		aspect-ratio: 3 / 4;
		background: var(--cs-paper, #fbf8f1);
		border-radius: var(--cs-radius, 6px);
		box-shadow: var(--cs-paper-shadow, 0 2px 14px rgb(0 0 0 / 0.14));
		overflow: hidden;
		user-select: none;
	}
	.cs-paper :global(svg) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.cs-drawing {
		cursor: crosshair;
		touch-action: none;
	}
</style>
