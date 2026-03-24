<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		onclick?: () => void;
		children?: Snippet;
	}

	let { onclick, children }: Props = $props();
</script>

<button {onclick}>
	{#if children}{@render children()}{/if}
</button>
