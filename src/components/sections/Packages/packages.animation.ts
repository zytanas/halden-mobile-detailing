import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';
import { onMotion, type Motion } from '../../../lib/media';
import { formatPrice } from '../../../content/packages';

/*
 * Where each card starts before it settles into the grid, in grid (DOM) order: packages,
 * add-ons, then the CTA. Fixed rather than random, so the scatter looks the same every visit.
 */
const SCATTER = [
	{ x: -36, y: 40, rotation: -2.5 },
	{ x: 28, y: 24, rotation: 2 },
	{ x: 40, y: 36, rotation: 3 },
	{ x: -20, y: 32, rotation: 1.5 },
	{ x: -40, y: 28, rotation: 2.5 },
	{ x: 24, y: 40, rotation: -2 },
	{ x: -28, y: 20, rotation: -3 },
	{ x: 36, y: 32, rotation: 1 },
	{ x: 16, y: 40, rotation: -1.5 },
];

/*
 * The markup ships finished, which is what reduced motion and no-JS users see.
 * Cards are scrubbed to the scroll position, so they settle on the way down and scatter
 * again on the way back up. The featured price counts up once.
 */
export function initPackages(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	const grid = root.querySelector<HTMLElement>('[data-bento-grid]');
	const cards = gsap.utils.toArray<HTMLElement>('[data-bento-card]', root);
	if (!grid || !cards.length) return;

	onMotion((m) => {
		if (m.device === 'mobile') settleEach(cards);
		else settleScattered(grid, cards, m);
		releaseIndependentTransforms(cards);
	});

	const price = root.querySelector<HTMLElement>('[data-count-to]');
	if (price) initCounter(price);
}

/* Tablet and desktop: the whole grid gathers in, finishing once it's ~60% up the screen */
function settleScattered(grid: HTMLElement, cards: HTMLElement[], m: Motion) {
	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: grid,
			start: 'top bottom',
			end: 'top 40%',
			scrub: 0.6,
			onToggle: (self) => gsap.set(cards, { willChange: self.isActive ? 'transform, opacity' : 'auto' }),
		},
	});

	cards.forEach((card, i) => {
		const from = SCATTER[i % SCATTER.length];
		tl.fromTo(
			card,
			{ x: from.x * m.amount, y: from.y * m.amount, rotation: from.rotation * m.amount },
			{ x: 0, y: 0, rotation: 0, duration: 1, ease: 'power2.out' },
			0,
		).fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none' }, 0);
	});
}

/* Phones (one column): no scatter; each card grows in from 94% as it enters */
function settleEach(cards: HTMLElement[]) {
	cards.forEach((card) => {
		gsap.fromTo(
			card,
			{ scale: 0.94, opacity: 0 },
			{
				scale: 1,
				opacity: 1,
				ease: 'power2.out',
				scrollTrigger: {
					trigger: card,
					start: 'top bottom',
					end: 'top 75%',
					scrub: 0.6,
					onToggle: (self) => gsap.set(card, { willChange: self.isActive ? 'transform, opacity' : 'auto' }),
				},
			},
		);
	});
}

/*
 * When GSAP first transforms an element it folds the CSS translate/rotate/scale properties
 * into its own transform and pins them to "none" inline. That would kill the cards' hover
 * lift (Tailwind's translate utilities), so hand those properties back to the stylesheet;
 * they compose with GSAP's transform.
 */
function releaseIndependentTransforms(elements: HTMLElement[]) {
	for (const el of elements) {
		el.style.removeProperty('translate');
		el.style.removeProperty('rotate');
		el.style.removeProperty('scale');
	}
}

/* Runs once, the first time the price comes into view; never replays on scroll */
function initCounter(el: HTMLElement) {
	const target = Number(el.dataset.countTo);
	if (!Number.isFinite(target)) return;

	// Reserve the final width so the text after the price doesn't shuffle while counting
	el.style.display = 'inline-block';
	el.style.minWidth = `${el.offsetWidth}px`;
	el.textContent = formatPrice(0);

	ScrollTrigger.create({
		trigger: el,
		start: 'top 80%',
		once: true,
		onEnter: () => {
			const counter = { value: 0 };
			gsap.to(counter, {
				value: target,
				duration: 1.4,
				delay: 0.15,
				ease: 'power3.out',
				onUpdate: () => {
					el.textContent = formatPrice(Math.round(counter.value));
				},
			});
		},
	});
}
