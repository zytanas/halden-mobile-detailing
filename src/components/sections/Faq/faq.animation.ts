import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';

// Matches --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
const EASE = 'expo.out';

/** Seconds to open or close a panel (--duration-base) */
const DURATION = 0.4;

/*
 * The markup ships finished (everything visible, first answer open), which is what reduced
 * motion and no-JS users see. Everything below rewinds it and plays it back.
 * Opacity rather than autoAlpha throughout, so links and buttons stay in the tab order.
 */
export function initFaq(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	const q = gsap.utils.selector(root);

	// Heading, intro and help card. Batched, so on mobile the card waits until it's on screen.
	const reveal = q('[data-faq-reveal]');
	gsap.set(reveal, { opacity: 0, y: 24 });
	ScrollTrigger.batch(reveal, {
		start: 'top 88%',
		once: true,
		onEnter: (batch) =>
			gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: EASE, stagger: 0.1, clearProps: 'transform,opacity' }),
	});

	const items = q('[data-faq-item]');
	gsap.set(items, { opacity: 0, y: 16 });
	ScrollTrigger.batch(items, {
		start: 'top 92%',
		once: true,
		onEnter: (batch) =>
			gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.06, clearProps: 'transform,opacity' }),
	});
}

/** Closed panels are "until-found", so find-in-page can still reach (and open) them */
export function hidePanel(panel: HTMLElement) {
	panel.setAttribute('hidden', 'until-found');
}

/*
 * Height grows from wherever it is now (0 when hidden, part-way if it was closing), and the
 * answer fades up just behind it. The icon turns by CSS transition over the same duration
 * and ease, triggered by the same state change, so the two stay in step.
 */
export function expand(panel: HTMLElement) {
	const answer = panel.querySelector<HTMLElement>('[data-faq-answer]');
	const wasHidden = panel.hasAttribute('hidden');
	panel.removeAttribute('hidden');
	gsap.killTweensOf([panel, answer]);

	if (prefersReducedMotion()) {
		gsap.set([panel, answer], { clearProps: 'height,overflow,opacity,transform' });
		return;
	}

	gsap.set(panel, { overflow: 'hidden' });
	if (wasHidden) {
		gsap.set(panel, { height: 0 });
		gsap.set(answer, { opacity: 0, y: 6 });
	}

	gsap
		.timeline({ onComplete: settle })
		.to(panel, { height: 'auto', duration: DURATION, ease: EASE, clearProps: 'height,overflow' })
		.to(answer, { opacity: 1, y: 0, duration: DURATION, ease: EASE, clearProps: 'opacity,transform' }, 0.08);
}

/* Answer fades first, the height follows; the panel is hidden again once it reaches zero */
export function collapse(panel: HTMLElement) {
	const answer = panel.querySelector<HTMLElement>('[data-faq-answer]');
	gsap.killTweensOf([panel, answer]);

	const done = () => {
		hidePanel(panel);
		gsap.set([panel, answer], { clearProps: 'height,overflow,opacity,transform' });
	};

	if (prefersReducedMotion() || panel.hasAttribute('hidden')) {
		done();
		return;
	}

	gsap
		.timeline({
			onComplete: () => {
				done();
				settle();
			},
		})
		.set(panel, { overflow: 'hidden', height: panel.offsetHeight })
		.to(answer, { opacity: 0, duration: DURATION / 2, ease: 'power2.out' }, 0)
		.to(panel, { height: 0, duration: DURATION, ease: EASE }, 0);
}

/*
 * Content below has moved, so let scroll-triggered sections re-measure. Switching items
 * finishes two timelines at once, so the calls are coalesced into one refresh.
 */
let refresh: gsap.core.Tween | undefined;
function settle() {
	refresh?.kill();
	refresh = gsap.delayedCall(0.05, () => ScrollTrigger.refresh());
}
