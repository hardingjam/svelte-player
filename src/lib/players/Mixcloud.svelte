<script lang="ts">
	import type { GlobalSDKMixcloudKey } from './global.types';
	import type { MixcloudWidget } from './mixcloud.global.types';
	import type { PlayerCallbackProps } from './types';
	import type { MixcloudConfig } from './mixcloud.types';

	import { onMount } from 'svelte';
	import { queryString, getSDK } from './utils';
	import { MATCH_URL_MIXCLOUD } from './patterns';

	interface Props extends PlayerCallbackProps {
		url: string;
		config: MixcloudConfig;
	}

	let { url, config, onPlayerMount, onReady, onPlay, onPause, onEnded, onError }: Props = $props();

	const SDK_URL = 'https://widget.mixcloud.com/media/js/widgetApi.js';
	const SDK_GLOBAL: GlobalSDKMixcloudKey = 'Mixcloud';

	let iframeContainer: HTMLIFrameElement;
	let player: MixcloudWidget;

	let duration: number | null = null;
	let currentTime: number | null = null;

	onMount(function () {
		onPlayerMount?.();
	});

	export function load() {
		getSDK(SDK_URL, SDK_GLOBAL).then(
			function (Mixcloud) {
				player = Mixcloud.PlayerWidget(iframeContainer);
				player.ready.then(function () {
					player.events.play.on(function () {
						onPlay?.();
					});
					player.events.pause.on(function () {
						onPause?.();
					});
					player.events.ended.on(function () {
						onEnded?.();
					});
					player.events.error.on(function (error) {
						onError?.({
							error
						});
					});
					player.events.progress.on(function (seconds, durationParam) {
						currentTime = seconds;
						duration = durationParam;
					});
					onReady?.();
				});
			},
			function (error) {
				onError?.({
					error
				});
			}
		);
	}

	export function play() {
		player.play();
	}

	export function pause() {
		player.pause();
	}

	export function stop() {
		// Nothing to do
	}

	export function seekTo(seconds: number, keepPlaying = true) {
		player.seek(seconds);
		if (!keepPlaying) {
			pause();
		}
	}

	export function setVolume(_: number) {
		// No volume support
	}

	export function mute() {
		// No volume support
	}

	export function unmute() {
		// No volume support
	}

	export function getDuration() {
		return duration;
	}

	export function getCurrentTime() {
		return currentTime;
	}

	export function getSecondsLoaded() {
		return null;
	}

	export function getPlayer() {
		return player;
	}

	export function _setPlayer(newPlayer: MixcloudWidget) {
		player = newPlayer;
	}

	export function _setDuration(newDuration: number) {
		duration = newDuration;
	}

	export function _setCurrentTime(newCurrentTime: number) {
		currentTime = newCurrentTime;
	}

	let id = $derived(url.match(MATCH_URL_MIXCLOUD)?.[1]);
	let query = $derived(
		queryString({
			...config.options,
			feed: `/${id}/`
		})
	);
</script>

<iframe
	bind:this={iframeContainer}
	title="Mixcloud Player"
	class="mixcloud-player"
	src={`https://www.mixcloud.com/widget/iframe/?${query}`}
	frameborder={0}
	allow="autoplay"
/>

<style>
	.mixcloud-player {
		width: 100%;
		height: 100%;
	}
</style>
