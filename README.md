# Crayon-o-matic

Type a motif ("a furious grandma with a cat"), pick an age from 3 to 6, and get the drawing a child of that age would make. It is believable because it's built on what developmental research says children actually draw (see [SCIENCE.md](SCIENCE.md)), and adorable because the dials let you push it. However, art doesn't get better than the artist so you can swap out everything to suit your own style.

**Status: phase 3 of 6** (core engine, base forms, CLI, pluggable interpreters, and the web
studio, also embeddable as a Svelte component). The spec is in
[docs/spec/SPEC.md](docs/spec/SPEC.md).

## Try it

As a package ([npm](https://www.npmjs.com/package/crayon-o-matic)): `npm i crayon-o-matic`, then
`import { draw } from 'crayon-o-matic'`; see [the package README](packages/crayon-o-matic/README.md).

From this repo (needs Node 20 or later, tested on 22, and pnpm 9: run `corepack enable` once):

```bash
pnpm install
pnpm crayon "a furious grandma with a cat" --age 4 --seed 11 --out grandma.svg
pnpm crayon "a scared dog" --age 5 --palette "#232323,#d7263d" --png --out dog.png
pnpm crayon --sheet --out review.png                 # 4 motifs × ages 3/4/5/6 × 2 seeds
pnpm crayon --sheet "cat; a house with a sun"        # a sheet of your own motifs
pnpm crayon --help
pnpm web                                             # the studio: http://localhost:5392/
pnpm preview                                         # dev sliders for every dial: http://localhost:5391/
```

Same motif + same dials + same seed = the same SVG, byte for byte. Change only `--age` and the
same drawing "grows up".

## How it works

```
motif ─[1 interpret]→ ConceptScene ─[2 age model]→ Capabilities ─[3 plan]→ StrokePlan ─[4 hand]→ strokes ─[5 medium]→ SVG
```

1. **Interpret** (`packages/interpret`): what's in the picture, as a child understands it. The
   built-in templates know 53 things (people, animals, and the base forms below); a model
   reads anything else (see below).
2. **Age model** (`packages/core/src/capabilities.ts`): which shapes the child can make, how many
   parts, how big the head is, how shaky. All numbers live in `anchors.ts`, each with its source.
3. **Plan**: which parts survive, as which shapes (a 3-year-old's square is a loop), where they go
   (floating before 5, a baseline later; nothing overlaps before 5), in what order (head first).
4. **Hand**: motor noise: drift, tremor, jerky speed, loops that don't close, ends that overshoot.
5. **Medium**: crayon, as print-friendly vector: no filters, no transparency.

Everything after step 1 is pure and seeded, so moving a dial redraws instantly and tests need no
network.

## Base forms: add a thing without code

Most things a child draws are a few simple pieces: a balloon is a loop, a knot and a wavy
string. Those live as data in [`packages/core/src/forms/library.ts`](packages/core/src/forms/library.ts):

```ts
{ name: 'balloon', words: ['balloons'], face: { at: [50, 32], r: 18 }, pieces: [
  { name: 'balloon', shape: 'loop', at: [50, 32], size: [44, 52] },
  { name: 'string', shape: 'wave', at: [50, 58], to: [46, 98], size: [0, 3], count: 1.5 },
  { name: 'knot', shape: 'triangle', at: [50, 60], size: [6, 5], dir: -90 }
] },
```

- Coordinates are a 100 × 100 box, y down. Pieces are listed in the order a child draws them;
  the age and attention dials keep them from the top.
- The age model still decides how each shape comes out: a 3-year-old's box is a loop, a star is
  an asterisk until about 5.
- `face` is where a face goes, only when the motif asks for a mood ("a sad banana").
- Shapes: loop, box, triangle, line, wave, zigzag, arc, U, dots, rays, spiral, scribble, heart,
  star, crescent, cross, tab. Every entry is checked by the tests and drawn at every age.

## Who reads the motif

`--interpreter` picks it. Everything after this step is the same whoever answered.

| Interpreter | Needs | Notes |
|---|---|---|
| `offline` (default) | nothing | Keyword templates. Free, instant, no network. |
| `claude` | your key in `ANTHROPIC_API_KEY` | Default model `claude-haiku-5-5` at low effort; set `CRAYON_CLAUDE_MODEL` for another. |
| `local` | an OpenAI-compatible server | Ollama, llama.cpp, vLLM, LM Studio. `CRAYON_LOCAL_MODEL` (required), `CRAYON_LOCAL_URL` (default Ollama's `http://localhost:11434/v1`), `CRAYON_LOCAL_KEY` (optional). |

```bash
ollama pull qwen3:4b-instruct
CRAYON_LOCAL_MODEL=qwen3:4b-instruct pnpm crayon "a llama doing taxes" --interpreter local
```

- **Small models are enough.** The prompt and output schema are kept short on purpose, and a 4B
  model answers in a few seconds on a laptop.
- **Rules beat the model where they know better.** A thing the templates know gets the template's
  parts (so a person always has legs), and a mood word in the motif sets the expression. The model
  fills in the rest: new things, poses, relations and the kid's line.
- **Every answer is checked.** The scene is validated against the schema and stripped of anything
  that would put text in the picture. If the model fails, times out or says something invalid,
  the built-in templates draw instead, and the CLI says why.
- **Keys stay on the server.** Use the interpreters from server code only. A hosted demo should
  add its own limits (per visitor and overall) in its own app; none of that is in this repo.

In code:

```ts
import { claudeInterpreter, interpretWithFallback, localInterpreter } from '@crayon-o-matic/interpret/server';
import { draw } from '@crayon-o-matic/core';

const { scene, source } = await interpretWithFallback(localInterpreter({ model: 'qwen3:4b-instruct' }), 'a llama doing taxes');
const { svg } = draw(scene, { age: 4, seed: 7 });
```

Any object with `name` and `interpret(motif)` returning a ConceptScene works as an interpreter,
so other providers plug in the same way.

## The studio, in your own app

`@crayon-o-matic/studio` is the whole studio as one Svelte 5 component: type a motif or draw by
hand, pick the age, colours and light, get the SVG.

```svelte
<script lang="ts">
  import { Studio, type StudioResult } from '@crayon-o-matic/studio';
  const putOnTee = (r: StudioResult) => { /* r.svg, r.kidSays, r.dials */ };
</script>

<Studio interpret={myServerReader} ondone={putOnTee} onclose={putOnTee} doneLabel="Put it on a tee" />
```

- `interpret` is yours: the studio only calls it when the person presses "Draw it!", never on
  load, so a limited model isn't spent by just visiting. Without it, the built-in words are used.
  Return `note` to tell the person something (a limit, a fallback).
- `onclose` adds a ✕ (and Esc) and hands back the drawing so far, so closing can keep the work.
- The result has `svg` (the whole paper) and `printSvg` (cropped to the drawing, its shadow and
  highlight): put `printSvg` on a tee. `contentBox` and `cropSvg` in core do the same anywhere.
- Theme it with CSS custom properties: `--cs-bg`, `--cs-ink`, `--cs-paper`, `--cs-accent`,
  `--cs-accent-ink`, `--cs-font`, `--cs-title-font`, `--cs-radius`, `--cs-focus`.
- The packages ship TypeScript source; in SvelteKit add `ssr: { noExternal: [/^@crayon-o-matic\//] }`
  to your Vite config.

`apps/web` is the stand-alone site built on it, with one optional server route: set
`CRAYON_INTERPRETER=claude` (and `ANTHROPIC_API_KEY`) or `local` to read any motif, limited to
`CRAYON_TRIES_PER_HOUR` per visitor (default 20).

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
