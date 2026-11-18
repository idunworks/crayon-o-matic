<script lang="ts">
	import { parseScene } from '@crayon-o-matic/interpret';
	import { Studio, type StudioInterpret } from '@crayon-o-matic/studio';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/** With a model on the server, ask it; the answer is checked again here before drawing. */
	const viaServer: StudioInterpret = async (motif) => {
		const res = await fetch('/api/interpret', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ motif }) });
		if (!res.ok) throw new Error(`interpret failed: ${res.status}`);
		const body = (await res.json()) as { scene: unknown; source?: string; note?: string };
		return { scene: parseScene(body.scene), ...(body.source ? { source: body.source } : {}), ...(body.note ? { note: body.note } : {}) };
	};
</script>

<svelte:head>
	<title>Crayon-o-matic: draws anything like a 3–6 year old would</title>
	<meta name="description" content="Type a motif or draw by hand, pick an age, and get the drawing a child would make. Open source." />
</svelte:head>

<main>
	<Studio
		{...(data.reader ? { interpret: viaServer } : {})}
		notice={data.reader ? '' : 'Reads the built-in words. Self-host with your own key or local model to read anything.'}
	/>
</main>

<style>
	:global(html, body) {
		margin: 0;
		height: 100%;
	}
	main {
		height: 100dvh;
	}
</style>
