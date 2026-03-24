<script lang="ts">
	import type { GlobalSDKSoundCloudKey } from './global.types';
	import type { SoundCloudPlayer } from './soundcloud.global.types';
	import type { PlayerCallbackProps } from './types';
	import type { SoundCloudConfig } from './soundcloud.types';

	import { onMount } from 'svelte';
	import { getSDK } from './utils';

	interface Props extends PlayerCallbackProps {
		url: string;
		volume: number | null;
		config: SoundCloudConfig;
		display?: string;
	}

	let {
		url,
		volume,
		config,
		display = undefined,
		onPlayerMount,
		onReady,
		onPlay,
		onPause,
		onEnded,
		onError
	}: Props = $props();

	const SDK_URL = 'https://w.soundcloud.com/player/api.js';
	const SDK_GLOBAL: GlobalSDKSoundCloudKey = 'SC';

	let iframeContainer: HTMLIFrameElement;
	let player: SoundCloudPlayer;

	let duration = 0;
	let currentTime = 0;
	let fractionLoaded = 0;

	onMount(function () {
		onPlayerMount?.();
	});

	export function load(url: string, isReady?: boolean) {
		getSDK(SDK_URL, SDK_GLOBAL).then(function (SC) {
			if (!iframeContainer) {
				return;
			}
			const { PLAY, PLAY_PROGRESS, PAUSE, FINISH, ERROR } = SC.Widget.Events;
			if (!isReady) {
				player = SC.Widget(iframeContainer);
				player.bind(PLAY, function () {
					onPlay?.();
				});
				player.bind(PAUSE, function () {
					const remaining = duration - currentTime;
					if (remaining < 0.05) {
						return;
					}
					onPause?.();
				});
				player.bind(PLAY_PROGRESS, function (e) {
					currentTime = e.currentPosition / 1000;
					fractionLoaded = e.loadedProgress;
				});
				player.bind(FINISH, function () {
					onEnded?.();
				});
				player.bind(ERROR, function (e) {
					onError?.({ error: e });
				});
			}

			player.load(url, {
				...config.options,
				callback() {
					player.getDuration(function (durationParam) {
						duration = durationParam / 1000;
						onReady?.();
					});
				}
			});
		});
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
		player.seekTo(seconds * 1000);
		if (!keepPlaying) {
			pause();
		}
	}

	export function setVolume(fraction: number) {
		player.setVolume(fraction * 100);
	}

	export function mute() {
		setVolume(0);
	}

	export function unmute() {
		if (volume !== null) {
			setVolume(volume);
		}
	}

	export function getDuration() {
		return duration;
	}

	export function getCurrentTime() {
		return currentTime;
	}

	export function getSecondsLoaded() {
		return fractionLoaded * duration;
	}

	export function getPlayer() {
		return player;
	}

	export function _setPlayer(newPlayer: SoundCloudPlayer) {
		player = newPlayer;
	}

	export function _setDuration(newDuration: number) {
		duration = newDuration;
	}

	export function _setCurrentTime(newCurrentTime: number) {
		currentTime = newCurrentTime;
	}

	export function _setFractionLoaded(newFractionLoaded: number) {
		fractionLoaded = newFractionLoaded;
	}
</script>

<iframe
	bind:this={iframeContainer}
	title="SoundCloud Player"
	class="soundcloud-player"
	src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`}
	frameborder={0}
	allow="autoplay"
	style:display
/>

<style>
	.soundcloud-player {
		width: 100%;
		height: 100%;
	}
</style>
