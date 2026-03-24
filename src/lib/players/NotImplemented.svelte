<script lang="ts">
	/* eslint-disable @typescript-eslint/no-unused-vars -- this is fine for documentation */
	import type { NotImplementedPlayer } from './notimplemented.global.types';
	import type { PlayerUrl, PlayerCallbackProps } from './types';
	import type { NotImplementedConfig } from './notimplemented.types';

	import { onMount } from 'svelte';

	interface Props extends PlayerCallbackProps {
		url?: PlayerUrl;
		playing?: boolean;
		loop?: boolean;
		controls?: boolean;
		volume?: number | null;
		muted?: boolean;
		width?: string;
		height?: string;
		playsinline?: boolean;
		config?: NotImplementedConfig;
	}

	let { onPlayerMount }: Props = $props();

	let player: NotImplementedPlayer;

	onMount(function () {
		onPlayerMount?.();
	});

	export function load(url: PlayerUrl, isReady?: boolean): void {
		console.log('load');
	}

	export function play(): void {
		console.log('play');
	}

	export function pause(): void {
		console.log('pause');
	}

	export function stop(): void {
		console.log('stop');
	}

	export function seekTo(seconds: number, keepPlaying?: boolean): void {
		console.log('seekTo');
	}

	export function setVolume(fraction: number): void {
		console.log('setVolume');
	}

	export function mute(): void {
		console.log('mute');
	}

	export function unmute(): void {
		console.log('unmute');
	}

	export function setPlaybackRate(rate: number): void {
		console.log('setPlaybackRate');
	}

	export function setLoop(loop: boolean): void {
		console.log('setLoop');
	}

	export function getDuration(): number | null {
		return 0;
	}

	export function getCurrentTime(): number | null {
		return 0;
	}

	export function getSecondsLoaded(): number | null {
		return 0;
	}

	export function enablePIP(): void {
		console.log('enablePIP');
	}

	export function disablePIP(): void {
		console.log('disablePIP');
	}

	export function getPlayer(): NotImplementedPlayer {
		return player;
	}

	export function _setPlayer(newPlayer: NotImplementedPlayer) {
		player = newPlayer;
	}
</script>

<p>not implemented yet.</p>
