import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';
import { onMotion } from '../../../lib/media';
import { REVEAL_END_EVENT, REVEAL_START_EVENT } from '../../../lib/events';

/*
 * The markup ships in its finished state (line drawn, every step active), which is what
 * reduced motion and no-JS users see. Entrances come from lib/reveal.ts (data-reveal in the
 * markup); this adds the scrubbed progress line and the checklist pop.
 */
export function initHow(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	const q = gsap.utils.selector(root);
	const wrap = q('[data-how-steps]')[0] as HTMLElement | undefined;
	const list = q('[data-how-list]')[0] as HTMLElement | undefined;
	const track = q('[data-how-track]')[0] as HTMLElement | undefined;
	const fill = q('[data-how-fill]')[0] as HTMLElement | undefined;
	const steps = q('[data-how-step]') as HTMLElement[];
	if (!wrap || !list || !track || !fill || !steps.length) return;

	onMotion(() => syncTrack(list, track, steps));
	initLine(wrap, track, fill, steps);
	initChecks(q('[data-how-band]')[0] as HTMLElement | undefined);
}

/*
 * The cards reveal (and hide again) with the scroll. While a card is moving it's a stacking
 * context, and the line, which normally paints between a card's background and its content,
 * would paint over the whole card. So the line drops behind the cards while any of them
 * moves (the wrapper is isolated, so "behind" stays inside it), and only shows at all while
 * at least one card is visible.
 */
function syncTrack(list: HTMLElement, track: HTMLElement, steps: HTMLElement[]) {
	gsap.set(track, { autoAlpha: 0 });

	let frame = 0;
	const check = () => {
		frame = 0;
		const moving = steps.some((step) => gsap.isTweening(step));
		const visible = moving || steps.some((step) => step.style.opacity !== '0');
		track.style.zIndex = moving ? '-1' : '';
		gsap.to(track, { autoAlpha: visible ? 1 : 0, duration: 0.3, overwrite: true });
	};
	// After the tween's first render, so the cards' opacity is current
	const schedule = () => (frame ||= requestAnimationFrame(check));

	list.addEventListener(REVEAL_START_EVENT, schedule);
	list.addEventListener(REVEAL_END_EVENT, schedule);
	return () => {
		cancelAnimationFrame(frame);
		list.removeEventListener(REVEAL_START_EVENT, schedule);
		list.removeEventListener(REVEAL_END_EVENT, schedule);
		track.style.zIndex = '';
	};
}

/*
 * Progress line, scrubbed with scroll. Horizontal from md, vertical below; matchMedia
 * reverts one version before building the other, so resizing across 768px never leaves
 * two scrubs fighting over the same fill.
 */
function initLine(wrap: HTMLElement, track: HTMLElement, fill: HTMLElement, steps: HTMLElement[]) {
	const mm = gsap.matchMedia();

	mm.add({ horizontal: '(min-width: 48rem)', vertical: '(max-width: 47.98rem)' }, (context) => {
		const horizontal = Boolean(context.conditions?.horizontal);
		const axis = horizontal ? 'scaleX' : 'scaleY';

		// Where each card's node sits along the track (0–1). Layout offsets ignore transforms,
		// so this stays correct even if measured while the cards are still sliding in.
		let stops: number[] = [];
		const measure = () => {
			const length = horizontal ? track.offsetWidth : track.offsetHeight;
			const start = horizontal ? track.offsetLeft : track.offsetTop;
			stops = steps.map((step) => {
				const node = step.querySelector<HTMLElement>('[data-how-node]');
				if (!node || !length) return 0;
				const centre = horizontal
					? step.offsetLeft + step.clientLeft + node.offsetLeft
					: step.offsetTop + step.clientTop + node.offsetTop;
				return (centre - start) / length;
			});
		};

		const setActive = (progress: number) => {
			steps.forEach((step, i) => step.toggleAttribute('data-active', progress > 0 && progress >= stops[i]));
		};

		measure();
		setActive(0);
		gsap.set(fill, { [axis]: 0 });

		gsap.to(fill, {
			[axis]: 1,
			ease: 'none',
			// Follows the scrub's smoothed position, so nodes light exactly as the fill reaches them
			onUpdate() {
				setActive(this.progress());
			},
			scrollTrigger: {
				trigger: wrap,
				// Mobile: start and end on the same viewport line, so the tip tracks the reading position
				start: horizontal ? 'top 75%' : 'top 60%',
				end: horizontal ? 'center 40%' : 'bottom 60%',
				scrub: 0.6,
				onRefresh: measure,
			},
		});

		// Back to the finished state for whichever version runs next
		return () => steps.forEach((step) => step.setAttribute('data-active', ''));
	});
}

/* The checks pop in one by one, the first time the band arrives; never replayed */
function initChecks(band: HTMLElement | undefined) {
	if (!band) return;
	const checks = gsap.utils.toArray<HTMLElement>('[data-how-check]', band);
	if (!checks.length) return;

	gsap.set(checks, { scale: 0 });
	ScrollTrigger.create({
		trigger: band,
		start: 'top 80%',
		once: true,
		onEnter: () => gsap.to(checks, { scale: 1, duration: 0.5, delay: 0.35, ease: 'back.out(2.5)', stagger: 0.1 }),
	});
}
