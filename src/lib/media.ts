/**
 * Breakpoint-aware motion. Every scroll effect is built through onMotion(), so each one gets
 * distances and durations for the current screen size, is torn down and rebuilt when the
 * breakpoint changes (resize, phone rotation), and never runs with reduced motion.
 * Kept apart from motion.ts so the React islands can use prefersReducedMotion without GSAP.
 */
import { gsap } from './gsap';

// Matches --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
export const EASE_OUT = 'expo.out';

export type Device = 'mobile' | 'tablet' | 'desktop';

export interface Motion {
	device: Device;
	/** Vertical travel for reveals, in px */
	distance: number;
	/** Horizontal travel for left/right reveals, in px */
	slide: number;
	/** Seconds for a reveal */
	duration: number;
	/** Multiplier for scrubbed showcase distances and angles (desktop = 1) */
	amount: number;
}

const MOTION: Record<Device, Motion> = {
	mobile: { device: 'mobile', distance: 20, slide: 24, duration: 0.7, amount: 0.5 },
	tablet: { device: 'tablet', distance: 26, slide: 32, duration: 0.8, amount: 0.75 },
	desktop: { device: 'desktop', distance: 32, slide: 40, duration: 0.9, amount: 1 },
};

const QUERIES = {
	mobile: '(max-width: 47.98rem) and (prefers-reduced-motion: no-preference)',
	tablet: '(min-width: 48rem) and (max-width: 63.98rem) and (prefers-reduced-motion: no-preference)',
	desktop: '(min-width: 64rem) and (prefers-reduced-motion: no-preference)',
	reducedMotion: '(prefers-reduced-motion: reduce)',
};

const DEVICES: Device[] = ['mobile', 'tablet', 'desktop'];

/**
 * Runs `build` for the current breakpoint and rebuilds it whenever the breakpoint changes.
 * Tweens and ScrollTriggers created synchronously inside `build` are reverted automatically;
 * return a cleanup for anything else (listeners, DOM changes, styles set from callbacks).
 * Nothing runs with reduced motion, so the page keeps its finished, static markup.
 */
export function onMotion(build: (motion: Motion) => void | (() => void)) {
	const mm = gsap.matchMedia();
	mm.add(QUERIES, (context) => {
		const device = DEVICES.find((name) => context.conditions?.[name]);
		if (!device) return;
		return build(MOTION[device]);
	});
	return mm;
}

/** Resolves once web fonts are in (so text splits against final metrics), but never waits long */
export function fontsSettled(timeout = 1200) {
	return Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, timeout))]);
}

/** Resolves once every module script has run (they're deferred, so this is DOMContentLoaded) */
export function domReady() {
	return new Promise<void>((resolve) => {
		if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
		else resolve();
	});
}
