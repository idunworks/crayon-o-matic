# crayon-o-matic

Draws any motif the way a 3–6 year old would, as print-friendly vector art (SVG, 1–3 colours,
no filters). Seeded and deterministic, built on what developmental research says children
actually draw. Also: draw by hand and "kid-ify" it, and a ready-made Svelte 5 studio.

Demo and docs: https://github.com/idunworks/crayon-o-matic

```bash
npm i crayon-o-matic
```

```ts
import { draw, drawFreehand, contentBox, cropSvg } from 'crayon-o-matic';
import { interpretOffline } from 'crayon-o-matic/interpret';

const scene = interpretOffline('a furious grandma with a cat');
const { svg, strokes, dials } = draw(scene, { age: 4, seed: 11, palette: ['#232323', '#c8c2b4', '#f4c430'] });
const forPrint = cropSvg(svg, contentBox(strokes, dials)); // tight around the drawing
```

| Import | What |
|---|---|
| `crayon-o-matic` | the engine: `draw`, `drawFreehand`, dials, base forms, print crop |
| `crayon-o-matic/interpret` | browser-safe: built-in motifs, schema, rules |
| `crayon-o-matic/interpret/server` | server only: `claudeInterpreter` (your key, needs `@anthropic-ai/sdk`) and `localInterpreter` (any OpenAI-compatible server: Ollama, llama.cpp, vLLM) |
| `crayon-o-matic/studio` | `<Studio>`, the whole drawing studio as a Svelte 5 component |

```svelte
<script lang="ts">
  import { Studio, type StudioResult } from 'crayon-o-matic/studio';
  const done = (r: StudioResult) => console.log(r.printSvg);
</script>

<Studio ondone={done} onclose={done} doneLabel="Put it on a tee" />
```

MIT. Made for a T-shirt designer, and because these drawings are adorable.
