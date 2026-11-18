/**
 * SCIENCE.md, generated from packages/core/src/anchors.ts so the two never drift.
 * `pnpm crayon --science` rewrites it; a test fails when it's out of date.
 */
import { ANCHORS, FIGURE_TYPE, MILESTONE_SLACK, SHAPE_MILESTONES } from '@crayon-o-matic/core';

const mark = (status: string): string => (status === 'verify' ? '[verify]' : 'tuned');

export function renderScience(): string {
	const lines: string[] = [
		'# SCIENCE',
		'',
		'Every number the drawing engine uses, with where it comes from. **Generated** from',
		'`packages/core/src/anchors.ts` by `pnpm crayon --science`; edit the anchors file, not this one.',
		'',
		'- **[verify]**: taken from the literature named in the source, not yet checked against the paper.',
		'- **tuned**: chosen by eye to look right. Not a scientific claim.',
		'',
		'Ages are typical ranges, not rules; children vary a lot, and the dials cover that spread.',
		'A PR that changes a number must change its source note too.',
		'',
		'Other constants in the code marked `(tuned)` (sizes, placement, the comedy dial, colour',
		'habits) are style choices for the drawing, not claims about children.',
		'',
		'## Shapes a child can copy (spec §1.2)',
		'',
		'| Shape | Age | Status | Source |',
		'|---|---|---|---|',
		...SHAPE_MILESTONES.map((m) => `| ${m.shape} | ${m.age} | ${mark(m.status)} | ${m.source} |`),
		'',
		`Seeded slack on each milestone: ±${MILESTONE_SLACK.value} years (${MILESTONE_SLACK.status}: ${MILESTONE_SLACK.source}).`,
		'',
		'## Figure type (spec §1.3)',
		'',
		`Tadpole below ${FIGURE_TYPE.tadpoleBelow}, transitional below ${FIGURE_TYPE.transitionalBelow}, conventional after; each drawing's age wobbles ±${FIGURE_TYPE.wobbleYears} years. ${mark(FIGURE_TYPE.status)}: ${FIGURE_TYPE.source}.`,
		'',
		'## Curves over age (spec §3)',
		'',
		'Piecewise-linear between the anchor ages, clamped at both ends.',
		'',
		'| Anchor | Age → value | Status | Source |',
		'|---|---|---|---|',
		...Object.entries(ANCHORS).map(([key, a]) => `| ${key} | ${a.points.map(([age, v]) => `${age} → ${v}`).join(', ')} | ${mark(a.status)} | ${a.source} |`),
		''
	];
	return lines.join('\n');
}
