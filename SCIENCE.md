# SCIENCE

Every number the drawing engine uses, with where it comes from. **Generated** from
`packages/core/src/anchors.ts` by `pnpm crayon --science`; edit the anchors file, not this one.

- **[verify]**: taken from the literature named in the source, not yet checked against the paper.
- **tuned**: chosen by eye to look right. Not a scientific claim.

Ages are typical ranges, not rules; children vary a lot, and the dials cover that spread.
A PR that changes a number must change its source note too.

Other constants in the code marked `(tuned)` (sizes, placement, the comedy dial, colour
habits) are style choices for the drawing, not claims about children.

## Shapes a child can copy (spec §1.2)

| Shape | Age | Status | Source |
|---|---|---|---|
| vline | 2 | [verify] | Gesell / Beery VMI shape-copying norms (spec §1.2) |
| hline | 2.5 | [verify] | Gesell / Beery VMI shape-copying norms (spec §1.2) |
| circle | 3 | [verify] | Gesell / Beery VMI shape-copying norms (spec §1.2) |
| cross | 4 | [verify] | Gesell / Beery VMI shape-copying norms (spec §1.2) |
| diagonal | 4.5 | [verify] | Gesell / Beery VMI shape-copying norms (spec §1.2) |
| square | 4.75 | [verify] | Gesell / Beery VMI shape-copying norms (spec §1.2); spec gives 4.5–5, midpoint used |
| x | 5 | [verify] | Gesell / Beery VMI shape-copying norms (spec §1.2) |
| triangle | 5 | [verify] | Gesell / Beery VMI shape-copying norms (spec §1.2) |

Seeded slack on each milestone: ±0.2 years (tuned: small, so age 3.0 never gets a square).

## Figure type (spec §1.3)

Tadpole below 4, transitional below 5, conventional after; each drawing's age wobbles ±0.3 years. [verify]: Cox 1992; Freeman 1980 (tadpole ~3–4.5, transitional ~4–5, conventional ~5–6); ±0.3 wobble from spec §3.

## Curves over age (spec §3)

Piecewise-linear between the anchor ages, clamped at both ends.

| Anchor | Age → value | Status | Source |
|---|---|---|---|
| partBudget | 2.5 → 2, 3 → 3, 4 → 7, 5 → 11, 6 → 14 | [verify] | Goodenough 1926 / Harris 1963 Draw-a-Man scoring: ~2–4 at 3, ~5–8 at 4, ~8–12 at 5, ~12–16 at 6 (midpoints); 2.5 tuned |
| headRatio | 2.5 → 1.4, 3 → 1.3, 4 → 1, 5 → 0.7, 6 → 0.5 | [verify] | Freeman 1980 body-proportion effect; Thomas & Tsalimi: ~1:1 at 4 → ~1:2 by 6; 2.5–3 tuned |
| strokeScale | 2.5 → 1.25, 3 → 1.2, 4 → 1.05, 5 → 1, 6 → 0.95 | tuned | Schneck & Henderson 1990 grip stages (direction only); magnitudes tuned |
| tremor | 2.5 → 0.022, 3 → 0.018, 4 → 0.012, 5 → 0.008, 6 → 0.005 | tuned | Rueckriegel et al. 2008 drawing kinematics (smoothness improves with age); magnitudes tuned |
| drift | 2.5 → 0.06, 3 → 0.05, 4 → 0.035, 5 → 0.022, 6 → 0.012 | tuned | Rueckriegel et al. 2008 (more drift when younger); magnitudes tuned |
| velocityPeaks | 2.5 → 6, 3 → 6, 6 → 2 | [verify] | Rueckriegel et al. 2008: more velocity peaks per stroke when younger; spec §3 lerp 3→6, 6→2 |
| joinError | 2.5 → 0.2, 3 → 0.16, 4 → 0.1, 5 → 0.06, 6 → 0.035 | tuned | Luquet 1927 synthetic incapacity (direction); magnitudes tuned |
| closureMiss | 2.5 → 0.2, 3 → 0.16, 4 → 0.1, 5 → 0.06, 6 → 0.035 | tuned | spec §3 "3 → often open, 6 → mostly closed, small tail"; magnitudes tuned |
| cornerRounding | 2.5 → 3, 4.5 → 2, 5 → 1, 6 → 0 | tuned | spec §4.4 "sharp corner → rounded if age < 5"; tuned |
| mixedView | 2.5 → 0.6, 4 → 0.85, 5 → 0.85, 6 → 0.5 | [verify] | Cox (mixed views in animal drawings, high at 4–5) |
| xray | 2.5 → 0, 4.5 → 0, 6 → 0.3 | [verify] | spec §1.5: rare at 4, ~5–7; tuned to ~0.3 at 6 |
| colourRealism | 2.5 → 0.05, 3 → 0.1, 6 → 0.6 | [verify] | Lowenfeld: emotional colour in preschool, realistic from ~5–6 |
| fillCoverage | 2.5 → 0.25, 3 → 0.3, 6 → 0.8 | tuned | spec §3 lerp 3→0.3, 6→0.8; tuned |
| fillOverflow | 2.5 → 0.3, 3 → 0.25, 6 → 0.03 | tuned | spec §1.6 "way outside the lines" (young) → "mostly inside" (older); tuned |
| fillSpacing | 2.5 → 0.28, 3 → 0.24, 6 → 0.08 | tuned | spec §1.6 sparse zigzag → dense hatch; tuned |
| expressionSkill | 2.5 → 0, 3 → 0, 4 → 1, 5 → 2, 6 → 3 | [verify] | spec §1.3: mouth curve first (4–5 intentional happy/sad), brows later and less reliable |
