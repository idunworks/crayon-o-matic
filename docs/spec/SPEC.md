# Crayon-o-matic: logic spec for an open-source kid-drawing generator

**Draft 1, 2026-11-17.** These are bullet lists and pseudocode only, with no real code. A Claude Code session turns this into the app.

**What it does.** A person types a motif ("a furious grandma with a cat") and sets a few dials: age 3, 4 or 5, how shaky, the crayon and so on. The app draws it the way a real child of that age would. The result should be believable, because it's based on what developmental research says children actually draw, and *adorable*, because the dials let you push it.

**Text is out.** Tibbe adds captions in their own T-shirt designer, so the drawing has no letters in it. The app can still *show* a "what the kid says about it" line in the UI next to the drawing, which is a cheap laugh. That line never goes into the image.

**This supersedes the hand-drawn route** in `../ugly-crew/STYLE-RULES.md`. Instead of drawing 10 characters by hand, the app generates them. The expression table and the "spec per character" idea carry over (§5, §6).

---

## 0. The idea in one picture

```
motif text + dials
   │
   ▼
[1] INTERPRET  (LLM, once per motif)
    "what is in this picture, as a child understands it"
    → ConceptScene: things, their parts, ranked by importance, + mood
   │
   ▼
[2] AGE MODEL  (pure, deterministic)
    age + dials → Capabilities: which shapes the child can make, how many parts,
    how big the head is, how wobbly, how well joins meet ...
   │
   ▼
[3] PLAN       (pure, seeded)
    ConceptScene × Capabilities → StrokePlan: which parts survive, as which
    primitive shapes, where on the page, in what order
   │
   ▼
[4] HAND       (pure, seeded)
    StrokePlan → strokes with motor noise: tremor, drift, overshoot, gaps,
    pressure, speed
   │
   ▼
[5] MEDIUM     (pure)
    strokes → SVG in crayon / pencil / marker / felt-tip look, plus colouring-in
   │
   ▼
SVG (transparent) → PNG export at print size
```

**Key design choice:**
- The LLM runs **once per motif** and describes the *full* idea, without regard to age.
- Everything age-related happens after it, in deterministic code.
- So **moving the age slider re-draws instantly, with no new API call.** The same seed gives the same drawing.
- That makes the fun part (scrubbing from 3 to 5 and watching the grandma "grow up") free, fast and testable.

---

## 1. The science (what the model is built on)

Every number below needs a source check before it goes into the code, so they are all marked **[verify]**. The sources are classic, well-cited ones. The ages are *typical ranges*, not hard rules, and children vary a lot. That spread is exactly what the dials cover.

### 1.1 Stages
- **Luquet (1927), stages of realism** [verify]:
  - *Fortuitous realism* (~2–3): the child scribbles, *then* notices that it looks like something and names it.
  - *Failed realism* (~3–4): the child means to draw a thing, but the parts don't fit together. Luquet calls this "synthetic incapacity": the parts are there but float, disconnected.
  - *Intellectual realism* (~4–8): the child draws **what they know, not what they see**: both eyes on a profile, the legs visible through trousers, the baby inside the mummy.
  - *Visual realism* (~8+): out of scope here.
- **Lowenfeld & Brittain** [verify]:
  - *Scribbling* (2–4): disordered, then controlled, then named.
  - *Preschematic* (4–7): first symbols; things float on the page; colour is emotional, not realistic; size follows importance.
  - *Schematic* (7–9): baseline and skyline appear. **Our oldest setting (5–6) shows only hints of this.**
- **Kellogg (1969)** [verify]:
  - 20 basic scribbles; then diagrams (circle, square, cross, X, triangle, odd shape), then combines (2 diagrams), then aggregates (3+).
  - Then mandalas, suns and radials, with humans emerging from the sun shape: a circle with rays becomes a head with arms.
  - **This is our shape vocabulary.**

### 1.2 Shapes a child can copy (motor and planning milestones)
Rough norms from shape-copying tests (Gesell, Beery VMI) [verify]:

