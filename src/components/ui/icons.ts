/**
 * Line icon paths, shared by Icon.astro and the React islands (Icon.tsx).
 * Drawn on a 16px grid unless a wider viewBox is listed below (car silhouettes).
 */
export type IconName =
	| 'arrow'
	| 'phone'
	| 'mail'
	| 'clock'
	| 'menu'
	| 'close'
	| 'calendar'
	| 'van'
	| 'key'
	| 'check'
	| 'card'
	| 'pause'
	| 'play'
	| 'plus'
	| 'info'
	| 'pin'
	| 'lock'
	| 'chevron-up'
	| 'car-small'
	| 'car-medium'
	| 'car-large'
	| 'instagram'
	| 'facebook'
	| 'tiktok';

export const iconPaths: Record<IconName, string> = {
	arrow: 'M1 8h13M9.5 3.5 14 8l-4.5 4.5',
	phone:
		'M5.6 1.75H3.5A1.75 1.75 0 0 0 1.75 3.6c.2 5.7 4.95 10.45 10.65 10.65a1.75 1.75 0 0 0 1.85-1.75v-2.1l-2.95-1.2-1.4 1.55a8.2 8.2 0 0 1-4.6-4.6L6.85 4.7Z',
	mail: 'M2 3.5h12v9H2zM2.25 4l5.75 4.5L13.75 4',
	clock: 'M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5ZM8 4.5V8l2.5 1.5',
	menu: 'M2 5.5h12M2 10.5h12',
	close: 'M3.5 3.5l9 9M12.5 3.5l-9 9',
	calendar:
		'M3.75 3h8.5a1.5 1.5 0 0 1 1.5 1.5v7.75a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 1-1.5-1.5V4.5A1.5 1.5 0 0 1 3.75 3ZM2.25 6.75h11.5M5.25 1.75v2.5M10.75 1.75v2.5',
	van: 'M3.05 11.5h-.8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h7.5l3 3.5h1a1 1 0 0 1 1 1v2.5a1 1 0 0 1-1 1h-.8M5.95 11.5h4.1M9.75 3.5V7h3M4.5 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM11.5 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
	key: 'M5 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM7.15 8.85l6.6-6.6M11.25 4.75 13 6.5M9.5 6.5l1.25 1.25',
	check: 'M3 8.5 6.5 12 13 4.5',
	card: 'M3.25 3.5h9.5A1.25 1.25 0 0 1 14 4.75v6.5a1.25 1.25 0 0 1-1.25 1.25h-9.5A1.25 1.25 0 0 1 2 11.25v-6.5A1.25 1.25 0 0 1 3.25 3.5ZM2 6.5h12M4.5 9.75H7',
	pause: 'M5.5 3.5v9M10.5 3.5v9',
	play: 'M5 3.25v9.5L12.5 8Z',
	plus: 'M8 2.75v10.5M2.75 8h10.5',
	info: 'M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5ZM8 7.25v4M8 4.85v.01',
	pin: 'M8 14.25s4.75-4.1 4.75-8A4.75 4.75 0 0 0 3.25 6.25c0 3.9 4.75 8 4.75 8ZM8 4.5a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z',
	lock: 'M4.5 7.25h7a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-4.5a1 1 0 0 1 1-1ZM5.5 7.25v-2a2.5 2.5 0 0 1 5 0v2',
	'chevron-up': 'M3.5 10.25 8 5.75l4.5 4.5',
	'car-small':
		'M5.75 12H4a1 1 0 0 1-1-1V8.2a1 1 0 0 1 .3-.7L6.5 4.4a1.5 1.5 0 0 1 1-.4h8a1.5 1.5 0 0 1 1.1.5l2.9 3 4.7.8a1.5 1.5 0 0 1 1.3 1.5V11a1 1 0 0 1-1 1h-.25M10.25 12h9.5M8 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM22 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
	'car-medium':
		'M6.25 12H3.5a1 1 0 0 1-1-1V9.3a1 1 0 0 1 .8-1L7 7.5l3.4-3a2 2 0 0 1 1.3-.5h7.6a2 2 0 0 1 1.4.6l3 2.9 5 .8a1.5 1.5 0 0 1 1.3 1.5V11a1 1 0 0 1-1 1h-1.25M10.75 12h12.5M8.5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM25.5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
	'car-large':
		'M6 12H3.5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 .4-.8L5 3.3a1.5 1.5 0 0 1 1.1-.5H20a1.5 1.5 0 0 1 1.1.5l3.4 3.5 4.3.8a1.5 1.5 0 0 1 1.2 1.5V11a1 1 0 0 1-1 1H28M11 12h12M8.5 9.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM25.5 9.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z',
	instagram:
		'M5 2h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3ZM8 5.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5ZM11.6 4.4v.01',
	facebook: 'M10.75 1.75h-1.5a2.5 2.5 0 0 0-2.5 2.5v10M4.75 7h5.5',
	tiktok: 'M9.25 1.75v8.75a2.75 2.75 0 1 1-2.75-2.75M9.25 1.75a3.5 3.5 0 0 0 3.5 3.5',
};

/** Icons drawn wider than the 16px square */
export const iconViewBoxes: Partial<Record<IconName, string>> = {
	'car-small': '0 0 28 16',
	'car-medium': '0 0 32 16',
	'car-large': '0 0 32 16',
};

export const iconViewBox = (name: IconName) => iconViewBoxes[name] ?? '0 0 16 16';
