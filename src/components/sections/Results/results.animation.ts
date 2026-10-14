import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';
import { onMotion, type Motion } from '../../../lib/media';
import { formatStat } from '../../../content/results';

/*
 * Entrances come from lib/reveal.ts (data-reveal in the markup). This adds the featured
 * slider opening up with the scroll, and the proof-strip counters, which run once.
 */
export function initResults(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	const featured = root.querySelector<HTMLElement>('[data-results-featured]');
	if (featured) onMotion((m) => openFeatured(featured, m));

	const strip = root.querySelector<HTMLElement>('[data-results-stats]');
	if (strip) initCounters(strip);
}

/*
 * Featured frame: a narrow band down the middle widens to the full frame as it scrolls in,
 * scrubbed so it closes again on the way back up. The end state reaches past the frame's
 * edges so its shadow isn't clipped once it's open.
 */
function openFeatured(frame: HTMLElement, m: Motion) {
	const band = { mobile: 30, tablet: 36, desktop: 42 }[m.device];
	gsap.fromTo(
		frame,
		{ clipPath: `inset(6% ${band}% 6% ${band}% round 20px)` },
		{
			clipPath: 'inset(-8% -4% -8% -4% round 20px)',
			ease: 'power2.out',
			scrollTrigger: { trigger: frame, start: 'top bottom', end: 'top 35%', scrub: 0.6 },
		},
	);
	return () => gsap.set(frame, { clearProps: 'clipPath' });
}

/* Counters start at zero and run the first time the strip arrives; they never replay */
function initCounters(strip: HTMLElement) {
	const counters = gsap.utils.toArray<HTMLElement>('[data-count-to]', strip);
	if (!counters.length) return;
	counters.forEach((el) => (el.textContent = formatStat(0, Number(el.dataset.decimals) || 0)));

	ScrollTrigger.create({
		trigger: strip,
		start: 'top 88%',
		once: true,
		onEnter: () => counters.forEach((el) => countUp(el, 0.3)),
	});
}

function countUp(el: HTMLElement, delay: number) {
	const target = Number(el.dataset.countTo);
	const decimals = Number(el.dataset.decimals) || 0;
	if (!Number.isFinite(target)) return;

	// Width is reserved in the markup (StatCounter.astro), so no measuring here
	const counter = { value: 0 };
	gsap.to(counter, {
		value: target,
		duration: 1.4,
		delay,
		ease: 'power3.out',
		onUpdate: () => {
			el.textContent = formatStat(counter.value, decimals);
		},
	});
}
