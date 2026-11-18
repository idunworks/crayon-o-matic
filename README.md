# Crayon-o-matic

Type a motif ("a furious grandma with a cat"), pick an age from 3 to 6, and get the drawing a
child of that age would make. It is believable because it's built on what developmental research
says children actually draw (see [SCIENCE.md](SCIENCE.md)), and adorable because the dials let you
push it.

**Status: phase 1 of 6** (core engine + offline motifs + CLI). The spec is in
[docs/spec/SPEC.md](docs/spec/SPEC.md).

## Try it

```bash
pnpm install
pnpm crayon "a furious grandma with a cat" --age 4 --seed 11 --out grandma.svg
pnpm crayon "a scared dog" --age 5 --palette "#232323,#d7263d" --png --out dog.png
pnpm crayon --sheet --out review.png                 # 4 motifs × ages 3/4/5/6 × 2 seeds
pnpm crayon --sheet "cat; a house with a sun"        # a sheet of your own motifs
pnpm crayon --help
pnpm preview                                         # sliders for every dial: http://localhost:5391/
```

Same motif + same dials + same seed = the same SVG, byte for byte. Change only `--age` and the
same drawing "grows up".

## How it works

```
motif ─[1 interpret]→ ConceptScene ─[2 age model]→ Capabilities ─[3 plan]→ StrokePlan ─[4 hand]→ strokes ─[5 medium]→ SVG
```

1. **Interpret** (`packages/interpret`): what's in the picture, as a child understands it. Phase 1
   uses offline keyword templates (about 20 motifs); phase 2 adds the Claude API for any motif.
2. **Age model** (`packages/core/src/capabilities.ts`): which shapes the child can make, how many
   parts, how big the head is, how shaky. All numbers live in `anchors.ts`, each with its source.
3. **Plan**: which parts survive, as which shapes (a 3-year-old's square is a loop), where they go
   (floating before 5, a baseline later; nothing overlaps before 5), in what order (head first).
4. **Hand**: motor noise: drift, tremor, jerky speed, loops that don't close, ends that overshoot.
5. **Medium**: crayon, as print-friendly vector: no filters, no transparency.

Everything after step 1 is pure and seeded, so moving a dial redraws instantly and tests need no
network.

## Colour: 1 to 3, on purpose

`--palette` takes 1–3 colours, used for structure, not as accents:

1. **lines**
2. **shadow**: the drawing cast down-right behind itself (brutalist print look). A loop only
   casts from the edges facing away from the light, so the shadow falls outside the shape;
   face details cast none. Tune it with `--shadow-angle`, `--shadow-length`, `--shadow-cut`.
3. **highlight**: a thinner line cast toward the light from the edges facing it, with its own
   `--highlight-angle`, `--highlight-length`, `--highlight-cut`

One colour gives a clean monoline drawing. The SVG holds only those solid colours (no filters,
no transparency), ready for screen printing or a tee designer, and each thing's shadow sits in
that thing's group. Colouring shapes in is off by default (`--colour-in` turns it on).

## Dials

| Dial | Range | What it does |
|---|---|---|
| `--age` | 2.5–6 | everything in the age model |
| `--shaky` | 0–1 | 0 dead straight, 0.5 typical for the age (default), 1 a mess |
| `--pressure` | light, normal, hard | line width |
| `--hand` | right, left | stroke direction and slant |
| `--attention` | 0–1 | low drops late parts and colouring |
| `--chaos` | 0–1 | improvised extras (a sun, a heart) |
| `--adorable` | 0–1 | the comedy dial: bigger head and eyes, stubby arms |
| `--colour-mode` | realistic, favourite, nearest | how colouring picks from the palette |
| `--palette` | 1–3 hex colours | lines, shadow, highlight: the only colours used |
| `--line-only` | | lines only, no shadow or highlight |
| `--colour-in` | | colour shapes in with the 2nd colour |
| `--shadow-angle` | 0–360 | where the shadow falls: 0 right, 90 down (default 50) |
| `--shadow-length` | 0–30 mm | how far it's cast (default 9) |
| `--shadow-cut` | 0–1 | 0 every line casts; 1 only edges facing away from the light (default 0.6) |
| `--highlight-angle` / `-length` / `-cut` | as above | the highlight's own controls (defaults 230, 4 mm, 0.6) |
| `--expression` | happy, sad, furious … | overrides the mood read from the motif |
| `--seed` | integer | same seed = same drawing |

The drawing never contains text. The kid's line ("grandma is so angry her head is going to pop")
is printed next to it, never drawn into it.

## Develop

```bash
pnpm test        # vitest: age model, planner, hand, interpreter, pipeline, golden SVGs
pnpm check       # TypeScript
pnpm crayon --science   # regenerate SCIENCE.md after changing anchors.ts
```

Layout: `packages/core` (pure engine, no runtime dependencies), `packages/interpret` (scene schema
and offline templates), `apps/cli`.

## Licence

MIT. See [LICENSE](LICENSE).
