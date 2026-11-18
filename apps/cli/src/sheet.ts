/**
 * Review sheet (CLAUDE-CODE-PROMPT: 4 motifs × ages 3/4/5/6 × 2 seeds): one SVG grid,
 * rows = motif × seed, columns = age. Labels are for the reviewer only; they live in
 * the sheet, never inside a drawing.
 */
import { DEFAULT_PAGE, draw, type Dials } from '@crayon-o-matic/core';
import { interpretOffline } from '@crayon-o-matic/interpret';

export const SHEET_MOTIFS = ['a furious grandma with a cat', 'a dog', 'a house with a sun', 'a dragon eating spaghetti'] as const;
export const SHEET_AGES = [3, 4, 5, 6] as const;
export const SHEET_SEEDS = [1, 2] as const;

const CELL_W = DEFAULT_PAGE.w;
const CELL_H = DEFAULT_PAGE.h;
const LABEL_H = 34;
const GAP = 16;

const esc = (s: string): string => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c);

export function reviewSheet(dials: Partial<Dials> = {}, motifs: readonly string[] = SHEET_MOTIFS): string {
	const rows = motifs.flatMap((m) => SHEET_SEEDS.map((seed) => ({ motif: m, seed })));
	const W = GAP + SHEET_AGES.length * (CELL_W + GAP);
	const H = LABEL_H + rows.length * (CELL_H + LABEL_H + GAP);
	const cells: string[] = [];
	SHEET_AGES.forEach((age, c) => {
		cells.push(`<text x="${GAP + c * (CELL_W + GAP) + CELL_W / 2}" y="24" font-size="20" text-anchor="middle" font-family="Helvetica, Arial">age ${age}</text>`);
	});
	rows.forEach(({ motif, seed }, r) => {
		const scene = interpretOffline(motif);
		const y = LABEL_H + r * (CELL_H + LABEL_H + GAP);
		cells.push(`<text x="${GAP}" y="${y + 22}" font-size="16" font-family="Helvetica, Arial">${esc(motif)} · seed ${seed} · “${esc(scene.kidSays)}”</text>`);
		SHEET_AGES.forEach((age, c) => {
			const x = GAP + c * (CELL_W + GAP);
			const inner = draw(scene, { ...dials, age, seed }).svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
			cells.push(`<rect x="${x}" y="${y + LABEL_H - 4}" width="${CELL_W}" height="${CELL_H}" fill="#fbf8f1" stroke="#ddd"/>`);
			cells.push(`<svg x="${x}" y="${y + LABEL_H - 4}" width="${CELL_W}" height="${CELL_H}" viewBox="0 0 ${CELL_W} ${CELL_H}">${inner}</svg>`);
		});
	});
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="100%" height="100%" fill="white"/>${cells.join('')}</svg>`;
}
