import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';

// Matches --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
const EASE = 'expo.out';

/*
 * The markup ships in its finished state (line drawn, every step active), which is what
 * reduced motion and no-JS users see. Everything below rewinds it and plays it back.
 */
export function initHow(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	const q = gsap.utils.selector(root);
	const wrap = q('[data-how-steps]')[0] as HTMLElement | undefined;
	const track = q('[data-how-track]')[0] as HTMLElement | undefined;
	const fill = q('[data-how-fill]')[0] as HTMLElement | undefined;
	const steps = q('[data-how-step]') as HTMLElement[];
	if (!wrap || !track || !fill || !steps.length) return;

	// Heading and intro
	const intro = q('[data-how-reveal]');
	gsap.set(intro, { autoAlpha: 0, y: 24 });
	ScrollTrigger.create({
		trigger: root,
		start: 'top 80%',
		once: true,
		onEnter: () => gsap.to(intro, { autoAlpha: 1, y: 0, duration: 1, ease: EASE, stagger: 0.1 }),
	});

	// Cards stagger in. The track waits until they've landed: while a card is transformed it
	// becomes a stacking context and the line would briefly paint over its content.
	gsap.set(steps, { autoAlpha: 0, y: 24 });
	gsap.set(track, { autoAlpha: 0 });
	ScrollTrigger.create({
		trigger: wrap,
		start: 'top 85%',
		once: true,
		onEnter: () =>
			gsap.to(steps, {
				autoAlpha: 1,
				y: 0,
				duration: 1,
				ease: EASE,
				stagger: 0.12,
				clearProps: 'transform,opacity,visibility',
				onComplete: () => {
					gsap.to(track, { autoAlpha: 1, duration: 0.4 });
				},
			}),
	});

	initLine(wrap, track, fill, steps);
	initBand(q('[data-how-band]')[0] as HTMLElement | undefined);
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

/* Band slides up, then the checks pop in one by one */
function initBand(band: HTMLElement | undefined) {
	if (!band) return;
	const checks = gsap.utils.toArray<HTMLElement>('[data-how-check]', band);

	gsap.set(band, { autoAlpha: 0, y: 40 });
	gsap.set(checks, { scale: 0 });

	ScrollTrigger.create({
		trigger: band,
		start: 'top 88%',
		once: true,
		onEnter: () => {
			gsap
				.timeline()
				.to(band, { autoAlpha: 1, y: 0, duration: 1, ease: EASE, clearProps: 'transform,opacity,visibility' })
				.to(checks, { scale: 1, duration: 0.5, ease: 'back.out(2.5)', stagger: 0.1 }, '-=0.6');
		},
	});
}
