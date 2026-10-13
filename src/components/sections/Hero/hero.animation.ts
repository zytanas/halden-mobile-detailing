import { gsap, ScrollTrigger, SplitText } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';

declare global {
	interface Window {
		__heroFailsafe?: number;
	}
}

/** Set by the inline script in Hero.astro; hides [data-hero-reveal] elements until we take over. */
const PENDING_CLASS = 'hero-anim';

// Matches --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
const EASE = 'expo.out';

/** Seconds between the slow ambient sheen sweeps */
const SHEEN_INTERVAL = 10;

type Query = (selector: string) => Element[];

export async function initHero(root: HTMLElement) {
	const html = document.documentElement;

	// Reduced motion: no intro, no sweeps, no parallax; everything in its final state
	if (prefersReducedMotion()) {
		html.classList.remove(PENDING_CLASS);
		return;
	}

	// Split lines against final font metrics, but never wait long for them
	await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1200))]);
	window.clearTimeout(window.__heroFailsafe);

	const q = gsap.utils.selector(root);
	const panel = q('[data-hero-panel]')[0] as HTMLElement;

	// If the failsafe already revealed the content, don't hide it again
	if (html.classList.contains(PENDING_CLASS)) {
		playIntro(q, () => startAmbientSheen(root, panel));
		html.classList.remove(PENDING_CLASS);
	} else {
		startAmbientSheen(root, panel);
	}

	addScrollEffects(root, q);
}

function playIntro(q: Query, onComplete: () => void) {
	const split = SplitText.create(q('[data-hero-line]'), {
		type: 'lines',
		mask: 'lines',
		linesClass: 'hero-line',
	});

	const tl = gsap.timeline({
		defaults: { ease: EASE },
		onComplete: () => {
			// Restore the original markup so the headline reflows naturally on resize
			split.revert();
			onComplete();
		},
	});

	// The contact shadow only exists in placeholder mode (the photo has its own grounding)
	const shadow = q('[data-hero-car-shadow]');
	if (shadow.length) tl.from(shadow, { opacity: 0, scaleX: 0.7, duration: 1 }, 0.75);

	tl
		// 1. Panel
		.from(q('[data-hero-panel]'), { autoAlpha: 0, scale: 0.97, duration: 1, clearProps: 'transform' }, 0)
		// 2. Stripes slide down along their own (rotated) axis from the top-right; wide first
		.from(q('[data-hero-stripe]'), { yPercent: -100, duration: 1.2, stagger: 0.1 }, 0.2)
		// 3. Car slides in from the right and settles
		.from(q('[data-hero-car]'), { x: 80, autoAlpha: 0, duration: 1.2 }, 0.45)
		// 4. Copy
		.from(split.lines, { yPercent: 110, duration: 1.1, stagger: 0.1 }, 0.45)
		.from(q('[data-hero-fade]'), { autoAlpha: 0, y: 16, duration: 1, stagger: 0.08 }, 0.85)
		// 5. Trust row items right after the CTAs, then the availability card
		.from(q('[data-hero-trust] li'), { autoAlpha: 0, y: 10, duration: 0.8, stagger: 0.06 }, '<0.16')
		.from(q('[data-hero-card]'), { autoAlpha: 0, y: 16, duration: 1 }, '<0.2');
}

/** 5. One sheen sweep after the intro, then a slower, subtler one every ~10s while the hero is on screen */
function startAmbientSheen(root: HTMLElement, panel: HTMLElement) {
	gsap.fromTo(
		panel,
		{ '--sheen-x': '-30%', '--sheen-strength': '55%' },
		{ '--sheen-x': '130%', duration: 1.6, ease: 'power2.inOut' },
	);

	const loop = gsap.timeline({ repeat: -1, delay: SHEEN_INTERVAL - 1.6, repeatDelay: SHEEN_INTERVAL - 2.6, paused: true });
	loop.fromTo(
		panel,
		{ '--sheen-x': '-30%', '--sheen-strength': '35%' },
		{ '--sheen-x': '130%', duration: 2.6, ease: 'sine.inOut' },
	);

	// Only run the ambient sweep while the hero is visible
	ScrollTrigger.create({
		trigger: root,
		start: 'top bottom',
		end: 'bottom top',
		onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
	});
}

/** 6. Gentle parallax: car lags behind the text, stripes run slightly ahead */
function addScrollEffects(root: HTMLElement, q: Query) {
	const scrub = () => ({ trigger: root, start: 'top top', end: 'bottom top', scrub: 0.5 });

	gsap.to(q('[data-hero-car-parallax]'), { y: 50, ease: 'none', scrollTrigger: scrub() });
	gsap.to(q('[data-hero-stripes]'), { y: -90, ease: 'none', scrollTrigger: scrub() });
}
