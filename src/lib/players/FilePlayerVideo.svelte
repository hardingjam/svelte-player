<script lang="ts">
	import type { HTMLVideoAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import type { FileUrl, AddListenersFn, RemoveListenersFn } from './file.types';

	import { onMount, untrack } from 'svelte';
	import { isMediaStream } from './utils';

	interface Props {
		url: FileUrl;
		src: string | undefined;
		style: string | undefined;
		preload: '' | 'none' | 'metadata' | 'auto' | undefined;
		autoplay: boolean | undefined;
		controls: boolean | undefined;
		muted: boolean | undefined;
		loop: boolean | undefined;
		attributes: Partial<HTMLVideoAttributes> | undefined;
		addListeners: AddListenersFn;
		removeListeners: RemoveListenersFn;
		children?: Snippet;
	}

	let {
		url,
		src,
		style,
		preload,
		autoplay,
		controls,
		muted,
		loop,
		attributes,
		addListeners,
		removeListeners,
		children
	}: Props = $props();

	let player: HTMLVideoElement;

	$effect(() => {
		url;
		untrack(() => {
			if (player !== undefined && !isMediaStream(url) && !(url instanceof Array)) {
				player.srcObject = null;
			}
		});
	});

	onMount(function () {
		addListeners(player);

		return function () {
			player.removeAttribute('src');
			removeListeners(player, url);
		};
	});

	export function getPlayer() {
		return player;
	}
</script>

<video
	bind:this={player}
	{src}
	{style}
	{preload}
	{autoplay}
	{controls}
	{muted}
	{loop}
	{...attributes}
>
	{#if children}{@render children()}{/if}
</video>
