import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';

// Matches --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
const EASE = 'expo.out';

/*
 * The markup ships finished (the builder is server-rendered), which is what reduced motion
 * and no-JS users see. Opacity rather than autoAlpha, so inputs stay in the tab order.
 * Only elements React never restyles are tweened, and their inline styles are cleared after.
 */
export function initQuote(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	const q = gsap.utils.selector(root);

	// Heading, intro, then each step as it scrolls in
	const reveal = [...q('[data-quote-reveal]'), ...q('[data-quote-step]')];
	gsap.set(reveal, { opacity: 0, y: 24 });
	ScrollTrigger.batch(reveal, {
		start: 'top 90%',
		once: true,
		onEnter: (batch) =>
			gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: EASE, stagger: 0.1, clearProps: 'transform,opacity' }),
	});

	// Summary card rises in beside the steps (it's only shown from lg)
	const summary = q('[data-quote-summary]')[0] as HTMLElement | undefined;
	if (summary) {
		gsap.matchMedia().add('(min-width: 64rem)', () => {
			gsap.from(summary, {
				opacity: 0,
				y: 56,
				duration: 1.2,
				ease: EASE,
				clearProps: 'transform,opacity',
				scrollTrigger: { trigger: summary, start: 'top 85%', once: true },
			});
		});
	}

	initTap(root);
}

/* Quick press on the card that was just selected (mouse, touch or keyboard) */
function initTap(root: HTMLElement) {
	root.addEventListener('change', (event) => {
		const card = (event.target as Element).closest<HTMLElement>('[data-quote-option]');
		if (!card) return;
		gsap.fromTo(card, { scale: 0.98 }, { scale: 1, duration: 0.35, ease: 'power2.out', clearProps: 'scale' });
	});
}
