#!/usr/bin/env -S npx tsx
/**
 * crayon "a furious grandma" --age 4 --seed 11 --out grandma.svg   (spec §7)
 * crayon --sheet --out review.png                                   (phase 1 review sheet)
 */
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { DEFAULT_PAGE, EXPRESSIONS, draw, type ColourMode, type Dials, type Expression, type Handedness, type Pressure } from '@crayon-o-matic/core';
import { claudeInterpreter, DEFAULT_CLAUDE_MODEL, DEFAULT_LOCAL_URL, interpretWithFallback, localInterpreter, offlineInterpreter, type Interpreter } from '@crayon-o-matic/interpret/server';
import { svgToPng, svgToPngWidth } from './png.js';
import { renderScience } from './science.js';
import { reviewSheet } from './sheet.js';

const HELP = `crayon-o-matic: draws a motif the way a 3–6 year old would.

usage:
  crayon "<motif>" [options]           write an SVG (or PNG with --png)
  crayon --sheet [--out review.png]    the 4 motifs × 4 ages × 2 seeds review sheet
  crayon --sheet "cat; a scared dog"   a sheet of your own motifs (separated by ;)

options:
  --age <2.5–6>          default 4
  --seed <int>           default 1 (same seed + dials = same drawing)
  --shaky <0–1>          0 dead straight, 0.5 typical for the age (default), 1 a mess
  --pressure <light|normal|hard>
  --hand <right|left>
  --attention <0–1>      low = bored, drops late parts and colouring
  --chaos <0–1>          extras the child improvises (a sun, a heart)
  --adorable <0–1>       the comedy dial
  --colour-mode <realistic|favourite|nearest>
  --palette <hex,hex,…>  1–3 colours: lines, shadow, highlight (default #232323 only)
  --line-only            lines only: no shadow or highlight
  --colour-in            colour shapes in with the 2nd colour (off by default)
  --shadow-angle <0–360> where the shadow falls: 0 right, 90 down (default 50)
  --shadow-length <mm>   how far it's cast, 0–30 (default 9)
  --shadow-cut <0–1>     0 every line casts; 1 only edges facing away from the light (default 0.6)
  --highlight-angle, --highlight-length, --highlight-cut
                         the same for the highlight (3rd colour; defaults 230, 4, 0.6)
  --expression <${EXPRESSIONS.join('|')}>
  --interpreter <offline|claude|local>
                         who reads the motif (default offline: the built-in templates)
                         claude: your key in ANTHROPIC_API_KEY; model in CRAYON_CLAUDE_MODEL
                                 (default ${DEFAULT_CLAUDE_MODEL})
                         local:  an OpenAI-compatible server (Ollama, llama.cpp, vLLM ...)
                                 CRAYON_LOCAL_URL (default ${DEFAULT_LOCAL_URL}),
                                 CRAYON_LOCAL_MODEL (required), CRAYON_LOCAL_KEY (optional)
                         if the model fails, the built-in templates draw instead
  --out <file>           .svg or .png (default: drawing.svg)
  --png                  write a PNG at print size (30 × 40 cm) instead of SVG
  --dpi <n>              PNG resolution, default 300
  --json                 print the interpreted scene, don't draw
  --science              regenerate SCIENCE.md from the anchors file`;

const INTERPRETERS = ['offline', 'claude', 'local'] as const;

function interpreterFor(kind: (typeof INTERPRETERS)[number] | undefined): Interpreter {
	const env = process.env;
	if (kind === 'claude') return claudeInterpreter(env.CRAYON_CLAUDE_MODEL ? { model: env.CRAYON_CLAUDE_MODEL } : {});
	if (kind === 'local') {
		if (!env.CRAYON_LOCAL_MODEL) fail('--interpreter local needs CRAYON_LOCAL_MODEL, e.g. qwen2.5:3b');
		return localInterpreter({ model: env.CRAYON_LOCAL_MODEL, ...(env.CRAYON_LOCAL_URL ? { baseUrl: env.CRAYON_LOCAL_URL } : {}), ...(env.CRAYON_LOCAL_KEY ? { apiKey: env.CRAYON_LOCAL_KEY } : {}) });
	}
	return offlineInterpreter;
}

const PRESSURES: readonly Pressure[] = ['light', 'normal', 'hard'];
const HANDS: readonly Handedness[] = ['right', 'left'];
const MODES: readonly ColourMode[] = ['realistic', 'favourite', 'nearest'];
const DEFAULT_DPI = 300;
const SHEET_WIDTH_PX = 2400;

function fail(msg: string): never {
	process.stderr.write(`crayon: ${msg}\n\n${HELP}\n`);
	process.exit(2);
}

function num(v: string | undefined, name: string, min: number, max: number): number | undefined {
	if (v === undefined) return undefined;
	const n = Number(v);
	if (!Number.isFinite(n) || n < min || n > max) fail(`--${name} must be a number from ${min} to ${max}`);
	return n;
}

function oneOf<T extends string>(v: string | undefined, name: string, allowed: readonly T[]): T | undefined {
	if (v === undefined) return undefined;
	if (!(allowed as readonly string[]).includes(v)) fail(`--${name} must be one of ${allowed.join(', ')}`);
	return v as T;
}

