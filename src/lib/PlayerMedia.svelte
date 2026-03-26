<script lang="ts">
	import type { SeekToType } from './types';
	import type {
		OnProgressProps,
		OnErrorProps,
		PlayerUrl,
		Player,
		PlayerRef,
		PlayerCallbackProps,
		PlayerConfigProps,
		PlayerGetPlayerKey,
		PlayerInternalPlayer
	} from './players/types';
	import { onMount, untrack } from 'svelte';
	import { isMediaStream } from './players/utils';

	interface Props extends PlayerCallbackProps {
		url: PlayerUrl;
		playing: boolean;
		loop: boolean;
		controls: boolean;
		volume: number | null;
		muted: boolean;
		playbackRate: number;
		width: string;
		height: string;
		progressInterval: number;
		playsinline: boolean;
		pip: boolean;
		stopOnUnmount: boolean;
		config: PlayerConfigProps;
		progressFrequency?: number;
		disableDeferredLoading?: boolean;
		loopOnEnded?: boolean;
		forceLoad?: boolean;
		display?: string;
		activePlayer?: Player['loadComponent'];
	}

	let {
		url,
		playing,
		loop,
		controls,
		volume,
		muted,
		playbackRate,
		width,
		height,
		progressInterval,
		playsinline,
		pip,
		stopOnUnmount,
		config,
		progressFrequency = undefined,
		disableDeferredLoading = undefined,
		loopOnEnded = undefined,
		forceLoad = undefined,
		display = undefined,
		activePlayer = undefined,
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
		onLoaded
	}: Props = $props();

	const SEEK_ON_PLAY_EXPIRY = 5000;

	let mounted = false;
	let isReady = false;
	let isPlaying = false;
	let isLoading = true;
	let loadOnReady: PlayerUrl | null = null;
	let seekOnPlay: number | null = null;
	let progressTimeout: number | undefined = undefined;
	let durationCheckTimeout: number | null | undefined = undefined;
	let prevPlayed: number | undefined = undefined;
	let prevLoaded: number | undefined = undefined;
	let onDurationCalled: boolean | undefined = undefined;
	let startOnPlay: boolean | undefined = undefined;
	let player: PlayerRef;

	onMount(function () {
		mounted = true;

		return function () {
			clearTimeout(progressTimeout);
			clearTimeout(durationCheckTimeout ?? undefined);
			if (isReady && stopOnUnmount) {
				player.stop();

				if (player.disablePIP) {
					player.disablePIP();
				}
			}

			mounted = false;
		};
	});

	function handlePropsUrlChange(propsUrl: typeof url) {
		if (!player) {
			return;
		}

		if (isLoading && !forceLoad && !disableDeferredLoading && !isMediaStream(propsUrl)) {
			console.warn(
				`SveltePlayer: the attempt to load ${propsUrl} is being deferred until the player has loaded`
			);
			loadOnReady = propsUrl;
			return;
		}
		isLoading = true;
		startOnPlay = true;
		onDurationCalled = false;
		player.load(propsUrl, isReady);
	}

	$effect(() => {
		url;
		untrack(() => handlePropsUrlChange(url));
	});

	function handlePropsPlayingChange(propsPlaying: typeof playing) {
		if (!player) {
			return;
		}

		if (propsPlaying && !isPlaying) {
			player.play();
		}
		if (!propsPlaying && isPlaying) {
			player.pause();
		}
	}

	$effect(() => {
		playing;
		untrack(() => handlePropsPlayingChange(playing));
	});

	function handlePropsPipChange(propsPip: typeof pip) {
		if (!player) {
			return;
		}

		if (propsPip && player.enablePIP) {
			player.enablePIP();
		}

		if (!propsPip && player.disablePIP) {
			player.disablePIP();
		}
	}

	$effect(() => {
		pip;
		untrack(() => handlePropsPipChange(pip));
	});

	function handlePropsVolumeChange(propsVolume: typeof volume) {
		if (!player) {
			return;
		}

		if (propsVolume !== null) {
			player.setVolume(propsVolume);
		}
	}

	$effect(() => {
		volume;
		untrack(() => handlePropsVolumeChange(volume));
	});

	function handlePropsMutedChange(propsMuted: typeof muted) {
		if (!player) {
			return;
		}

		if (propsMuted) {
			player.mute();
		} else {
			player.unmute();
			if (volume !== null) {
				setTimeout(function () {
					player.setVolume(Number(volume));
				});
			}
		}
	}

	$effect(() => {
		muted;
		untrack(() => handlePropsMutedChange(muted));
	});

	function handlePropsPlaybackRateChange(propsPlaybackRate: typeof playbackRate) {
		if (!player) {
			return;
		}

		if (player.setPlaybackRate) {
			player.setPlaybackRate(propsPlaybackRate);
		}
	}

	$effect(() => {
		playbackRate;
		untrack(() => handlePropsPlaybackRateChange(playbackRate));
	});

	function handlePropsLoopChange(propsLoop: typeof loop) {
		if (!player) {
			return;
		}

		if (player.setLoop) {
			player.setLoop(propsLoop);
		}
	}

	$effect(() => {
		loop;
		untrack(() => handlePropsLoopChange(loop));
	});

	export function handlePlayerMount() {
		Promise.resolve().then(() => {
			if (!player) return;
			player.load(url);
			progress();
		});
	}

	export function getDuration() {
		if (!isReady) {
			return null;
		}
		return player.getDuration();
	}

	export function getCurrentTime() {
		if (!isReady) {
			return null;
		}
		return player.getCurrentTime();
	}

	export function getSecondsLoaded() {
		if (!isReady) {
			return null;
		}
		return player.getSecondsLoaded();
	}

	export function getInternalPlayer<TKey extends PlayerGetPlayerKey>(
		key?: TKey
	): PlayerInternalPlayer[TKey] | null {
		if (!player) {
			return null;
		}
		return player.getPlayer(key);
	}

	export function progress() {
		if (url && player && isReady) {
			const playedSeconds = getCurrentTime() || 0;
			const loadedSeconds = getSecondsLoaded();
			const duration = getDuration();
			if (duration) {
				const progressData: OnProgressProps = {
					playedSeconds,
					played: playedSeconds / duration
				};
				if (loadedSeconds !== null) {
					progressData.loadedSeconds = loadedSeconds;
					progressData.loaded = loadedSeconds / duration;
				}
				if (
					progressData.playedSeconds !== prevPlayed ||
					progressData.loadedSeconds !== prevLoaded
				) {
					onProgress?.(progressData);
				}
				prevPlayed = progressData.playedSeconds;
				prevLoaded = progressData.loadedSeconds;
			}
		}
		progressTimeout = window.setTimeout(progress, progressFrequency || progressInterval);
	}

	export function seekTo(amount: number, type?: SeekToType, keepPlaying?: boolean) {
		if (!isReady) {
			if (amount !== 0) {
				seekOnPlay = amount;
				setTimeout(function () {
					seekOnPlay = null;
				}, SEEK_ON_PLAY_EXPIRY);
			}
			return;
		}
		const isFraction = !type ? amount > 0 && amount < 1 : type === 'fraction';
		if (isFraction) {
			const duration = player.getDuration();
			if (!duration) {
				console.warn('SveltePlayer: could not seek using fraction - duration not yet available');
				return;
			}
			player.seekTo(duration * amount, keepPlaying);
			return;
		}
		player.seekTo(amount, keepPlaying);
	}

	export function handleReady() {
		if (!mounted) {
			return;
		}

		isReady = true;
		isLoading = false;
		onReady?.();

		if (!muted && volume !== null) {
			player.setVolume(volume);
		}
		if (loadOnReady) {
			player.load(loadOnReady, true);
			loadOnReady = null;
		} else if (playing) {
			player.play();
		}
		handleDurationCheck();
	}

	export function handlePlay() {
		isPlaying = true;
		isLoading = false;
		if (startOnPlay) {
			if (player.setPlaybackRate && playbackRate !== 1) {
				player.setPlaybackRate(playbackRate);
			}
			onStart?.();
			startOnPlay = false;
		}
		onPlay?.();
		if (seekOnPlay) {
			seekTo(seekOnPlay);
			seekOnPlay = null;
		}
		handleDurationCheck();
	}

	export function handlePause() {
		isPlaying = false;
		if (!isLoading) {
			onPause?.();
		}
	}

	export function handleEnded() {
		if (loopOnEnded && loop) {
			seekTo(0);
		}
		if (!loop) {
			isPlaying = false;
			onEnded?.();
		}
	}

	function handleError(error: OnErrorProps) {
		isLoading = false;
		onError?.(error);
	}

	export function handleDurationCheck() {
		clearTimeout(durationCheckTimeout ?? undefined);
		const duration = getDuration();
		if (duration) {
			if (!onDurationCalled) {
				onDuration?.(duration);
				onDurationCalled = true;
			}
		} else {
			durationCheckTimeout = window.setTimeout(handleDurationCheck, 100);
		}
	}

	function handleLoaded() {
		isLoading = false;
	}

	export function _setIsReady(ready: boolean) {
		isReady = ready;
	}

	export function _setIsLoading(loading: boolean) {
		isLoading = loading;
	}

	export function _getIsLoading() {
		return isLoading;
	}

	export function _setStartOnPlay(onPlay: boolean) {
		startOnPlay = onPlay;
	}

	export function _getStartOnPlay() {
		return startOnPlay;
	}

	export function _setOnDurationCalled(durationCalled: boolean) {
		onDurationCalled = durationCalled;
	}

	export function _getOnDurationCalled() {
		return onDurationCalled;
	}

	export function _getIsPlaying() {
		return isPlaying;
	}

	export function _setIsPlaying(playing: boolean) {
		isPlaying = playing;
	}

	export function _setLoadOnReady(onReady: PlayerUrl) {
		loadOnReady = onReady;
	}

	export function _getLoadOnReady() {
		return loadOnReady;
	}

	export function _setSeekOnPlay(onPlay: number) {
		seekOnPlay = onPlay;
	}

	export function _setDurationCheckTimeout(checkTimeout: number | null) {
		durationCheckTimeout = checkTimeout;
	}

	export function _getDurationCheckTimeout() {
		return durationCheckTimeout;
	}

	export function _getSeekOnPlay() {
		return seekOnPlay;
	}

	export function _setPlayer(newPlayer: PlayerRef) {
		player = newPlayer;
	}
</script>

{#if activePlayer !== undefined}
	{#await activePlayer() then { default: ActivePlayer }}
		<ActivePlayer
			{playing}
			{controls}
			{playsinline}
			{loop}
			{config}
			{url}
			{width}
			{height}
			{muted}
			{volume}
			{display}
			bind:this={player}
			onPlayerMount={handlePlayerMount}
			onReady={handleReady}
			onPlay={handlePlay}
			onPause={handlePause}
			onEnded={handleEnded}
			onLoaded={handleLoaded}
			onError={handleError}
			{onBufferEnd}
			{onBuffer}
			{onPlaybackRateChange}
			{onSeek}
			{onPlaybackQualityChange}
		/>
	{/await}
{/if}
