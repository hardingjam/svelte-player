<script lang="ts">
	import type { GlobalSDKFacebookKey } from './global.types';
	import type { FacebookPlayer, FacebookSDKReady } from './facebook.global.types';
	import type { PlayerCallbackProps } from './types';
	import type { FacebookConfig } from './facebook.types';

	import { onMount } from 'svelte';
	import { getSDK, randomString } from './utils';

	interface Props extends PlayerCallbackProps {
		url: string;
		playing: boolean;
		controls: boolean;
		muted: boolean;
		config: FacebookConfig;
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
		onBuffer,
		onBufferEnd,
		onEnded,
		onError,
		onLoaded
	}: Props = $props();

	const SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';
	const SDK_GLOBAL: GlobalSDKFacebookKey = 'FB';
	const SDK_GLOBAL_READY: FacebookSDKReady = 'fbAsyncInit';
	const PLAYER_ID_PREFIX = 'facebook-player-';

	let player: FacebookPlayer;

	let playerID = $derived(config.playerId || `${PLAYER_ID_PREFIX}${randomString()}`);

	onMount(function () {
		onPlayerMount?.();
	});

	export function load(_: string, isReady?: boolean) {
		if (isReady) {
			getSDK(SDK_URL, SDK_GLOBAL, SDK_GLOBAL_READY).then(function (FB) {
				return FB.XFBML.parse();
			});
			return;
		}
		getSDK(SDK_URL, SDK_GLOBAL, SDK_GLOBAL_READY).then(function (FB) {
			FB.init({
				appId: config.appId,
				xfbml: true,
				version: config.version
			});
			FB.Event.subscribe('xfbml.render', function (_) {
				onLoaded?.();
			});
			FB.Event.subscribe('xfbml.ready', function (msg) {
				if (msg.type === 'video' && msg.id === playerID) {
					player = msg.instance;
					player.subscribe('startedPlaying', function () {
						onPlay?.();
					});
					player.subscribe('paused', function () {
						onPause?.();
					});
					player.subscribe('finishedPlaying', function () {
						onEnded?.();
					});
					player.subscribe('startedBuffering', function () {
						onBuffer?.();
					});
					player.subscribe('finishedBuffering', function () {
						onBufferEnd?.();
					});
					player.subscribe('error', function (error) {
						onError?.({ error });
					});
					if (muted) {
						player.mute();
					} else {
						player.unmute();
					}
					onReady?.();

					const playerContainer = document.getElementById(playerID);
					if (playerContainer !== null) {
						const playerIframe = playerContainer.querySelector('iframe');
						if (playerIframe !== null) {
							playerIframe.style.visibility = 'visible';
						}
					}
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
		player.seek(seconds);
		if (keepPlaying) {
			pause();
		}
	}

	export function setVolume(fraction: number) {
		player.setVolume(fraction);
	}

	export function mute() {
		player.mute();
	}

	export function unmute() {
		player.unmute();
	}

	export function getDuration() {
		return player.getDuration();
	}

	export function getCurrentTime() {
		return player.getCurrentPosition();
	}

	export function getSecondsLoaded() {
		return null;
	}

	export function getPlayer() {
		return player;
	}

	export function _setPlayer(newPlayer: FacebookPlayer) {
		player = newPlayer;
	}
</script>

<div
	id={playerID}
	class="facebook-player fb-video"
	data-href={url}
	data-autoplay={playing ? 'true' : 'false'}
	data-allowfullscreen="true"
	data-controls={controls ? 'true' : 'false'}
	{...config.attributes}
/>

<style>
	.facebook-player {
		width: 100%;
		height: 100%;
	}
</style>
