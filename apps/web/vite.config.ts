import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit({ adapter: adapter() })],
	// the packages ship TypeScript source: let Vite compile them for server rendering too
	ssr: { noExternal: [/^@crayon-o-matic\//] }
});
