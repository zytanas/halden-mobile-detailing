/** Fired on window when the mobile menu opens or closes. */
export const MENU_TOGGLE_EVENT = 'halden:menu-toggle';

export type MenuToggleEvent = CustomEvent<{ open: boolean }>;

/**
 * Fired on window when a Packages bento "Details" link is clicked, just before the page
 * scrolls to the quote builder. The same detail is left on window.__haldenPreselect so a
 * builder that hydrates later can still pick it up.
 */
export const PRESELECT_EVENT = 'halden:preselect';

export type Preselect = { kind: 'package' | 'addon'; id: string };
export type PreselectEvent = CustomEvent<Preselect>;

/**
 * Fired (bubbling) on a [data-reveal] element, or a stagger group, when its reveal starts and
 * when it settles. `shown` says which way it went, so sections can hold back effects that
 * would clash with an element mid-animation (e.g. How's progress line).
 */
export const REVEAL_START_EVENT = 'halden:reveal-start';
export const REVEAL_END_EVENT = 'halden:reveal-end';

export type RevealEvent = CustomEvent<{ shown: boolean }>;

declare global {
	interface WindowEventMap {
		[MENU_TOGGLE_EVENT]: MenuToggleEvent;
		[PRESELECT_EVENT]: PreselectEvent;
	}

	interface HTMLElementEventMap {
		[REVEAL_START_EVENT]: RevealEvent;
		[REVEAL_END_EVENT]: RevealEvent;
	}

	interface Window {
		__haldenPreselect?: Preselect;
	}
}
