import type {
	PlayerCallbackProps,
	PlayerInternalPlayer,
	PlayerGetPlayerKey
} from './players/types';
import type { Snippet } from 'svelte';

export type SeekToType = 'seconds' | 'fraction';

export type PlayerMediaRef = {
	getDuration(): number | null;
	getCurrentTime(): number | null;
	getSecondsLoaded(): number | null;
	getInternalPlayer(key?: 'player'): PlayerInternalPlayer['player'] | null;
	getInternalPlayer<TKey extends PlayerGetPlayerKey>(key: TKey): PlayerInternalPlayer[TKey] | null;
	seekTo(amount: number, type?: SeekToType, keepPlaying?: boolean): void;
};

export type SveltePlayerRef = PlayerMediaRef & {
	showPreview(): void;
};

export type SveltePlayerCallbackProps = Omit<PlayerCallbackProps, 'onPlayerMount' | 'onLoaded'> & {
	onClickPreview?: () => void;
};

export type SveltePlayerSnippetProps = {
	lightSnippet?: Snippet;
	playIconSnippet?: Snippet;
};
