/**
 * Installs the packed tarball in an empty folder and uses it like a stranger would:
 * draw from the engine, read a motif offline, compile the studio with Svelte.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const out = mkdtempSync(join(process.env.SMOKE_DIR ?? tmpdir(), 'crayon-smoke-'));
execFileSync('npm', ['pack', '--pack-destination', out], { cwd: here, stdio: 'ignore' });
const tarball = readdirSync(out).find((f) => f.endsWith('.tgz'));
writeFileSync(join(out, 'package.json'), JSON.stringify({ name: 'smoke', private: true, type: 'module' }));
execFileSync('npm', ['install', '--no-audit', '--no-fund', '--silent', `./${tarball}`, 'svelte@5'], { cwd: out, stdio: 'inherit' });
writeFileSync(
	join(out, 'use.mjs'),
	`import { draw, drawFreehand, contentBox, cropSvg, FORMS } from 'crayon-o-matic';
import { interpretOffline } from 'crayon-o-matic/interpret';
import { readFileSync } from 'node:fs';
import { compile } from 'svelte/compiler';
const d = draw(interpretOffline('a sad rocket'), { age: 4, seed: 3, palette: ['#232323', '#c8c2b4'] });
if (!d.svg.startsWith('<svg ')) throw new Error('no svg');
const crop = cropSvg(d.svg, contentBox(d.strokes, d.dials));
const free = drawFreehand({ page: { w: 300, h: 400 }, strokes: [{ points: [{ x: 10, y: 10 }, { x: 90, y: 40 }] }] }, {}, 0.5);
for (const f of ['Studio', 'Paper', 'Dial']) compile(readFileSync('node_modules/crayon-o-matic/dist/studio/' + f + '.svelte', 'utf8'), { generate: 'client' });
console.log('ok', d.svg.length, crop.length, free.strokes.length, FORMS.length, 'forms');`
);
execFileSync('node', ['use.mjs'], { cwd: out, stdio: 'inherit' });