async function main(): Promise<void> {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			age: { type: 'string' }, seed: { type: 'string' }, shaky: { type: 'string' }, pressure: { type: 'string' },
			hand: { type: 'string' }, attention: { type: 'string' }, chaos: { type: 'string' }, adorable: { type: 'string' },
			'colour-mode': { type: 'string' }, palette: { type: 'string' }, 'line-only': { type: 'boolean' }, 'colour-in': { type: 'boolean' }, 'shadow-angle': { type: 'string' }, 'shadow-length': { type: 'string' }, 'shadow-cut': { type: 'string' }, 'highlight-angle': { type: 'string' }, 'highlight-length': { type: 'string' }, 'highlight-cut': { type: 'string' },
			expression: { type: 'string' }, out: { type: 'string' }, png: { type: 'boolean' }, dpi: { type: 'string' },
			json: { type: 'boolean' }, interpreter: { type: 'string' }, sheet: { type: 'boolean' }, science: { type: 'boolean' }, help: { type: 'boolean', short: 'h' }
		}
	});
	if (values.help) return void process.stdout.write(`${HELP}\n`);
	if (values.science) {
		writeFileSync('SCIENCE.md', renderScience());
		return void process.stdout.write('wrote SCIENCE.md\n');
	}

	const dials: Partial<Dials> = {};
	const set = <K extends keyof Dials>(k: K, v: Dials[K] | undefined) => { if (v !== undefined) dials[k] = v; };
	set('age', num(values.age, 'age', 2.5, 6));
	set('seed', num(values.seed, 'seed', 0, 2 ** 32 - 1));
	set('shakiness', num(values.shaky, 'shaky', 0, 1));
	set('attention', num(values.attention, 'attention', 0, 1));
	set('chaos', num(values.chaos, 'chaos', 0, 1));
	set('adorable', num(values.adorable, 'adorable', 0, 1));
	set('shadowAngle', num(values['shadow-angle'], 'shadow-angle', 0, 360));
	set('shadowLength', num(values['shadow-length'], 'shadow-length', 0, 30));
	set('shadowCut', num(values['shadow-cut'], 'shadow-cut', 0, 1));
	set('highlightAngle', num(values['highlight-angle'], 'highlight-angle', 0, 360));
	set('highlightLength', num(values['highlight-length'], 'highlight-length', 0, 30));
	set('highlightCut', num(values['highlight-cut'], 'highlight-cut', 0, 1));
	set('pressure', oneOf(values.pressure, 'pressure', PRESSURES));
	set('hand', oneOf(values.hand, 'hand', HANDS));
	set('colourMode', oneOf(values['colour-mode'], 'colour-mode', MODES));
	if (values.palette) {
		const cols = values.palette.split(',').map((c) => c.trim());
		if (cols.length > 3 || cols.some((c) => !/^#[0-9a-f]{6}$/i.test(c))) fail('--palette takes 1 to 3 colours like #232323,#d7263d');
		dials.palette = cols;
	}
	if (values['line-only']) dials.lineOnly = true;
	if (values['colour-in']) dials.colourIn = true;
	const dpi = num(values.dpi, 'dpi', 30, 1200) ?? DEFAULT_DPI;

	if (values.sheet) {
		const out = values.out ?? 'review-sheet.png';
		// optional: --sheet "motif one; motif two" for a custom set of rows
		const custom = positionals.join(' ').split(';').map((m) => m.trim()).filter(Boolean);
		const svg = custom.length ? reviewSheet(dials, custom) : reviewSheet(dials);
		if (out.endsWith('.svg')) writeFileSync(out, svg);
		else writeFileSync(out, svgToPngWidth(svg, SHEET_WIDTH_PX));
		return void process.stdout.write(`wrote ${out}\n`);
	}

	const motif = positionals.join(' ').trim();
	if (!motif) fail('give a motif, e.g. crayon "a furious grandma with a cat"');
	const expression = oneOf(values.expression, 'expression', EXPRESSIONS as readonly Expression[]);
	const interpreter = interpreterFor(oneOf(values.interpreter, 'interpreter', INTERPRETERS));
	const { scene, source, fallbackReason } = await interpretWithFallback(interpreter, motif, expression ? { expression } : {});
	if (fallbackReason) process.stderr.write(`crayon: ${fallbackReason}; drew from the built-in templates instead\n`);
	if (values.json) return void process.stdout.write(`${JSON.stringify(scene, null, 2)}\n`);

	const drawing = draw(scene, dials);
	const png = values.png || values.out?.endsWith('.png');
	const out = values.out ?? (png ? 'drawing.png' : 'drawing.svg');
	writeFileSync(out, png ? svgToPng(drawing.svg, DEFAULT_PAGE.w, dpi) : drawing.svg);
	// the kid's line is for the UI only; it never goes into the image
	process.stdout.write(`wrote ${out} (read by ${source})\n${scene.title}: “${scene.kidSays}”\n`);
}

main().catch((err: unknown) => {
	process.stderr.write(`crayon: ${err instanceof Error ? err.message : String(err)}\n`);
	process.exit(1);
});
