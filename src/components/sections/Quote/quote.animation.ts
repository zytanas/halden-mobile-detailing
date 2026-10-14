import { gsap } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';

/*
 * Entrances (heading, intro, steps, summary) come from lib/reveal.ts via data-reveal in the
 * markup. This adds the quick press on the card that was just selected (mouse, touch or
 * keyboard). Only the scale is tweened, and it's cleared after, since React owns the rest.
 */
export function initQuote(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	root.addEventListener('change', (event) => {
		const card = (event.target as Element).closest<HTMLElement>('[data-quote-option]');
		if (!card) return;
		gsap.fromTo(card, { scale: 0.98 }, { scale: 1, duration: 0.35, ease: 'power2.out', clearProps: 'scale' });
	});
}
