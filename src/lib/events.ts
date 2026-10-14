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

declare global {
	interface WindowEventMap {
		[MENU_TOGGLE_EVENT]: MenuToggleEvent;
		[PRESELECT_EVENT]: PreselectEvent;
	}

	interface Window {
		__haldenPreselect?: Preselect;
	}
}
