/** Pointer → page coordinates for freehand drawing. Pure, so it's tested without a browser. */
import type { Point } from '@crayon-o-matic/core';

/** Skip pointer samples closer than this (page units), so a slow hand doesn't flood a stroke. */
export const MIN_SAMPLE = 0.6;

export interface Rect {
	left: number;
	top: number;
	width: number;
	height: number;
}

export function toPage(clientX: number, clientY: number, rect: Rect, page: { w: number; h: number }): Point {
	const w = rect.width || 1;
	const h = rect.height || 1;
	return { x: ((clientX - rect.left) / w) * page.w, y: ((clientY - rect.top) / h) * page.h };
}

/** The stroke with `p` added, unless it's too close to the last point. */
export function extend(stroke: readonly Point[], p: Point): readonly Point[] {
	const last = stroke[stroke.length - 1];
	if (last && Math.hypot(p.x - last.x, p.y - last.y) < MIN_SAMPLE) return stroke;
	return [...stroke, p];
}

export function pathD(points: readonly Point[]): string {
	return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
}
