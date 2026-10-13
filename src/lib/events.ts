/** Fired on window when the mobile menu opens or closes. */
export const MENU_TOGGLE_EVENT = 'halden:menu-toggle';

export type MenuToggleEvent = CustomEvent<{ open: boolean }>;

declare global {
	interface WindowEventMap {
		[MENU_TOGGLE_EVENT]: MenuToggleEvent;
	}
}
