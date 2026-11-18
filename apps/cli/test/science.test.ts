import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderScience } from '../src/science.js';

describe('SCIENCE.md', () => {
	it('is up to date with the anchors file (run `pnpm crayon --science`)', () => {
		const file = readFileSync(fileURLToPath(new URL('../../../SCIENCE.md', import.meta.url)), 'utf8');
		expect(file).toBe(renderScience());
	});
});
