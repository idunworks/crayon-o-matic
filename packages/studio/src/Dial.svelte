<!-- One labelled slider with its value; the ends say what the extremes mean. -->
<script lang="ts">
	interface Props {
		label: string;
		value: number;
		min: number;
		max: number;
		step: number;
		/** What the low and high ends mean, e.g. ['straight', 'a mess']. */
		ends?: readonly [string, string];
		format?: (v: number) => string;
	}
	let { label, value = $bindable(), min, max, step, ends, format = (v) => String(v) }: Props = $props();
	const id = `cs-dial-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="cs-dial">
	<label for={id}>{label}</label>
	<output for={id}>{format(value)}</output>
	<input {id} type="range" {min} {max} {step} bind:value />
	{#if ends}
		<span class="cs-ends" aria-hidden="true"><span>{ends[0]}</span><span>{ends[1]}</span></span>
	{/if}
</div>

<style>
	.cs-dial {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2px 8px;
		margin: 0 0 10px;
	}
	label {
		font-weight: 600;
	}
	output {
		font-variant-numeric: tabular-nums;
		opacity: 0.75;
	}
	input {
		grid-column: 1 / -1;
		width: 100%;
		accent-color: var(--cs-accent, #232323);
	}
	.cs-ends {
		grid-column: 1 / -1;
		display: flex;
		justify-content: space-between;
		font-size: 0.75em;
		opacity: 0.6;
	}
</style>
