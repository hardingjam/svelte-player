<script lang="ts" module>
	import type { Player as PlayerType } from './players/types';
	import players from './players';

	const customPlayers: PlayerType[] = [];

	export function addCustomPlayer(player: PlayerType) {
		customPlayers.push(player);
	}

	export function removeCustomPlayers() {
		customPlayers.length = 0;
	}

	export function canPlay(url: PlayerUrl) {
		for (const Player of [...customPlayers, ...players]) {
			if (Player.canPlay(url)) {
				return true;
			}
		}
		return false;
	}

	export function canEnablePIP(url: PlayerUrl) {
		for (const Player of [...customPlayers, ...players]) {
			if (Player.canEnablePIP && Player.canEnablePIP(url)) {
				return true;
			}
		}
		return false;
	}
</script>

<script lang="ts">
	import type {
		PlayerMediaRef,
		SeekToType,
		SveltePlayerCallbackProps,
		SveltePlayerSnippetProps
	} from './types';
	import type { RecursivePartial } from './players/utility.types';
	import type {
		PlayerUrl,
		PlayerConfig,
		PlayerConfigProps,
		PlayerGetPlayerKey,
		PlayerInternalPlayer
	} from './players/types';

	import merge from 'deepmerge';
	import memoize from 'memoize-one';
	import Player from './PlayerMedia.svelte';
	import Preview from './Preview.svelte';
	import { defaultConfig } from './props';

	interface Props extends SveltePlayerCallbackProps, SveltePlayerSnippetProps {
		url: PlayerUrl;
		playing?: boolean;
		loop?: boolean;
		controls?: boolean;
		light?: boolean | string;
		volume?: number | null;
		muted?: boolean;
		playbackRate?: number;
		width?: string;
		height?: string;
		progressInterval?: number;
		playsinline?: boolean;
		pip?: boolean;
		stopOnUnmount?: boolean;
		previewTabIndex?: number;
		config?: RecursivePartial<PlayerConfig>;
		oEmbedUrl?: string;
		progressFrequency?: number;
		display?: string;
	}

	let {
		url,
		playing = false,
		loop = false,
		controls = false,
		light: lightProp = false,
		volume = null,
		muted = false,
		playbackRate = 1,
		width = '640px',
		height = '360px',
		progressInterval = 1000,
		playsinline = false,
		pip = false,
		stopOnUnmount = true,
		previewTabIndex = 0,
		config = {},
		oEmbedUrl = 'https://noembed.com/embed?url={url}',
		progressFrequency = undefined,
		display = undefined,
		onReady,
		onStart,
		onPlay,
		onPause,
		onBuffer,
		onBufferEnd,
		onSeek,
		onEnded,
		onError,
		onProgress,
		onDuration,
		onEnablePIP,
		onDisablePIP,
		onPlaybackRateChange,
		onPlaybackQualityChange,
		onClickPreview,
		lightSnippet,
		playIconSnippet
	}: Props = $props();

	export const someValue = 123;

	let playerRef: PlayerMediaRef;
	let isElementLight = !!playIconSnippet || !!lightSnippet;
	let showPreviewState = $state(!!lightProp || isElementLight);

	function handleClickPreview(e: Event) {
		showPreviewState = false;
		onClickPreview?.();
	}

	function handleReady() {
		onReady?.();
	}

	export function showPreview() {
		showPreviewState = true;
	}

	export function getDuration() {
		if (!playerRef) {
			return null;
		}
		return playerRef.getDuration();
	}

	export function getCurrentTime() {
		if (!playerRef) {
			return null;
		}
		return playerRef.getCurrentTime();
	}

	export function getSecondsLoaded() {
		if (!playerRef) {
			return null;
		}
		return playerRef.getSecondsLoaded();
	}

	export function getInternalPlayer<TKey extends PlayerGetPlayerKey>(
		key: TKey | 'player' = 'player'
	): PlayerInternalPlayer['player'] | PlayerInternalPlayer[TKey] | null {
		if (!playerRef) {
			return null;
		}
		return playerRef.getInternalPlayer(key);
	}

	export function seekTo(fraction: number, type?: SeekToType, keepPlaying?: boolean) {
		if (!playerRef) {
			return null;
		}
		playerRef.seekTo(fraction, type, keepPlaying);
	}

	function getConfig<TUrl extends PlayerUrl, TKey extends string>(
		configUrl: TUrl,
		configKey: TKey
	) {
		const memoized = memoize<(url: TUrl, key: TKey) => PlayerConfigProps>((_, key) => {
			return merge<PlayerConfigProps>(defaultConfig[key] || {}, config[key] || {});
		});

		return memoized(configUrl, configKey);
	}

	export function _getPlayer() {
		return playerRef;
	}

	export function _setPlayer(newPlayer: PlayerMediaRef) {
		playerRef = newPlayer;
	}
</script>

{#if showPreviewState}
	{#if url}
		<Preview
			light={lightProp}
			{previewTabIndex}
			{oEmbedUrl}
			url={typeof url !== 'string' ? '' : url}
			hasPlayIcon={!!playIconSnippet}
			{isElementLight}
			onclick={handleClickPreview}
			{lightSnippet}
			{playIconSnippet}
		/>
	{/if}
{:else}
	{#each [...customPlayers, ...players] as player}
		{#if player.canPlay(url)}
			<Player
				{url}
				{muted}
				{playing}
				{stopOnUnmount}
				{loop}
				{progressInterval}
				{progressFrequency}
				{playbackRate}
				{volume}
				{controls}
				{playsinline}
				{pip}
				{width}
				{height}
				{display}
				loopOnEnded={player.loopOnEnded}
				forceLoad={player.forceLoad}
				config={getConfig(url, player.key)}
				activePlayer={player.loadComponent}
				bind:this={playerRef}
				onReady={handleReady}
				{onStart}
				{onPlay}
				{onPause}
				{onBuffer}
				{onPlaybackRateChange}
				{onSeek}
				{onEnded}
				{onError}
				{onProgress}
				{onDuration}
				{onPlaybackQualityChange}
			/>
		{/if}
	{/each}
{/if}
