<script lang="ts">
	import type { GlobalSDKWistiaKey } from './global.types';
	import type { WistiaPlayer } from './wistia.global.types';
	import type { PlayerCallbackProps } from './types';
	import type { WistiaConfig } from './wistia.types';

	import { onMount } from 'svelte';
	import { MATCH_URL_WISTIA } from './patterns';
	import { randomString, getSDK } from './utils';

	interface Props extends PlayerCallbackProps {
		url: string;
		playing: boolean;
		controls: boolean;
		muted: boolean;
		config: WistiaConfig;
	}

	let {
		url,
		playing,
		controls,
		muted,
		config,
		onPlayerMount,
		onReady,
		onPlay,
		onPause,
		onSeek,
		onEnded,
		onError,
		onPlaybackRateChange
	}: Props = $props();

	const SDK_URL = 'https://fast.wistia.com/assets/external/E-v1.js';
	const SDK_GLOBAL: GlobalSDKWistiaKey = 'Wistia';
	const PLAYER_ID_PREFIX = 'wistia-player-';

	let player: WistiaPlayer;

	let playerID = $derived(config.playerId || `${PLAYER_ID_PREFIX}${randomString()}`);
	let videoID = $derived(url && url.match(MATCH_URL_WISTIA)?.[1]);
	let className = $derived(`wistia_embed wistia_async_${videoID} wistia-player`);

	onMount(function () {
		onPlayerMount?.();
	});

	export function load() {
		getSDK(SDK_URL, SDK_GLOBAL).then(
			function (Wistia) {
				if (config.customControls) {
					config.customControls.forEach(function (control) {
						Wistia.defineControl(control);
					});
				}
				window._wq = window._wq || [];
				window._wq.push({
					id: playerID,
					options: {
						autoPlay: playing,
						silentAutoPlay: 'allow',
						muted: muted,
						controlsVisibleOnLoad: controls,
						fullscreenButton: controls,
						playbar: controls,
						playbackRateControl: controls,
						qualityControl: controls,
						volumeControl: controls,
						settingsControl: controls,
						smallPlayButton: controls,
						...config.options
					},
					onReady(video) {
						player = video;
						unbind();
						player.bind('play', handlePlay);
						player.bind('pause', handlePause);
						player.bind('seek', handleSeek);
						player.bind('end', handleEnded);
						player.bind('playbackratechange', handlePlaybackRateChange);
						onReady?.();
					}
				});
			},
			function (error) {
				onError?.({ error });
			}
		);
	}

	function unbind() {
		player.unbind('play', handlePlay);
		player.unbind('pause', handlePause);
		player.unbind('seek', handleSeek);
		player.unbind('end', handleEnded);
		player.unbind('playbackratechange', handlePlaybackRateChange);
	}

	function handlePlay() {
		onPlay?.();
	}
	function handlePause() {
		onPause?.();
	}
	function handleSeek(currentTime: number, _: number) {
		onSeek?.(currentTime);
	}
	function handleEnded() {
		onEnded?.();
	}
	function handlePlaybackRateChange(rate: number) {
		onPlaybackRateChange?.(rate);
	}

	export function play() {
		player.play();
	}

	export function pause() {
		player.pause();
	}

	export function stop() {
		unbind();
		player.remove();
	}

	export function seekTo(seconds: number, keepPlaying = true) {
		player.time(seconds);
		if (!keepPlaying) {
			pause();
		}
	}

	export function setVolume(fraction: number) {
		player.volume(fraction);
	}

	export function mute() {
		player.mute();
	}

	export function unmute() {
		player.unmute();
	}

	export function setPlaybackRate(rate: number) {
		player.playbackRate(rate);
	}

	export function getDuration() {
		return player.duration();
	}

	export function getCurrentTime() {
		return player.time();
	}

	export function getSecondsLoaded() {
		return null;
	}

	export function getPlayer() {
		return player;
	}

	export function _setPlayer(newPlayer: WistiaPlayer) {
		player = newPlayer;
	}
</script>

<div id={playerID} class={className} />

<style>
	.wistia-player {
		width: 100%;
		height: 100%;
	}
</style>
