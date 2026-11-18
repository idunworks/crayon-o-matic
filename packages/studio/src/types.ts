import type { ConceptScene, Dials } from '@crayon-o-matic/core';

/** What the host's interpreter returns. `note` is shown to the person (a limit, a fallback). */
export interface StudioReading {
	scene: ConceptScene;
	source?: string;
	note?: string;
}

/**
 * Reads a motif. The host decides who answers and what it costs (offline, its own key behind
 * a server route, a local model); the studio only calls it when the person asks to draw.
 */
export type StudioInterpret = (motif: string) => Promise<StudioReading>;

/** The finished drawing, handed to the host on done or close. */
export interface StudioResult {
	/** The whole paper. */
	svg: string;
	/** Cropped to the drawing (lines, shadow, highlight, a small margin): for printing. */
	printSvg: string;
	mode: 'motif' | 'freehand';
	motif?: string;
	/** The kid's line about the picture (UI only, never in the image). */
	kidSays?: string;
	dials: Dials;
}
