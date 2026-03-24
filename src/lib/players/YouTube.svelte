<script lang="ts">
	import type { GlobalSDKYTKey } from './global.types';
	import type { YTPlayer, YTPlayerOnStateChangeEvent, YTSDKReady } from './youtube.global.types';
	import type { PlayerCallbackProps } from './types';
	import type { ParsePlaylistFn, YouTubeConfig, YouTubeUrl } from './youtube.types';

	import { onMount } from 'svelte';
	import { MATCH_URL_YOUTUBE } from './patterns';
	import { getSDK, parseEndTime, parseStartTime } from './utils';

	interface Props extends PlayerCallbackProps {
		playing: boolean;
		loop: boolean;
		controls: boolean;
		playsinline: boolean;
		config: YouTubeConfig;
		display?: string;
	}

	let {
		playing,
		loop,
		controls,
		playsinline,
		config,
		display = undefined,
		onPlayerMount,
		onReady,
		onPlay,
		onPause,
		onBuffer,
		onBufferEnd,
		onEnded,
		onError,
		onPlaybackRateChange,
		onPlaybackQualityChange
	}: Props = $props();

	const SDK_URL = 'https://www.youtube.com/iframe_api';
	const SDK_GLOBAL: GlobalSDKYTKey = 'YT';
	const SDK_GLOBAL_READY: YTSDKReady = 'onYouTubeIframeAPIReady';
	const MATCH_PLAYLIST = /[?&](?:list|channel)=([a-zA-Z0-9_-]+)/;
	const MATCH_USER_UPLOADS = /user\/([a-zA-Z0-9_-]+)\/?/;

	let container: HTMLDivElement;
	let player: YTPlayer;

	onMount(function () {
		onPlayerMount?.();
	});

	function getID(url: YouTubeUrl) {
		if (!url || url instanceof Array || MATCH_PLAYLIST.test(url)) {
			return null;
		}
		return url.match(MATCH_URL_YOUTUBE)?.[1] ?? null;
	}

	export function load(url: YouTubeUrl, isReady?: boolean) {
		const { playerVars, embedOptions } = config;
		const id = String(getID(url));
		if (isReady) {
			if (url instanceof Array || MATCH_PLAYLIST.test(url) || MATCH_USER_UPLOADS.test(url)) {
				const { list = '', listType } = parsePlaylist(url);
				player.loadPlaylist({ list, listType });
				return;
			}
			player.cueVideoById({
				videoId: id,
				startSeconds: parseStartTime(url) || playerVars.start,
				endSeconds: parseEndTime(url) || playerVars.end
			});
			return;
		}
		getSDK(SDK_URL, SDK_GLOBAL, SDK_GLOBAL_READY, function (YT) {
			return YT.loaded === 1;
		}).then(
			function (YT) {
				if (!container) {
					return;
				}
				player = new YT.Player(container, {
					width: '100%',
					height: '100%',
					videoId: id,
					playerVars: {
						autoplay: playing ? 1 : 0,
						controls: controls ? 1 : 0,
						start: parseStartTime(url),
						end: parseEndTime(url),
						origin: window.location.origin,
						playsinline: playsinline ? 1 : 0,
						...parsePlaylist(url),
						...playerVars
					},
					events: {
						onReady() {
							if (loop) {
								player.setLoop(true);
							}
							onReady?.();
						},
						onPlaybackRateChange(event) {
							onPlaybackRateChange?.(event.data);
						},
						onPlaybackQualityChange(event) {
							onPlaybackQualityChange?.(event);
						},
						onStateChange,
						onError(event) {
							onError?.({
								error: event.data
							});
						}
					},
					...embedOptions
				});
			},
			function (err) {
				onError?.({
					error: err
				});
			}
		);
		if (embedOptions?.events) {
			console.warn(
				"Using `embedOptions.events` will likely break things. Use SveltePlayer's callback props instead, eg onReady, onPlay, onPause"
			);
		}
	}

	function parsePlaylist(url: YouTubeUrl): ReturnType<ParsePlaylistFn> {
		if (url instanceof Array) {
			return {
				listType: 'playlist',
				playlist: url.map(getID).join(',')
			};
		}
		if (MATCH_PLAYLIST.test(url)) {
			const playlistId = String(url.match(MATCH_PLAYLIST)?.[1]);
			return {
				listType: 'playlist',
				list: playlistId.replace(/^UC/, 'UU')
			};
		}
		if (MATCH_USER_UPLOADS.test(url)) {
			const username = String(url.match(MATCH_USER_UPLOADS)?.[1]);
			return {
				listType: 'user_uploads',
				list: username
			};
		}
		return {};
	}

	export function onStateChange(event: YTPlayerOnStateChangeEvent) {
		const { data } = event;
		const { playerVars, onUnstarted } = config;
		const { UNSTARTED, PLAYING, PAUSED, BUFFERING, ENDED, CUED } = window[SDK_GLOBAL].PlayerState;
		if (data === UNSTARTED) {
			onUnstarted();
		}
		if (data === PLAYING) {
			onPlay?.();
			onBufferEnd?.();
		}
		if (data === PAUSED) {
			onPause?.();
		}
		if (data === BUFFERING) {
			onBuffer?.();
		}
		if (data === ENDED) {
			const isPlaylist = !!player.getPlaylist();
			if (loop && !isPlaylist) {
				if (playerVars.start) {
					seekTo(playerVars.start);
				} else {
					play();
				}
			}
			onEnded?.();
		}
		if (data === CUED) {
			onReady?.();
		}
	}

	export function play() {
		player.playVideo();
	}

	export function pause() {
		player.pauseVideo();
	}

	export function stop() {
		if (!document.body.contains(player.getIframe())) {
			return;
		}
		player.stopVideo();
	}

	export function seekTo(amount: number, keepPlaying = false) {
		player.seekTo(amount);
		if (!keepPlaying && !playing) {
			pause();
		}
	}

	export function setVolume(fraction: number) {
		player.setVolume(fraction * 100);
	}

	export function mute() {
		player.mute();
	}

	export function unmute() {
		player.unMute();
	}

	export function setPlaybackRate(rate: number) {
		player.setPlaybackRate(rate);
	}

	export function setLoop(loop: boolean) {
		player.setLoop(loop);
	}

	export function getDuration() {
		return player.getDuration();
	}

	export function getCurrentTime() {
		return player.getCurrentTime();
	}
	export function getSecondsLoaded() {
		return player.getVideoLoadedFraction() * getDuration();
	}

	export function getPlayer() {
		return player;
	}

	export function _setPlayer(newPlayer: YTPlayer) {
		player = newPlayer;
	}
</script>

<div class="youtube-player" style:display>
	<div bind:this={container} />
</div>

<style>
	.youtube-player {
		width: 100%;
		height: 100%;
	}
</style>
