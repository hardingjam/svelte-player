<script lang="ts">
	import type { GlobalSDKPlayerJSKey } from './global.types';
	import type { PlayerJSPlayer } from './playerjs.global.types';
	import type { PlayerCallbackProps } from './types';

	import { onMount } from 'svelte';
	import { getSDK } from './utils';
	import { MATCH_URL_STREAMABLE } from './patterns';

	interface Props extends PlayerCallbackProps {
		url: string;
		loop: boolean;
		muted: boolean;
	}

	let {
		url,
		loop,
		muted,
		onPlayerMount,
		onReady,
		onPlay,
		onPause,
		onSeek,
		onEnded,
		onError
	}: Props = $props();

	const SDK_URL = 'https://cdn.embed.ly/player-0.1.0.min.js';
	const SDK_GLOBAL: GlobalSDKPlayerJSKey = 'playerjs';

	let iframeContainer: HTMLIFrameElement;
	let player: PlayerJSPlayer;

	let duration: number | null = null;
	let currentTime: number | null = null;
	let secondsLoaded: number | null = null;

	onMount(function () {
		onPlayerMount?.();
	});

	export function load() {
		getSDK(SDK_URL, SDK_GLOBAL).then(
			function (playerjs) {
				if (!iframeContainer) {
					return;
				}

				player = new playerjs.Player(iframeContainer);
				player.setLoop?.(loop);

				player.on('ready', function () {
					onReady?.();
				});
				player.on('play', function () {
					onPlay?.();
				});
				player.on('pause', function () {
					onPause?.();
				});
				player.on('seeked', function () {
					onSeek?.(0);
				});
				player.on('ended', function () {
					onEnded?.();
				});
				player.on('error', function (error) {
					onError?.({
						error
					});
				});
				player.on('timeupdate', function (data) {
					duration = data.duration;
					currentTime = data.seconds;
				});
				player.on('buffered', function ({ percent }) {
					if (duration) {
						secondsLoaded = duration * percent;
					}
				});
				if (muted) {
					player.mute();
				}
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
		player.setCurrentTime(seconds);
		if (!keepPlaying) {
			pause();
		}
	}

	export function setVolume(fraction: number) {
		player.setVolume(fraction * 100);
	}

	export function setLoop(loop: boolean) {
		player.setLoop?.(loop);
	}

	export function mute() {
		player.mute();
	}

	export function unmute() {
		player.unmute();
	}

	export function getDuration() {
		return duration;
	}

	export function getCurrentTime() {
		return currentTime;
	}

	export function getSecondsLoaded() {
		return secondsLoaded;
	}

	export function getPlayer() {
		return player;
	}

	export function _setPlayer(newPlayer: PlayerJSPlayer) {
		player = newPlayer;
	}

	export function _setDuration(newDuration: number) {
		duration = newDuration;
	}

	export function _setCurrentTime(newCurrentTime: number) {
		currentTime = newCurrentTime;
	}

	export function _setSecondsLoaded(newSecondsLoaded: number) {
		secondsLoaded = newSecondsLoaded;
	}

	let id = $derived(url.match(MATCH_URL_STREAMABLE)?.[1]);
</script>

<iframe
	bind:this={iframeContainer}
	src={`https://streamable.com/o/${id}`}
	frameBorder="0"
	scrolling="no"
	class="streamable-player"
	allow="encrypted-media; autoplay; fullscreen;"
	title="Streamable Player"
/>

<style>
	.streamable-player {
		width: 100%;
		height: 100%;
	}
</style>
