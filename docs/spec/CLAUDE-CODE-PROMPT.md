# Opening prompt for a Claude Code session

**Before you start:** download this `kid-drawing-app/` folder from the project thread and put it in the new repo as `docs/spec/`. A local session can't see the cloud project folder.

Paste this:

> Read `docs/spec/SPEC.md`. It's a logic spec (bullets and pseudocode) for an open-source app that draws pictures the way a 3-, 4- or 5-year-old would, from a motif text and a few dials.
>
> Build it as a pnpm TypeScript workspace, MIT licence, in the phases of §9, and stop after each phase for me to look. Start with Phase 1: `packages/core` (age model, planner, hand, crayon medium) and the offline templates, with **tests first**, plus a CLI that writes SVG.
>
> Rules:
> - Everything after the LLM step is pure and seeded: same seed + dials = same SVG.
> - All the science numbers go in one anchors data file with a source note each, and are mirrored in `SCIENCE.md` with their [verify] status. Don't invent new numbers without marking them "tuned".
> - Never draw text into the image.
> - For the Claude API step (Phase 2), use the official `@anthropic-ai/sdk`, model `claude-opus-5-5`, with structured output via a Zod schema, and look up the current SDK docs rather than guessing. The API key never goes to the browser.
> - After Phase 1, render a review sheet PNG: 4 motifs × ages 3 / 4 / 5 / 6 × 2 seeds.
>
> Ask me the open questions in §10 when you reach them, not up front.
