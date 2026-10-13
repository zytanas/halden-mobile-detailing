import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';
import { formatStat } from '../../../content/results';

// Matches --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
const EASE = 'expo.out';

export function initResults(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	const q = gsap.utils.selector(root);

	// Heading and intro
	const intro = q('[data-results-reveal]');
	gsap.set(intro, { autoAlpha: 0, y: 24 });
	ScrollTrigger.create({
		trigger: root,
		start: 'top 80%',
		once: true,
		onEnter: () => gsap.to(intro, { autoAlpha: 1, y: 0, duration: 1, ease: EASE, stagger: 0.1 }),
	});

	// Slider frames, in DOM order (featured first)
	const frames = q('[data-results-frame]');
	gsap.set(frames, { autoAlpha: 0, y: 24 });
	ScrollTrigger.create({
		trigger: frames[0],
		start: 'top 85%',
		once: true,
		onEnter: () =>
			gsap.to(frames, {
				autoAlpha: 1,
				y: 0,
				duration: 1,
				ease: EASE,
				stagger: 0.12,
				clearProps: 'transform,opacity,visibility',
			}),
	});

	// Proof strip fades in, then the counters run
	const strip = q('[data-results-stats]')[0] as HTMLElement | undefined;
	if (!strip) return;
	const counters = gsap.utils.toArray<HTMLElement>('[data-count-to]', strip);
	gsap.set(strip, { autoAlpha: 0, y: 24 });
	ScrollTrigger.create({
		trigger: strip,
		start: 'top 88%',
		once: true,
		onEnter: () => {
			gsap.to(strip, {
				autoAlpha: 1,
				y: 0,
				duration: 0.8,
				ease: EASE,
				clearProps: 'transform,opacity,visibility',
				onStart: () => counters.forEach((el) => countUp(el, 0.2)),
			});
		},
	});
}

function countUp(el: HTMLElement, delay: number) {
	const target = Number(el.dataset.countTo);
	const decimals = Number(el.dataset.decimals) || 0;
	if (!Number.isFinite(target)) return;

	// Width is reserved in the markup (StatCounter.astro), so no measuring here
	const counter = { value: 0 };
	el.textContent = formatStat(0, decimals);
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
