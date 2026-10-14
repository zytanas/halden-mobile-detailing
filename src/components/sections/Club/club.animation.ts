import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';
import { onMotion, type Motion } from '../../../lib/media';

/** Maximum pointer tilt on each axis, in degrees */
const MAX_TILT = 8;

/** Where the sheen rests off the card, either side (matches metal-sheen's default) */
const SHEEN_START = -30;
const SHEEN_END = 130;

/*
 * The markup ships finished (final values, card flat), which is what reduced motion and
 * no-JS users see. Entrances come from lib/reveal.ts (data-reveal in the markup); this adds
 * the member card turning in with the scroll, its pointer tilt, and the perk counters.
 */
export function initClub(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	const q = gsap.utils.selector(root);
	const stage = q('[data-club-card-stage]')[0] as HTMLElement | undefined;
	const turn = q('[data-club-card-scroll]')[0] as HTMLElement | undefined;
	const card = q('[data-club-card]')[0] as HTMLElement | undefined;
	if (stage && turn && card) initCard(stage, turn, card);

	initCounters(q('[data-club-perk]') as HTMLElement[]);
}

/*
 * The card turns in from an angle as the section scrolls into view, scrubbed so it turns
 * away again on the way back up. Once it's flat ("settled"), light sweeps across it (the
 * first time only) and the pointer tilt takes over (desktop only).
 */
function initCard(stage: HTMLElement, turn: HTMLElement, card: HTMLElement) {
	let settled = false;
	let swept = false;
	const tilt = initTilt(stage, card, () => settled);

	onMotion((m: Motion) => {
		const a = m.amount;
		const tl = gsap.timeline({
			scrollTrigger: {
				trigger: stage,
				start: 'top bottom',
				end: 'center 55%',
				scrub: 0.6,
				onToggle: (self) => gsap.set(turn, { willChange: self.isActive ? 'transform, opacity' : 'auto' }),
				onLeave: () => {
					settled = true;
					if (!swept) {
						swept = true;
						gsap.fromTo(
							card,
							{ '--sheen-x': `${SHEEN_START}%` },
							{ '--sheen-x': `${SHEEN_END}%`, duration: 1.4, ease: 'power2.inOut' },
						);
					}
				},
				onEnterBack: () => {
					settled = false;
					tilt.flatten();
				},
			},
		});

		tl.fromTo(
			turn,
			{ rotationY: -18 * a, rotationX: 10 * a, y: 48 * a },
			{ rotationY: 0, rotationX: 0, y: 0, ease: 'power2.out', duration: 1 },
			0,
		).fromTo(turn, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.35 }, 0);

		return () => {
			settled = false;
			tilt.flatten();
		};
	});
}

/*
 * Pointer devices on desktop only: the card turns to face the cursor and the sheen follows
 * it, easing back to flat on leave. Listens on the stage, whose hit area stays put while the
 * card tilts. Ignored until the scroll turn has settled, so the two never fight.
 */
function initTilt(stage: HTMLElement, card: HTMLElement, isSettled: () => boolean) {
	let flatten = () => {};

	gsap.matchMedia().add('(min-width: 64rem) and (hover: hover) and (pointer: fine)', () => {
		const ease = { duration: 0.7, ease: 'power3.out' };
		const tiltX = gsap.quickTo(card, 'rotationX', ease);
		const tiltY = gsap.quickTo(card, 'rotationY', ease);

		// The sheen is a CSS variable with a % unit, so tween a plain number and write it out
		const sheen = { x: SHEEN_END };
		const sheenTo = gsap.quickTo(sheen, 'x', {
			...ease,
			onUpdate: () => card.style.setProperty('--sheen-x', `${sheen.x}%`),
		});

		let lastX = 0.5;

		const onMove = (event: PointerEvent) => {
			if (event.pointerType !== 'mouse' || !isSettled()) return;
			const box = stage.getBoundingClientRect();
			const x = gsap.utils.clamp(0, 1, (event.clientX - box.left) / box.width);
			const y = gsap.utils.clamp(0, 1, (event.clientY - box.top) / box.height);
			lastX = x;
			// Positive rotationY pushes the right edge away, so the card faces the cursor
			tiltY((x - 0.5) * 2 * MAX_TILT);
			tiltX((0.5 - y) * 2 * MAX_TILT);
			sheenTo(gsap.utils.interpolate(-10, 110, x));
		};

		// Flatten, and let the light slide off whichever side the pointer left by
		const onLeave = () => {
			tiltX(0);
			tiltY(0);
			sheenTo(lastX < 0.5 ? SHEEN_START : SHEEN_END);
		};
		flatten = onLeave;

		stage.addEventListener('pointermove', onMove);
		stage.addEventListener('pointerleave', onLeave);

		return () => {
			flatten = () => {};
			stage.removeEventListener('pointermove', onMove);
			stage.removeEventListener('pointerleave', onLeave);
			gsap.set(card, { rotationX: 0, rotationY: 0, '--sheen-x': `${SHEEN_END}%` });
		};
	});

	return { flatten: () => flatten() };
}

/* Values start at zero and count up the first time their card arrives; never replayed */
function initCounters(perks: HTMLElement[]) {
	const counters = perks.flatMap((perk) => {
		const el = perk.querySelector<HTMLElement>('[data-count-to]');
		const target = Number(el?.dataset.countTo);
		if (!el || !Number.isFinite(target)) return [];
		const { prefix = '', suffix = '' } = el.dataset;
		const format = (value: number) => `${prefix}${Math.round(value)}${suffix}`;
		// Width is reserved in the markup (PerkCard.astro), so the card never reflows
		el.textContent = format(0);
		return [{ perk, el, target, format }];
	});
	// In step with the cards' staggered reveal (one row on tablet and desktop)
	counters.forEach(({ perk, el, target, format }, i) => {
		ScrollTrigger.create({
			trigger: perk,
			start: 'top 88%',
			once: true,
			onEnter: () => {
				const value = { n: 0 };
				gsap.to(value, {
					n: target,
					duration: 1.2,
					delay: 0.25 + i * 0.12,
					ease: 'power3.out',
					onUpdate: () => {
						el.textContent = format(value.n);
					},
				});
			},
		});
	});
}
