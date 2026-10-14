/**
 * Button variant classes, shared by Button.astro and the React islands so both stay identical.
 */
export type ButtonVariant = 'primary' | 'dark' | 'outline' | 'link';
export type ButtonSize = 'md' | 'sm';

const base =
	'inline-flex items-center justify-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-deep';

const sizes: Record<ButtonSize, string> = {
	md: 'min-h-13 px-7 text-[0.9375rem]',
	sm: 'min-h-10 px-5 text-sm',
};

const pill = 'rounded-pill font-semibold active:scale-[0.98]';

const variants: Record<Exclude<ButtonVariant, 'link'>, string> = {
	primary:
		'bg-accent text-on-accent transition-[background-color,box-shadow,scale] duration-300 ease-out hover:bg-accent-deep hover:shadow-accent',
	dark: 'bg-ink text-on-accent transition-[background-color,box-shadow,scale] duration-300 ease-out hover:bg-accent hover:shadow-accent',
	outline:
		'border border-ink text-ink transition-[background-color,color,scale] duration-300 ease-out hover:bg-ink hover:text-on-accent',
};

const link =
	'group min-h-13 rounded-pill px-1 text-[0.9375rem] font-semibold text-ink transition-colors duration-300 ease-out hover:text-accent-deep';

/** Locked state for <button disabled>: flat metal, muted text, no hover or press */
const disabled =
	'disabled:cursor-not-allowed disabled:border disabled:border-line disabled:bg-metal-200 disabled:text-ink-muted disabled:shadow-none disabled:active:scale-100';

export function buttonClass({ variant = 'primary', size = 'md' }: { variant?: ButtonVariant; size?: ButtonSize } = {}) {
	if (variant === 'link') return `${base} ${link}`;
	return `${base} ${pill} ${sizes[size]} ${variants[variant]} ${disabled}`;
}
