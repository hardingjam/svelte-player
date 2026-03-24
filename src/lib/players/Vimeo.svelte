<script lang="ts">
	import type { GlobalSDKVimeoKey } from './global.types';
	import type { VimeoPlayer } from './vimeo.global.types';
	import type { PlayerCallbackProps } from './types';
	import type { ViemoConfig } from './vimeo.types';

	import { onMount } from 'svelte';
	import { getSDK } from './utils';

	interface Props extends PlayerCallbackProps {
		playing: boolean;
		loop: boolean;
		controls: boolean;
		muted: boolean;
		playsinline: boolean;
		config: ViemoConfig;
		display?: string;
	}

	let {
		playing,
		loop,
		controls,
		muted,
		playsinline,
		config,
		display = undefined,
		onPlayerMount,
		onReady,
		onPlay,
		onPause,
		onBuffer,
		onBufferEnd,
		onSeek,
		onEnded,
		onError,
		onLoaded,
		onPlaybackRateChange
	}: Props = $props();

	const SDK_URL = 'https://player.vimeo.com/api/player.js';
	const SDK_GLOBAL: GlobalSDKVimeoKey = 'Vimeo';

	function cleanUrl(url: string) {
		return url.replace('/manage/videos', '');
	}

	let container: HTMLDivElement;
	let player: VimeoPlayer;

	let duration: number | null = null;
	let currentTime: number | null = null;
	let secondsLoaded: number | null = null;
	let playervolume = 0;

	onMount(function () {
		onPlayerMount?.();
	});

	export function load(url: string) {
		duration = null;
		getSDK(SDK_URL, SDK_GLOBAL).then(
			function (Vimeo) {
				if (!container) {
					return;
				}
				const { playerOptions, title } = config;
				player = new Vimeo.Player(container, {
					url: cleanUrl(url),
					autoplay: playing,
					muted: muted,
					loop: loop,
					playsinline: playsinline,
					controls: controls,
					...playerOptions
				});
				player
					.ready()
					.then(function () {
						const iframe = container.querySelector('iframe');
						if (iframe !== null) {
							iframe.style.width = '100%';
							iframe.style.height = '100%';
							if (title) {
								iframe.title = title;
							}
						}
					})
					.catch(function (error) {
						onError?.({ error });
					});
				player.on('loaded', function () {
					onReady?.();
					refreshDuration();
				});
				player.on('play', function () {
					onPlay?.();
					refreshDuration();
				});
				player.on('pause', function () {
					onPause?.();
				});
				player.on('seeked', function (e) {
					onSeek?.(e.seconds);
				});
				player.on('ended', function () {
					onEnded?.();
				});
				player.on('error', function (error) {
					onError?.({ error });
				});
				player.on('timeupdate', function ({ seconds }) {
					currentTime = seconds;
				});
				player.on('progress', function ({ seconds }) {
					secondsLoaded = seconds;
				});
				player.on('bufferstart', function () {
					onBuffer?.();
				});
				player.on('bufferend', function () {
					onBufferEnd?.();
				});
				player.on('playbackratechange', function (e) {
					onPlaybackRateChange?.(e.playbackRate);
				});
				player.on('volumechange', function (e) {
					playervolume = e.volume;
				});
			},
			function (error) {
				onError?.({ error });
			}
		);
	}

	function refreshDuration() {
		player.getDuration().then(function (durationParam) {
			duration = durationParam;
		});
	}

	export function play() {
		const promise = player.play();
		if (promise) {
			promise.catch(function (error) {
				onError?.({ error });
			});
		}
	}

	export function pause() {
		player.pause();
	}

	export function stop() {
		player.unload();
	}

	export function seekTo(seconds: number, keepPlaying = true) {
		player.setCurrentTime(seconds);
		if (!keepPlaying) {
			pause();
		}
	}

	export function setVolume(fraction: number) {
		player.setVolume(fraction);
	}

	export function setLoop(loop: boolean) {
		player.setLoop(loop);
	}

	export function setPlaybackRate(rate: number) {
		player.setPlaybackRate(rate);
	}

	export function mute() {
		setVolume(0);
	}

	export function unmute() {
		setVolume(playervolume);
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

	export function _setPlayer(newPlayer: VimeoPlayer) {
		player = newPlayer;
	}
</script>

<div bind:this={container} class="vimeo-player" style:display />

<style>
	.vimeo-player {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
</style>
