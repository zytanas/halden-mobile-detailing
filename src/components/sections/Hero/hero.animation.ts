import { gsap, ScrollTrigger, SplitText } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';
import { fontsSettled, onMotion } from '../../../lib/media';

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

	// Reduced motion: no intro, no sweeps, no scroll effects; everything in its final state
	if (prefersReducedMotion()) {
		html.classList.remove(PENDING_CLASS);
		return;
	}

	// Split lines against final font metrics, but never wait long for them
	await fontsSettled();
	window.clearTimeout(window.__heroFailsafe);

	const q = gsap.utils.selector(root);
	const panel = q('[data-hero-panel]')[0] as HTMLElement;

	// The load sequence plays once; it never replays on scroll.
	// If the failsafe already revealed the content, don't hide it again.
	if (html.classList.contains(PENDING_CLASS)) {
		playIntro(q, () => startAmbientSheen(root, panel));
		html.classList.remove(PENDING_CLASS);
	} else {
		startAmbientSheen(root, panel);
	}

	addScrollEffects(root, q, panel);
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
		// 1. Panel. Its transform is left in place: the scroll exit scales it too.
		.from(q('[data-hero-panel]'), { autoAlpha: 0, scale: 0.97, duration: 1 }, 0)
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

/*
 * 5. One sheen sweep after the intro, then a slower, subtler one every ~10s while the page
 * sits at the top. Once the visitor scrolls, the scroll exit drives the sheen instead.
 */
function startAmbientSheen(root: HTMLElement, panel: HTMLElement) {
	gsap.fromTo(
		panel,
		{ '--sheen-x': '-30%', '--sheen-strength': '55%' },
		{ '--sheen-x': '130%', duration: 1.6, ease: 'power2.inOut' },
	);

	const loop = gsap.timeline({ repeat: -1, delay: SHEEN_INTERVAL - 1.6, repeatDelay: SHEEN_INTERVAL - 2.6 });
	loop.fromTo(
		panel,
		{ '--sheen-x': '-30%', '--sheen-strength': '35%' },
		{ '--sheen-x': '130%', duration: 2.6, ease: 'sine.inOut' },
	);

	// Back at the very top: start again from a full wait, so the light never jumps mid-sweep
	ScrollTrigger.create({
		trigger: root,
		start: 'top top',
		end: 'bottom top',
		onEnter: () => loop.pause(),
		onLeaveBack: () => loop.restart(true),
	});
}

/*
 * 6. Scroll exit, scrubbed to the scroll position so it rewinds on the way back up: the panel
 * recedes (scales down, corners round off a little), the car drives left, the stripes run on
 * down their diagonal at two speeds for depth, the headline lifts and fades, and the light
 * slides across. Phones and tablets use smaller distances (motion.amount).
 */
function addScrollEffects(root: HTMLElement, q: Query, panel: HTMLElement) {
	onMotion((m) => {
		const a = m.amount;
		const car = q('[data-hero-car-parallax]');
		const headline = q('[data-hero-headline]');

		const tl = gsap.timeline({
			defaults: { ease: 'none' },
			scrollTrigger: {
				trigger: root,
				start: 'top top',
				end: 'bottom top',
				scrub: 0.6,
				// will-change only while the exit is in play
				onToggle: (self) => gsap.set([panel, ...car], { willChange: self.isActive ? 'transform' : 'auto' }),
			},
		});

		// Recede towards the bottom edge, so the gap to the next section doesn't open up
		gsap.set(panel, { transformOrigin: '50% 100%' });

		tl.fromTo(panel, { scale: 1 }, { scale: 1 - 0.06 * a, immediateRender: false }, 0)
			.fromTo(car, { xPercent: 0 }, { xPercent: -8 * a, immediateRender: false }, 0)
			.fromTo(headline, { y: 0, opacity: 1 }, { y: -90 * a, opacity: 0.55, immediateRender: false }, 0)
			.fromTo(panel, { '--sheen-x': '-30%' }, { '--sheen-x': '130%', '--sheen-strength': '40%', immediateRender: false }, 0);

		// Corner radius is a paint (not compositor) property: one element, larger screens only
		if (m.device !== 'mobile') {
			tl.fromTo(panel, { '--radius-panel': '1.75rem' }, { '--radius-panel': '2.5rem', immediateRender: false }, 0);
		}

		// Stripes only show from lg
		if (m.device === 'desktop') {
			q('[data-hero-stripe]').forEach((stripe, i) => {
				tl.fromTo(stripe, { y: 0 }, { y: i === 0 ? 140 : 220, immediateRender: false }, 0);
			});
		}

		return () => gsap.set(panel, { clearProps: '--radius-panel,--sheen-strength' });
	});
}