| Shape | Typical age |
|---|---|
| vertical line | ~2 |
| horizontal line | ~2.5 |
| circle (closed loop) | ~3 |
| cross `+` | ~4 |
| diagonal line | ~4.5 |
| square (corners!) | ~4.5–5 |
| X | ~5 |
| triangle | ~5 |
| diamond | ~7 (out of range: we fake it as a wobbly square) |

- **Rule: a child can't use a shape they can't make yet.**
- A 3-year-old's "square" house is a lumpy loop. A 4-year-old's square has rounded corners and one side longer. The roof triangle shows up properly around 5.

### 1.3 The human figure
- **Tadpole figure** (~3–4.5) [verify: Cox 1992, Freeman 1980]:
  - a head-and-body loop with legs coming straight out of it, often arms out of the head too
  - a face inside, and no separate trunk
  - **This is reference D from Tibbe's drawings.**
- **Transitional** (~4–5): a small trunk appears, sometimes as an open space between the legs, or as a second loop. Arms still come out of the head or the neck.
- **Conventional** (~5–6): head, trunk, arms from the trunk, legs from the trunk, plus hands as sticks or "suns" and feet.
- **The head is drawn first and too big** [verify: Freeman's "body-proportion effect"; Thomas & Tsalimi]:
  - Children start with the head, plan badly, and run out of room.
  - Head-to-body ratio ~1:1 at age 4, falling toward ~1:2 by 6 (adults ~1:7).
- **Part count rises with age** (Goodenough 1926 / Harris 1963 Draw-a-Man scoring) [verify the exact numbers]:
  - about 2–4 recognisable parts at 3
  - about 5–8 at 4
  - about 8–12 at 5
  - about 12–16 at 6
- **The order parts appear in** (roughly):
  1. head
  2. eyes
  3. legs
  4. mouth
  5. arms
  6. trunk
  7. nose
  8. hair
  9. hands or fingers (the count is wrong: 3 to 8)
  10. feet
  11. ears
  12. neck
  13. clothes details
- **Default expression is a smile** [verify]. Children of 4–5 can *intentionally* draw happy vs sad, mostly through the mouth curve. Anger (brows) comes later and less reliably.
  - **So furious at age 3 is funny exactly because it's unlikely.** The app allows it but renders it in the child's limited vocabulary, e.g. a zigzag mouth and red scribble.

### 1.4 How children put strokes on paper
- **Goodnow & Levine's "grammar of action"** (1973) [verify]:
  - start at the top or left
  - horizontals left to right, verticals top down
  - "threading": several parts in one continuous stroke
  - **This decides stroke order and direction**, which shows in the line ends and overlaps.
- **Goodnow's "each to its own space"** (1977) [verify]:
  - Young children avoid overlapping parts. Arms bend away from the body rather than cross it, and things line up instead of occluding each other.
  - **Rule for the layout: no occlusion before ~5.**
- **Joins don't meet** ("synthetic incapacity", and plain motor error):
  - lines stop short or shoot past
  - loops don't close, or close with a little tail
- **Grip** (Schneck & Henderson 1990) [verify]:
  - palmar (fist) grip at ~2–3, so movement comes from the shoulder: big, sweeping, low control
  - digital pronate grip at ~3–4
  - tripod grip at ~4–6, so movement comes from the fingers: smaller, more controlled lines
  - **This drives line size, jitter and speed in the hand model.**
- **Line quality (kinematics)** [verify: e.g. Rueckriegel et al. 2008 on drawing kinematics; general motor-development literature]:
  - Younger children draw **slower, with more velocity peaks per stroke** (less smooth), more pressure variation, and more drift away from the intended path.
  - Smoothness improves steadily with age.

### 1.5 Layout and the page
- **Floating** (3–5): things are scattered and the page has no "up". The motif often sits in the middle and is big. **Size shows importance** (the "affective size" effect: important or loved things drawn bigger) [verify: Thomas & Silk 1990].
- **The baseline** appears around 5–6: things stand on the bottom edge or on a drawn line. The **sky strip** at the top comes at ~6–7.
- **Canonical views**: things are drawn from their most "explaining" side. A car or an animal is shown side-on, a person and a face from the front. Animals often get a **frontal face on a side-on body**, which is a mixed view [verify].
- **"The animal is a person turned sideways"**: young children often draw a four-legged animal as a horizontal human figure, with the head at one end and legs underneath [verify: Cox].
- **X-ray / transparency** (~5–7): the food in the tummy or the people in the house shown through the wall. It's rare at 4.

### 1.6 Colour
- **Lowenfeld** [verify]: preschoolers choose colour by preference and emotion, not by realism. A purple dog is normal at 4; realistic colour ("the grass is green") starts at ~5–6.
- **Colouring in**:
  - younger children make a few back-and-forth zigzags across the shape, going way outside the lines and leaving gaps
  - older children do denser hatching, mostly inside the line, in one direction
- Often **one colour per thing**, and often whichever crayon was nearest.

---

## 2. The dials (the only thing the person sets)

| Dial | Range | Default | What it moves |
|---|---|---|---|
| **age** | 2.5 → 6.0, continuous (labels 3y / 4y / 5y) | 4.0 | everything in the age model (§3) |
| **shakiness** | 0 → 1 | follows age | an extra multiplier on tremor and drift, on top of age |
| **pressure** | light / normal / pressing hard | normal | stroke width, opacity, crayon wax build-up |
| **tool** | crayon, pencil, felt-tip, chunky marker, finger paint (later) | crayon | the medium renderer (§4.5) |
| **hand** | right / left | right | stroke direction, slant, smudge side (left-handers smear their own lines with felt-tip) |
| **attention** | 0 → 1 ("bored after 30 s" → "very focused") | 0.6 | stroke budget: a low value drops late parts and leaves colouring half done |
| **chaos** | 0 → 1 | 0.3 | how much the child improvises: an extra sun, a random heart, a second dog |
| **colour mode** | realistic / favourite colour / "whatever was nearest" | favourite | the colour picker (§4.6) |
| **adorable** | 0 → 1 | 0.5 | **the comedy dial**: pushes head size, eye size and spacing, wonky smile, tiny feet, stubby arms. It stays within what a child could plausibly draw at that age. |
| **seed** | integer | random on first draw | same seed + same dials = same drawing |

**Motif text** is the only free input: "a cat who is very disappointed in me", "grandma at the beach, furious".

**Hidden "expression" field:** the LLM reads it from the motif (happy / sad / frowned / furious / laughing / meh / scared / surprised), and the person can override it with chips.

---

## 3. The age model (pure, deterministic)

```
function capabilities(age, dials):

  # interpolate smoothly between anchor ages 2.5, 3, 4, 5, 6
  # (store the anchor table in one data file so it's easy to tune and cite)

  shapes      = all shapes whose milestone age <= age (+ small random slack from seed)
                # §1.2: circle 3, cross 4, square 4.5–5, triangle 5 ...
  figureType  = tadpole       if age < 4.0
                transitional  if age < 5.0
                conventional  otherwise
                # with a seeded wobble of ±0.3 years, so a "4y" is sometimes still tadpole

  partBudget  = lerp(anchor: 3 → 3, 4 → 7, 5 → 11, 6 → 14) × attention-factor
  headRatio   = lerp(3 → 1.3, 4 → 1.0, 5 → 0.7, 6 → 0.5)   # head height ÷ rest of figure
               then pushed by adorable (up to +40%)

  # motor (from grip stage)
  gripStage   = palmar | pronate | tripod   (from age)
  strokeScale = palmar: big sweeping, tripod: smaller
  tremorAmp   = base(age) × (1 + shakiness)        # high-frequency wiggle
  driftAmp    = base(age) × (1 + shakiness)        # slow wander away from the intended path
  velocityPeaksPerStroke = lerp(3 → 6, 6 → 2)      # jerkiness
  joinError   = lerp(3 → large, 6 → small)         # gap or overshoot at joins, in % of part size
  closureMiss = lerp(3 → often open, 6 → mostly closed, small tail)

  # page logic
  layout      = floating            if age < 5
                baseline-sometimes  if age < 6
                baseline            otherwise
  occlusion   = never if age < 5 else rarely      # Goodnow "own space"
  xray        = chance 0 below 4.5, rising to ~0.3 at 6
  mixedView   = chance for animals: high at 4–5

  # colour
  colourRealism = lerp(3 → 0.1, 6 → 0.6)  overridden by colour mode
  fillStyle     = zigzag-sparse-overflowing (3)  →  hatched-mostly-inside (6)
  fillCoverage  = lerp(3 → 0.3, 6 → 0.8) × attention

  # expression vocabulary
  expressionSkill = 3: mouth curve only
                    4: mouth + eye shape
                    5: + brows sometimes
                    6: + brows, tears, steam

  return Capabilities{...}
```

**Tests** (write them first):
- Monotonic: partBudget, closure and smoothness never get *worse* with age when the seed is fixed.
- At age 3.0 the result never has `triangle` or `square` in its shapes.
- At age 3.5 the figureType is mostly tadpole. Run 100 seeds and expect at least 80% tadpole.
- Shakiness 0 vs 1 at the same age: tremorAmp at least doubles.
- Each anchor value in the table carries a `source:` note (a citation key from §1, or "tuned").

---

## 4. The pipeline, step by step

### 4.1 [1] Interpret: motif → ConceptScene (LLM)

**What goes in:** the motif text and the expression override if any. **Not** the age: the scene is age-free, so the slider stays instant.

**What comes back** (a strict JSON schema, enforced by the API's structured output):

```
ConceptScene {
  title:        short, kid-style, e.g. "grumpy granma and her cat"   # for the UI only
  kidSays:      one line in a 4-year-old voice, for the UI only, never drawn
  things: [                       # 1–5 things, the main one first
    {
      id, label:     "grandma"
      kind:          person | animal4 | animal2 | fish | bug | house | vehicle |
                     tree | flower | sun | cloud | food | object | blob
      importance:    0..1         # drives size (affective size)
      expression:    happy | sad | frowned | furious | laughing | meh | scared | surprised | none
      parts: [                    # in the order a child would add them, most essential first
        { name: "head", primitive: loop }
        { name: "eyes", primitive: dots, count: 2 }
        { name: "glasses", primitive: loops, count: 2, priority: 0.6 }
        { name: "bun", primitive: scribble-cluster, priority: 0.5 }
        ...
      ]
      knownInside:   ["cat food"]  # for x-ray, optional
      colourIdea:    "purple"      # what the kid would pick, optional
      pose:          standing | lying | flying | sitting | jumping
      relation:      { to: "cat", how: holding | next-to | on | inside }   # optional
    }
  ]
  extras: ["sun", "heart"]         # things a child adds on their own (chaos dial uses these)
}
```

- **Primitives are the shared vocabulary:** loop, dot(s), line, zigzag, tab (open rectangle), box, triangle, cross, rays, spiral, scribble-cluster, scribble-fill, U, arc, heart.
- These map 1:1 to Kellogg's diagrams plus a few comedy extras.
- The renderer can fall back from a primitive the child can't make yet to a simpler one: box → loop, triangle → loop with a point, heart → loop.

**Prompt rules for the LLM** (bullets for the system prompt):
- "Describe the motif as a **young child understands it**, not as an adult sees it." Intellectual realism: list what the child *knows* is there.
- "List parts **in the order a child adds them**, essential first", so the age model can cut from the tail.
- "Prefer **canonical views**: animals side-on, people front-on."
- "Never include letters, words or numbers to be drawn."
- "Keep it kind. The child loves the subject, even a furious one."
- Give 3–4 worked examples in the prompt: a cat, a car, "mummy angry", "a dragon eating spaghetti".

**Model and API settings** (for the Claude Code session to implement, as a description and not code):
- Use the official Anthropic TypeScript SDK (`@anthropic-ai/sdk`).
- Model: **`claude-opus-5-5`**. Thinking on this model is adaptive and always on, so don't set a thinking budget.
- Effort `low` or `medium` should be enough. This is a small creative description, so test both.
- Get structured output with the SDK's parse helper and a Zod schema (`messages.parse` with `output_config.format`). Validate again on our side before using it.
- Turn on server-side refusal fallback (`fallbacks: "default"` with its beta header), so a rare decline doesn't stop the drawing.
- Cache the scene by `hash(motif + expression override)`, because the same motif should never cost twice.
- **The key never goes to the browser.** It lives in a small server route (or the CLI's env), and the open-source user brings their own key.
- **Offline mode, with no key:** a keyword → template table (`cat`, `dog`, `house`, `mum`, `sun`, `car`, `dragon` ... about 40 entries) builds the ConceptScene. The app always works, and the tests never call the network.

**Tests:**
- Schema round-trip: every offline template validates.
- Recorded fixtures: 10 real LLM responses saved as JSON, run through the whole pipeline in tests with no network.
- A guard drops any part named like text (word, letter, sign, label).

### 4.2 [2] Age model
See §3. It is pure and takes `(age, dials)`, returning `Capabilities`.

### 4.3 [3] Plan: ConceptScene × Capabilities → StrokePlan (seeded)

```
function plan(scene, caps, rng):

  # 1. which parts survive
  budget = caps.partBudget
  for each thing (main first):
      keep parts in listed order while budget > 0
      a part needing a shape the child can't make → simplify primitive (box→loop ...)
      if thing.kind == person:
          apply figureType:
            tadpole      → merge head+trunk into one loop; legs from the loop;
                           arms (if kept) from the head sides
            transitional → small trunk loop OR two legs with a gap between
            conventional → separate trunk; arms from trunk
      if thing.kind == animal4 and age < 5:
          "person turned sideways": horizontal loop body, 4 stick legs under,
          head loop at one end with a FRONT face (mixed view)
      extra hands/fingers: count = rng(3..8) at 4, rng(4..6) at 5, "sun hands" (rays) at 3–4
  chaos: add 0–2 extras (sun in the corner, heart, a second smaller copy of the main thing)

  # 2. sizes
  for each thing: size = base × (0.5 + importance) × (main ? 1.4 : 1)
  person head: height = caps.headRatio × rest
  adorable: eyes bigger and further apart, feet smaller, arms shorter

  # 3. place
  floating:    main thing large and near centre (slightly up and left: the start point),
               others wherever they fit, small random tilt (−15°..+15°), no overlap
  baseline:    things stand on the page bottom or on a drawn ground line
  "ran out of room" (head-first planning): if the planned figure is taller than the page,
               squash or cut the LAST parts (legs end at the edge, feet missing) — don't shrink the head
  relation "holding": the arm line goes to the other thing, joins badly

  # 4. order and direction (Goodnow)
  for each thing, parts in drawing order: head first, then face, then the rest
  each stroke: start top/left, horizontals L→R (R→L for left hand sometimes),
               verticals top→down; "threading" joins arm-arm or leg-leg into one stroke at 5+
  colouring-in last, and only if attention budget remains

  return StrokePlan{ strokes: [ {intent path, kind, part, thing, order} ], fills: [...] }
```

**Tests:**
- At age 3.2 a "person" yields no separate trunk in most seeds.
- At age < 5 no two things' bounding boxes overlap (the own-space rule).
- The head is always drawn first (order 0) for persons.
- Low attention removes parts from the tail first, never the head or eyes.
- A tall figure that runs out of room keeps its head size.

### 4.4 [4] Hand: intended paths → wobbly strokes (seeded)

```
function hand(stroke, caps, dials, rng):
  points = resample(stroke.intentPath, step = 1.5% of part size)

  # speed profile: several jerky peaks, not one smooth bell
  speed = sum of caps.velocityPeaksPerStroke bumps, random spacing

  for each point i:
      drift  = smoothNoise(t_i × low freq)  × caps.driftAmp    # slow wander, accumulates
      tremor = smoothNoise(t_i × high freq) × caps.tremorAmp   # fast wiggle, bigger where slow
      p_i += normal(i) × (drift + tremor × (1 / speed_i))

  # ends
  start: tiny hook or blob (the crayon lands)
  end:   overshoot or stop short by caps.joinError (sign random)
  closed shapes: end point misses the start by caps.closureMiss
                 (either a gap, or a small crossing tail)

  # corners
  intended sharp corner → rounded if age < 5, or a small loop/overshoot

  # pressure
  width_i = baseWidth(tool, pressure) × (0.8..1.2 noise) × (heavier at stroke start)

  # hand
  left hand: slant reversed, more smudge on felt-tip

  return Stroke{ points, widths }
```

- **The noise must be seeded and continuous** (value or simplex noise driven by `rng(seed, strokeId)`), so one stroke changing never changes the others.
- **Tests:**
  - Same seed gives the same output, byte for byte.
  - At shakiness 0 and age 6 the line stays within ~2% of its intended path.
  - At age 3 there's a closure miss on most loops.
  - Point count is bounded, so the SVG stays small.

### 4.5 [5] Medium: strokes → SVG
- **Crayon:**
  - waxy, broken edges: the stroke is drawn 2–3 times with a slight offset, plus a grainy mask (SVG turbulence, seeded)
  - the paper grain shows through
  - pressing hard means a denser, darker line
- **Pencil:** thin grey with graphite grain, and a light first sketch line sometimes visible
- **Felt-tip:** an even saturated line; ink pools darker at stroke start and end (and at slow points); left-hand smudge
- **Chunky marker:** wide, round ends, where overlapping strokes look darker (multiply)
- **Output:**
  - SVG with a transparent background, one `<g>` per thing (so the T-shirt designer can move them)
  - PNG export at 30 × 40 cm, 300 dpi, transparent
  - a **"line only"** variant: one colour, no fills, for screen printing or one-colour tees

### 4.6 Colour and colouring-in
```
colour for each thing:
  mode realistic        → thing.colourIdea or a realistic table (sun yellow, grass green)
  mode favourite        → pick one "favourite" colour per drawing (seeded) and use it on most things
  mode nearest          → walk a fake crayon box: the last colour used, sometimes the next one

fill for a closed-ish part:
  zigzag strokes across the shape, angle ~random, spacing from age
  coverage stops at caps.fillCoverage; some zigzags exit the outline (age 3: a lot)
  the fill is drawn under the outline? NO — children colour after drawing, so on top,
  and it partly covers the outline
```

### 4.7 Expressions in a child's vocabulary
Carried over from STYLE-RULES §14 and scaled by `expressionSkill`:

| Expression | age 3 (mouth only) | age 4 (+ eyes) | age 5+ (+ brows, extras) |
|---|---|---|---|
| happy | big U | U + dot eyes | U, eyes, maybe cheeks as dots |
| sad / frowned | ∩ | ∩ + droopy eyes | ∩, brows slanting, a tear drop |
| furious | zigzag line | zigzag + small dots close together | zigzag teeth, V brows, red scribble on cheeks, steam squiggles |
| laughing | very big open loop | loop + `^ ^` eyes | D mouth with teeth row, tears flying |
| meh | flat line | flat line + half-lid eyes | flat line, off-centre, half lids |
| scared | small `o` | `o` + big eyes | `o`, big eyes, hair standing up as rays |
| surprised | big `O` | `O` + big round eyes | `O`, eyebrows high up |

- **Comedy rule:** an expression the child "can't do yet" still comes through, but crudely. A furious 3-year-old drawing is just a zigzag mouth and a lot of red. That's the joke, and it's accurate.

---

## 5. What makes it funny (and still honest)
- **The age scrub.** One motif, a slider from 3 to 6, and the drawing "grows up" in front of you. This is the demo, the share moment, and the T-shirt series ("grandma, age 3 / 4 / 5").
- **The adorable dial** stays inside the child's real vocabulary. It exaggerates the things children already do (big head, wide eyes, stubby arms) and never adds adult technique.
- **`kidSays`** next to the drawing, in the UI: "this is granma she is angry because the cat did a wee". Never drawn.
- **Honest mistakes** from the research: the hand with 7 fingers, the legs out of the head, the dog seen from the side with both eyes on one side, the sun in the corner with sunglasses.
- **"Ask again"** keeps the scene but re-rolls the seed, so it's the same kid on another day.
- **Never mean:** no motif mocks real children, and the "ugly" is love-ugly. The LLM prompt says so, and the offline templates do too.

---

## 6. Ugly Crew as presets
- The 10 characters from `../ugly-crew/STYLE-RULES.md` §5 become **saved presets** (motif + dials + seed): Croc furious, Long Dog happy, Cat meh ...
- **New characters are added the way Tibbe asked:** a one-line description becomes a preset. The style stays locked because the dials and the seed are stored with it.
- The reference style (thick black monoline, no fill) is **one tool preset**: chunky black marker, line-only, age about 4.5, adorable 0.7.

---

## 7. App surfaces
- **Web app** (one page):
  - motif box, dials, the drawing big in the middle
  - "Ask again" (new seed), "Grow up" scrub, export SVG / PNG / line-only
  - share link = the motif + dials + seed in the URL (no server storage)
- **CLI:** `crayon "a furious grandma" --age 4 --tool crayon --seed 11 --out grandma.svg`. Good for batch sheets.
- **Library:** the core packages on npm, so other apps (Tibbe's T-shirt designer) can call `draw(scene, dials)` directly.
- **Optional, later:** an Idun CMS / T-lab integration, where a drawing goes straight into the tee designer.

---

## 8. Open-source setup
- **Licence:** MIT.
- **Repo layout** (pnpm workspace, TypeScript):
  - `packages/core`: age model, planner, hand, medium. Pure, with zero runtime dependencies. All the science numbers live in one `anchors` data file with source notes.
  - `packages/interpret`: the LLM step plus the offline templates
  - `apps/web`: SvelteKit (Tibbe's stack), static plus one server route for the API key
  - `apps/cli`
- **`SCIENCE.md`:** every anchor value with its citation and the [verify] status. PRs that change a number must cite something.
- **The tests come first** for core (age model, planner, hand). There are golden SVG snapshots for ~20 motif × age × seed combinations, plus visual review sheets as PNG grids.
- **No network in tests.** The LLM is mocked with the recorded fixtures.
- **Privacy:** motifs go to the API only, and nothing is stored server-side. The README says so.
- **Name ideas:** Crayon-o-matic (fits the shop's machines), Fridge Door, Age Four, Scribble Engine. Check npm and GitHub for clashes before choosing.

---

## 9. Phases (each one shippable)
1. **Core, offline:**
   - age model + planner + hand + one medium (crayon), with offline templates for ~10 motifs
   - CLI only
   - tests and golden sheets: the "grandma at 3/4/5" grid has to *look right* to Tibbe
2. **The interpreter:** Claude structured output, caching, fallback, recorded fixtures.
3. **Web app:** dials, the scrub, export, share links.
4. **More media and colour modes**, plus the line-only print export at 30 × 40 cm.
5. **Ugly Crew presets** and the hand-off into Tibbe's T-shirt designer / T-lab.
6. **Open-source launch:** README, SCIENCE.md, a demo site, npm publish.

---

## 10. Open questions (for Tibbe, when the session reaches them)
1. The **name**: Crayon-o-matic, or something outside the Bold Statement family, since it's open source?
2. **Age range:** only 3–5, or let the slider go 2–7 (2 = pure scribble, 7 = baseline and sky)?
3. **Hosted demo:** whose API key pays for it? Rate limits, or bring-your-own-key only?
4. **Is a photo input wanted** later ("draw my dog like a 4-year-old", from a photo)? It fits the same pipeline, as an image input to the interpreter.
5. **Where does it live:** a separate public repo (cleaner for open source), or a package in the idunworks monorepo?
6. Should the science claims be checked by a real source pass before launch? Recommended: yes, all the [verify] marks.
