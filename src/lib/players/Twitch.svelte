<script lang="ts">
	import type { GlobalSDKTwitchKey } from './global.types';
	import type { TwitchPlayer } from './twitch.global.types';
	import type { PlayerCallbackProps } from './types';
	import type { TwitchConfig } from './twitch.types';

	import { onMount } from 'svelte';
	import { getSDK, parseStartTime, randomString } from './utils';
	import { MATCH_URL_TWITCH_CHANNEL, MATCH_URL_TWITCH_VIDEO } from './patterns';

	interface Props extends PlayerCallbackProps {
		playing: boolean;
		controls: boolean;
		muted: boolean;
		playsinline: boolean;
		config: TwitchConfig;
	}

	let {
		playing,
		controls,
		muted,
		playsinline,
		config,
		onPlayerMount,
		onReady,
		onPlay,
		onPause,
		onSeek,
		onEnded,
		onError,
		onLoaded
	}: Props = $props();

	const SDK_URL = 'https://player.twitch.tv/js/embed/v1.js';
	const SDK_GLOBAL: GlobalSDKTwitchKey = 'Twitch';
	const PLAYER_ID_PREFIX = 'twitch-player-';

	let player: TwitchPlayer;

	let playerID = $derived(config.playerId || `${PLAYER_ID_PREFIX}${randomString()}`);

	onMount(function () {
		onPlayerMount?.();
	});

	export function load(url: string, isReady?: boolean) {
		const isChannel = MATCH_URL_TWITCH_CHANNEL.test(url);
		const id = String(
			isChannel ? url.match(MATCH_URL_TWITCH_CHANNEL)?.[1] : url.match(MATCH_URL_TWITCH_VIDEO)?.[1]
		);

		if (isReady) {
			if (isChannel) {
				player.setChannel(id);
			} else {
				player.setVideo('v' + id, 0);
			}
			return;
		}
		getSDK(SDK_URL, SDK_GLOBAL).then(
			function (Twitch) {
				player = new Twitch.Player(playerID, {
					...(isChannel
						? {
								collection: undefined,
								channel: id,
								video: undefined
							}
						: {
								collection: undefined,
								channel: undefined,
								video: id
							}),
					height: '100%',
					width: '100%',
					playsinline: playsinline,
					autoplay: playing,
					muted: muted,
					controls: isChannel ? true : controls,
					time: String(parseStartTime(url)),
					...config.options
				});

				const { READY, PLAYING, PAUSE, ENDED, ONLINE, OFFLINE, SEEK } = Twitch.Player;
				player.addEventListener(READY, function () {
					onReady?.();
				});
				player.addEventListener(PLAYING, function () {
					onPlay?.();
				});
				player.addEventListener(PAUSE, function () {
					onPause?.();
				});
				player.addEventListener(ENDED, function () {
					onEnded?.();
				});
				player.addEventListener(SEEK, function ({ position }) {
					onSeek?.(position);
				});

				player.addEventListener(ONLINE, function () {
					onLoaded?.();
				});
				player.addEventListener(OFFLINE, function () {
					onLoaded?.();
				});
			},
			function (err) {
				onError?.({
					error: err
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
		player.pause();
	}

	export function seekTo(seconds: number, keepPlaying = true) {
		player.seek(seconds);
		if (!keepPlaying) {
			pause();
		}
	}

	export function setVolume(fraction: number) {
		player.setVolume(fraction);
	}

	export function mute() {
		player.setMuted(true);
	}

	export function unmute() {
		player.setMuted(false);
	}

	export function getDuration() {
		return player.getDuration();
	}

	export function getCurrentTime() {
		return player.getCurrentTime();
	}

	export function getSecondsLoaded() {
		return null;
	}

	export function getPlayer() {
		return player;
	}

	export function _setPlayer(newPlayer: TwitchPlayer) {
		player = newPlayer;
	}
</script>

<div class="twitch-player" id={playerID} />

<style>
	.twitch-player {
		width: 100%;
		height: 100%;
	}
</style>
