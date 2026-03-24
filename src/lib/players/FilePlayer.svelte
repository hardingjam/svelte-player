<script lang="ts">
	import type { GlobalSDKDASHKey, GlobalSDKHLSKey, GlobalSDKFLVKey } from './global.types';
	import type { PlayerCallbackProps } from './types';
	import type {
		FileConfig,
		FilePlayerElement,
		FileUrl,
		FileInternalPlayerKey,
		FileInternalPlayer,
		DashJSMediaPlayerClass,
		FlvJSPlayer,
		HLSClass,
		PlayerElementRef
	} from './file.types';

	import { onMount } from 'svelte';
	import { getSDK, isMediaStream, supportsWebKitPresentationMode } from './utils';
	import { AUDIO_EXTENSIONS, HLS_EXTENSIONS, DASH_EXTENSIONS, FLV_EXTENSIONS } from './patterns';
	import FilePlayerAudio from './FilePlayerAudio.svelte';
	import FilePlayerVideo from './FilePlayerVideo.svelte';
	import FilePlayerTrack from './FilePlayerTrack.svelte';

	interface Props extends PlayerCallbackProps {
		url: FileUrl;
		playing: boolean;
		loop: boolean;
		controls: boolean;
		muted: boolean;
		width: string;
		height: string;
		playsinline: boolean;
		config: FileConfig;
	}

	let {
		url,
		playing,
		loop,
		controls,
		muted,
		width,
		height,
		playsinline,
		config,
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
		onEnablePIP,
		onDisablePIP,
		onPlaybackRateChange
	}: Props = $props();

	const HAS_NAVIGATOR = typeof navigator !== 'undefined';
	const IS_IPAD_PRO =
		HAS_NAVIGATOR && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
	const IS_IOS =
		HAS_NAVIGATOR &&
		(/iPad|iPhone|iPod/.test(navigator.userAgent) || IS_IPAD_PRO) &&
		'MSStream' in window &&
		!window.MSStream;
	const IS_SAFARI =
		HAS_NAVIGATOR &&
		/^((?!chrome|android).)*safari/i.test(navigator.userAgent) &&
		'MSStream' in window &&
		!window.MSStream;
	const HLS_SDK_URL = 'https://cdn.jsdelivr.net/npm/hls.js@VERSION/dist/hls.min.js';
	const HLS_GLOBAL: GlobalSDKHLSKey = 'Hls';
	const DASH_SDK_URL = 'https://cdnjs.cloudflare.com/ajax/libs/dashjs/VERSION/dash.all.min.js';
	const DASH_GLOBAL: GlobalSDKDASHKey = 'dashjs';
	const FLV_SDK_URL = 'https://cdn.jsdelivr.net/npm/flv.js@VERSION/dist/flv.min.js';
	const FLV_GLOBAL: GlobalSDKFLVKey = 'flvjs';
	const MATCH_DROPBOX_URL = /www\.dropbox\.com\/.+/;
	const MATCH_CLOUDFLARE_STREAM = /https:\/\/watch\.cloudflarestream\.com\/([a-z0-9]+)/;
	const REPLACE_CLOUDFLARE_STREAM = 'https://videodelivery.net/{id}/manifest/video.m3u8';

	let hls: HLSClass | undefined = undefined;
	let dash: DashJSMediaPlayerClass | undefined = undefined;
	let flv: FlvJSPlayer | undefined = undefined;

	let playerElementRef: PlayerElementRef;
	let player: FilePlayerElement;

	export function setInternalPlayer(newPlayer: FilePlayerElement) {
		if (player === undefined) {
			player = newPlayer;
		}
	}

	onMount(function () {
		onPlayerMount?.();
		setInternalPlayer(playerElementRef.getPlayer());
		if (IS_IOS || config.forceDisableHls) {
			player.load();
		}

		return function () {
			if (hls) {
				hls.destroy();
			}
		};
	});

	let _addListeners = function (playerParams: FilePlayerElement) {
		player = playerParams;
		playerParams.addEventListener('play', onPlayHandler);
		playerParams.addEventListener('waiting', onBufferHandler);
		playerParams.addEventListener('playing', onBufferEndHandler);
		playerParams.addEventListener('pause', onPauseHandler);
		playerParams.addEventListener('seeked', onSeekHandler);
		playerParams.addEventListener('ended', onEndedHandler);
		playerParams.addEventListener('error', onErrorHandler);
		playerParams.addEventListener('ratechange', onPlayBackRateChangeHandler);
		playerParams.addEventListener('enterpictureinpicture', onEnablePIPHandler);
		playerParams.addEventListener('leavepictureinpicture', onDisablePIPHandler);
		playerParams.addEventListener('webkitpresentationmodechanged', onPresentationModeChange);
		if (!shouldUseHLS(url)) {
			playerParams.addEventListener('canplay', onReadyHandler);
		}
		if (playsinline) {
			playerParams.setAttribute('playsinline', '');
			playerParams.setAttribute('webkit-playsinline', '');
			playerParams.setAttribute('x5-playsinline', '');
		}
	};

	let _removeListeners = function (playerParams: FilePlayerElement, urlParams?: typeof url) {
		playerParams.removeEventListener('canplay', onReadyHandler);
		playerParams.removeEventListener('play', onPlayHandler);
		playerParams.removeEventListener('waiting', onBufferHandler);
		playerParams.removeEventListener('playing', onBufferEndHandler);
		playerParams.removeEventListener('pause', onPauseHandler);
		playerParams.removeEventListener('seeked', onSeekHandler);
		playerParams.removeEventListener('ended', onEndedHandler);
		playerParams.removeEventListener('error', onErrorHandler);
		playerParams.removeEventListener('ratechange', onPlayBackRateChangeHandler);
		playerParams.removeEventListener('enterpictureinpicture', onEnablePIPHandler);
		playerParams.removeEventListener('leavepictureinpicture', onDisablePIPHandler);
		playerParams.removeEventListener('webkitpresentationmodechanged', onPresentationModeChange);
		if (urlParams !== undefined && !shouldUseHLS(urlParams)) {
			playerParams.removeEventListener('canplay', onReadyHandler);
		}
	};

	function onReadyHandler() {
		onReady?.();
	}

	function onPlayHandler() {
		onPlay?.();
	}

	function onBufferHandler() {
		onBuffer?.();
	}

	function onBufferEndHandler() {
		onBufferEnd?.();
	}

	function onPauseHandler() {
		onPause?.();
	}

	function onEndedHandler() {
		onEnded?.();
	}

	function onErrorHandler(e: Event) {
		onError?.({
			error: e
		});
	}

	function onPlayBackRateChangeHandler(event: Event) {
		onPlaybackRateChange?.((event.target as HTMLMediaElement).playbackRate);
	}

	function onEnablePIPHandler() {
		onEnablePIP?.();
	}

	function onDisablePIPHandler() {
		onDisablePIP?.();
		if (playing) {
			play();
		}
	}

	function onPresentationModeChange(e: Event) {
		if (player && supportsWebKitPresentationMode(player)) {
			const { webkitPresentationMode } = player;
			if (webkitPresentationMode === 'picture-in-picture') {
				onEnablePIPHandler();
			} else if (webkitPresentationMode === 'inline') {
				onDisablePIPHandler();
			}
		}
	}

	export function onSeekHandler() {
		onSeek?.(player.currentTime);
	}

	type ShouldUseAudioParams = {
		url: FileUrl;
		config: FileConfig;
	};

	function shouldUseAudio(props: ShouldUseAudioParams) {
		if (props.config.forceVideo) {
			return false;
		}
		if ('poster' in props.config.attributes) {
			return false;
		}
		return AUDIO_EXTENSIONS.test(String(props.url)) || props.config.forceAudio;
	}

	function shouldUseHLS(url: FileUrl): url is string {
		if ((IS_SAFARI && config.forceSafariHLS) || config.forceHLS) {
			return true;
		}
		if (IS_IOS || config.forceDisableHls) {
			return false;
		}
		return HLS_EXTENSIONS.test(String(url)) || MATCH_CLOUDFLARE_STREAM.test(String(url));
	}

	function shouldUseDASH(url: FileUrl): url is string {
		return DASH_EXTENSIONS.test(String(url)) || config.forceDASH;
	}

	function shouldUseFLV(url: FileUrl): url is string {
		return FLV_EXTENSIONS.test(String(url)) || config.forceFLV;
	}

	export function load(loadUrl: FileUrl) {
		const { hlsVersion, hlsOptions, dashVersion, flvVersion } = config;
		if (hls) {
			hls.destroy();
		}
		if (dash) {
			dash.reset();
		}
		if (shouldUseHLS(loadUrl)) {
			getSDK(HLS_SDK_URL.replace('VERSION', hlsVersion), HLS_GLOBAL).then(function (Hls) {
				hls = new Hls(hlsOptions);
				hls.on(Hls.Events.MANIFEST_PARSED, function () {
					onReady?.();
				});
				hls.on(Hls.Events.ERROR, function (e, data) {
					onError?.({
						error: e,
						data: data,
						sdkInstance: hls,
						sdkGlobal: Hls
					});
				});
				if (MATCH_CLOUDFLARE_STREAM.test(loadUrl)) {
					const id = loadUrl.match(MATCH_CLOUDFLARE_STREAM)?.[1];
					hls.loadSource(REPLACE_CLOUDFLARE_STREAM.replace('{id}', String(id)));
				} else {
					hls.loadSource(loadUrl);
				}
				hls.attachMedia(player);
				onLoaded?.();
			});
		}
		if (shouldUseDASH(loadUrl)) {
			getSDK(DASH_SDK_URL.replace('VERSION', dashVersion), DASH_GLOBAL).then(function (dashjs) {
				dash = dashjs.MediaPlayer().create();
				dash.initialize(player, loadUrl, playing);
				dash.on('error', function (e) {
					onError?.({
						error: e.error
					});
				});
				if (parseInt(dashVersion) < 3) {
					dash.getDebug().setLogToBrowserConsole?.(false);
				} else {
					dash.updateSettings({ debug: { logLevel: dashjs.Debug.LOG_LEVEL_NONE } });
				}
				onLoaded?.();
			});
		}
		if (shouldUseFLV(loadUrl)) {
			getSDK(FLV_SDK_URL.replace('VERSION', flvVersion), FLV_GLOBAL).then(function (flvjs) {
				flv = flvjs.createPlayer({ type: 'flv', url: loadUrl });
				flv.attachMediaElement(player);
				flv.on(flvjs.Events.ERROR, function (e, data) {
					onError?.({
						error: e.error,
						data: data,
						sdkInstance: flv,
						sdkGlobal: flvjs
					});
				});
				flv.load();
				onLoaded?.();
			});
		}

		if (loadUrl instanceof Array) {
			player.load();
		} else if (isMediaStream(loadUrl)) {
			try {
				player.srcObject = loadUrl;
			} catch (e) {
				player.src = window.URL.createObjectURL(loadUrl as unknown as MediaSource | Blob);
			}
		}
	}

	export function play() {
		const promise = player.play();
		if (promise) {
			promise.catch(function (err) {
				onError?.({
					error: err
				});
			});
		}
	}

	export function pause() {
		player.pause();
	}

	export function stop() {
		player.removeAttribute('src');
		if (dash) {
			dash.reset();
		}
	}

	export function seekTo(seconds: number, keepPlaying = true) {
		player.currentTime = seconds;
		if (!keepPlaying) {
			pause();
		}
	}

	export function setVolume(fraction: number) {
		player.volume = fraction;
	}

	export function mute() {
		player.muted = true;
	}

	export function unmute() {
		player.muted = false;
	}

	export function enablePIP() {
		if ('requestPictureInPicture' in player && document.pictureInPictureElement !== player) {
			player.requestPictureInPicture();
		} else if (
			supportsWebKitPresentationMode(player) &&
			player.webkitPresentationMode !== 'picture-in-picture'
		) {
			player.webkitSetPresentationMode('picture-in-picture');
		}
	}

	export function disablePIP() {
		if (document.exitPictureInPicture && document.pictureInPictureElement === player) {
			document.exitPictureInPicture();
		} else if (
			supportsWebKitPresentationMode(player) &&
			player.webkitPresentationMode !== 'inline'
		) {
			player.webkitSetPresentationMode('inline');
		}
	}

	export function setPlaybackRate(rate: number) {
		try {
			player.playbackRate = rate;
		} catch (error) {
			onError?.({
				error: error
			});
		}
	}

	export function getDuration() {
		if (!player) {
			return null;
		}
		const { duration, seekable } = player;
		if (duration === Infinity && seekable.length > 0) {
			return seekable.end(seekable.length - 1);
		}
		return duration;
	}

	export function getCurrentTime() {
		if (!player) {
			return null;
		}
		return player.currentTime;
	}

	export function getSecondsLoaded() {
		if (!player) {
			return null;
		}
		const { buffered } = player;
		if (buffered.length === 0) {
			return 0;
		}
		const end = buffered.end(buffered.length - 1);
		const duration = getDuration();
		if (duration !== null && end > duration) {
			return duration;
		}
		return end;
	}

	function getSource(url: FileUrl) {
		if (typeof url === 'string' && MATCH_DROPBOX_URL.test(url)) {
			return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
		}
		const useHLS = shouldUseHLS(url);
		const useDASH = shouldUseDASH(url);
		const useFLV = shouldUseFLV(url);
		if (url instanceof Array || isMediaStream(url) || useHLS || useDASH || useFLV) {
			return undefined;
		}
		return url;
	}

	export function getPlayer<TKey extends FileInternalPlayerKey>(
		key: TKey
	): FileInternalPlayer[TKey] | null {
		const fileInternalPlayer: Partial<FileInternalPlayer> = {
			dash,
			flv,
			hls,
			player
		};

		return fileInternalPlayer[key] ?? null;
	}

	export function _setPlayer(newPlayer: FilePlayerElement) {
		player = newPlayer;
	}

	export function _setDash(newDashPlayer: DashJSMediaPlayerClass) {
		dash = newDashPlayer;
	}

	let useAudio = $derived(shouldUseAudio({ config, url }));
	let widthStyle = $derived(`width: ${width === 'auto' ? width : '100%'};`);
	let heightStyle = $derived(`height: ${height === 'auto' ? height : '100%'};`);
	let style = $derived(widthStyle + heightStyle);
</script>

{#if useAudio}
	<FilePlayerAudio
		{url}
		{style}
		bind:this={playerElementRef}
		src={getSource(url)}
		addListeners={_addListeners}
		removeListeners={_removeListeners}
		preload="auto"
		autoplay={playing || undefined}
		controls={controls || undefined}
		muted={muted || undefined}
		loop={loop || undefined}
		attributes={config.attributes as any}
	>
		{#snippet children()}
			<FilePlayerTrack {url} tracks={config.tracks} />
		{/snippet}
	</FilePlayerAudio>
{:else}
	<FilePlayerVideo
		{url}
		{style}
		bind:this={playerElementRef}
		src={getSource(url)}
		addListeners={_addListeners}
		removeListeners={_removeListeners}
		preload="auto"
		autoplay={playing || undefined}
		controls={controls || undefined}
		muted={muted || undefined}
		loop={loop || undefined}
		attributes={config.attributes as any}
	>
		{#snippet children()}
			<FilePlayerTrack {url} tracks={config.tracks} />
		{/snippet}
	</FilePlayerVideo>
{/if}
