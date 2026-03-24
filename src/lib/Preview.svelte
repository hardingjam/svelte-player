<script lang="ts" module>
	const cache: Record<string, string> = {};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount, untrack } from 'svelte';

	interface Props {
		previewTabIndex: number;
		url: string;
		light: boolean | string;
		oEmbedUrl: string;
		isElementLight: boolean;
		hasPlayIcon: boolean;
		onclick?: (event: Event) => void;
		lightSnippet?: Snippet;
		playIconSnippet?: Snippet;
	}

	let {
		previewTabIndex,
		url,
		light,
		oEmbedUrl,
		isElementLight,
		hasPlayIcon,
		onclick,
		lightSnippet,
		playIconSnippet
	}: Props = $props();

	const ICON_SIZE = '64px';

	let image: string | null = $state(null);

	onMount(function () {
		fetchImage({ url, light, oEmbedUrl });
	});

	$effect(() => {
		url;
		light;
		untrack(() => {
			fetchImage({ url, light, oEmbedUrl });
		});
	});

	type FetchImageParams = { url: typeof url; light: typeof light; oEmbedUrl: typeof oEmbedUrl };
	function fetchImage({ url, light, oEmbedUrl }: FetchImageParams) {
		if (isElementLight) {
			return;
		}
		if (typeof light === 'string') {
			image = light;
			return;
		}
		if (cache[url]) {
			image = cache[url];
			return;
		}
		image = null;
		return window
			.fetch(oEmbedUrl.replace('{url}', url))
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				if (data.thumbnail_url) {
					const fetchedImage = data.thumbnail_url
						.replace('height=100', 'height=480')
						.replace('-d_295x166', '-d_640');
					image = fetchedImage;
					cache[url] = fetchedImage;
				}
			});
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			onclick?.(e);
		}
	}

	const flexCenter = `
		display: flex;
		align-items: center;
		justify-content: center;
	`;
	let preview = $derived(`
		width: 100%;
		height: 100%;
		${image && !isElementLight ? `background-image: url(${image});` : ''} 
		background-size: cover;
		background-position: center; 
		cursor: pointer;
		overflow: hidden;
		position: relative;
		${flexCenter}
	`);
	let shadow = $derived(`
		background: radial-gradient(rgb(0, 0, 0, 0.3), rgba(0, 0, 0, 0) 60%);
		border-radius: ${ICON_SIZE};
		width: ${ICON_SIZE};
		height: ${ICON_SIZE};
		${isElementLight ? 'position: absolute;' : ''}
		${flexCenter}
	`);
	const playIconStyle = `
		border-style: solid;
		border-width: 16px 0 16px 26px;
		border-color: transparent transparent transparent white;
		margin-left: 7px;
	`;

	let playIconWrapperStyle = $derived(`
		width: 100%;
		position: absolute;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		display: ${hasPlayIcon ? 'flex' : 'none'}
	`);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	style={preview}
	tabindex={previewTabIndex}
	class="svelte-player__preview"
	role="button"
	onclick={(e) => onclick?.(e)}
	onkeypress={handleKeyPress}
>
	{#if lightSnippet}{@render lightSnippet()}{/if}
	<div style={playIconWrapperStyle}>
		{#if playIconSnippet}{@render playIconSnippet()}{/if}
	</div>

	{#if !hasPlayIcon}
		<div style={shadow} class="svelte-player__shadow">
			<div style={playIconStyle} class="svelte-player__play-icon" />
		</div>
	{/if}
</div>
