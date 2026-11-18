/**
 * Builds the one published package from the workspace packages:
 *   dist/core, dist/interpret (+ server)  bundled ESM with types (tsup)
 *   dist/studio                           the Svelte component, packaged (svelte-package)
 * Internal names (@crayon-o-matic/*) become the public ones (crayon-o-matic/*).
 */
import { execFileSync } from 'node:child_process';
import { cpSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'tsup';

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const repo = join(here, '..', '..');
const dist = join(here, 'dist');
const PUBLIC_NAMES = [
	[/(['"])@crayon-o-matic\/interpret\/server\1/g, '$1crayon-o-matic/interpret/server$1'],
	[/(['"])@crayon-o-matic\/interpret\1/g, '$1crayon-o-matic/interpret$1'],
	[/(['"])@crayon-o-matic\/core\1/g, '$1crayon-o-matic$1']
];

rmSync(dist, { recursive: true, force: true });

await build({
	entry: {
		'core/index': join(repo, 'packages/core/src/index.ts'),
		'interpret/index': join(repo, 'packages/interpret/src/index.ts'),
		'interpret/server': join(repo, 'packages/interpret/src/server.ts')
	},
	outDir: dist,
	format: ['esm'],
	target: 'es2022',
	platform: 'neutral',
	splitting: true,
	treeshake: true,
	sourcemap: true,
	external: ['zod', '@anthropic-ai/sdk'],
	noExternal: [/^@crayon-o-matic\//],
	dts: { resolve: [/^@crayon-o-matic\//] },
	tsconfig: join(here, 'tsconfig.build.json'),
	silent: true
});

execFileSync('pnpm', ['exec', 'svelte-package', '-i', join(repo, 'packages/studio/src'), '-o', join(dist, 'studio')], { cwd: here, stdio: 'inherit' });

function rewrite(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) rewrite(path);
		else if (/\.(js|ts|svelte)$/.test(name)) {
			const before = readFileSync(path, 'utf8');
			const after = PUBLIC_NAMES.reduce((s, [re, to]) => s.replace(re, to), before);
			if (after !== before) writeFileSync(path, after);
		}
	}
}
rewrite(dist);

cpSync(join(repo, 'LICENSE'), join(here, 'LICENSE'));
console.log('built crayon-o-matic → dist/');
