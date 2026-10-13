import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';
import { formatPrice } from '../../../content/packages';

// Matches --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
const EASE = 'expo.out';

export function initPackages(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	const cards = gsap.utils.toArray<HTMLElement>('[data-bento-card]', root);
	gsap.set(cards, { autoAlpha: 0, y: 32 });

	ScrollTrigger.batch(cards, {
		start: 'top 88%',
		once: true,
		onEnter: (batch) => {
			// Stagger in visual grid order (row, then column), which differs from DOM order on tablet
			const ordered = (batch as HTMLElement[]).sort((a, b) => {
				const ra = a.getBoundingClientRect();
				const rb = b.getBoundingClientRect();
				return Math.round(ra.top - rb.top) || ra.left - rb.left;
			});

			gsap.to(ordered, {
				autoAlpha: 1,
				y: 0,
				duration: 1,
				ease: EASE,
				stagger: 0.08,
				// Hand transform back to CSS so hover lifts work
				clearProps: 'transform,opacity,visibility',
			});

			ordered.forEach((card) => {
				const price = card.querySelector<HTMLElement>('[data-count-to]');
				if (price) countUp(price);
			});
		},
	});
}

function countUp(el: HTMLElement) {
	const target = Number(el.dataset.countTo);
	if (!Number.isFinite(target)) return;

	// Reserve the final width so the text after the price doesn't shuffle while counting
	el.style.display = 'inline-block';
	el.style.minWidth = `${el.offsetWidth}px`;

	const counter = { value: 0 };
	el.textContent = formatPrice(0);
	gsap.to(counter, {
		value: target,
		duration: 1.4,
		delay: 0.25,
		ease: 'power3.out',
		onUpdate: () => {
			el.textContent = formatPrice(Math.round(counter.value));
		},
	});
}
