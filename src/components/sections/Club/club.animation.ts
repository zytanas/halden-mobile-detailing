import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';

// Matches --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
const EASE = 'expo.out';

/** Maximum pointer tilt on each axis, in degrees */
const MAX_TILT = 8;

/** Where the sheen rests off the card, either side (matches metal-sheen's default) */
const SHEEN_START = -30;
const SHEEN_END = 130;

/*
 * The markup ships finished (final values, card flat), which is what reduced motion and
 * no-JS users see. Everything below rewinds it and plays it back.
 */
export function initClub(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	const q = gsap.utils.selector(root);

	// Heading, intro and form. Batched, so on mobile the form waits until it's on screen.
	const reveal = q('[data-club-reveal]');
	gsap.set(reveal, { autoAlpha: 0, y: 24 });
	ScrollTrigger.batch(reveal, {
		start: 'top 88%',
		once: true,
		onEnter: (batch) =>
			gsap.to(batch, {
				autoAlpha: 1,
				y: 0,
				duration: 1,
				ease: EASE,
				stagger: 0.1,
				clearProps: 'transform,opacity,visibility',
			}),
	});

	const stage = q('[data-club-card-stage]')[0] as HTMLElement | undefined;
	const card = q('[data-club-card]')[0] as HTMLElement | undefined;
	if (stage && card) initCard(stage, card);

	initPerks(q('[data-club-perk]') as HTMLElement[]);
}

/* Card rises in, tipped back, and settles flat; then light sweeps across it once */
function initCard(stage: HTMLElement, card: HTMLElement) {
	gsap.set(card, { autoAlpha: 0, y: 56, rotationX: 12, transformOrigin: '50% 100%' });

	ScrollTrigger.create({
		trigger: stage,
		start: 'top 85%',
		once: true,
		onEnter: () => {
			gsap
				.timeline({ onComplete: () => initTilt(stage, card) })
				.to(card, { autoAlpha: 1, y: 0, rotationX: 0, duration: 1.4, ease: EASE })
				.fromTo(
					card,
					{ '--sheen-x': `${SHEEN_START}%` },
					{ '--sheen-x': `${SHEEN_END}%`, duration: 1.4, ease: 'power2.inOut' },
					'-=0.7',
				);
		},
	});
}

/*
 * Pointer devices only: the card turns to face the cursor and the sheen follows it, easing
 * back to flat on leave. Listens on the stage, which never moves, so the hit area stays put
 * while the card tilts. Starts after the entrance so the two never fight over rotation.
 */
function initTilt(stage: HTMLElement, card: HTMLElement) {
	const mm = gsap.matchMedia();

	mm.add('(hover: hover) and (pointer: fine)', () => {
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
			if (event.pointerType !== 'mouse') return;
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

		stage.addEventListener('pointermove', onMove);
		stage.addEventListener('pointerleave', onLeave);

		return () => {
			stage.removeEventListener('pointermove', onMove);
			stage.removeEventListener('pointerleave', onLeave);
			gsap.set(card, { rotationX: 0, rotationY: 0, '--sheen-x': `${SHEEN_END}%` });
		};
	});
}

/* Perks stagger in, and each value counts up as its card lands */
function initPerks(perks: HTMLElement[]) {
	if (!perks.length) return;
	gsap.set(perks, { autoAlpha: 0, y: 32 });

	ScrollTrigger.batch(perks, {
		start: 'top 88%',
		once: true,
		onEnter: (batch) => {
			const tl = gsap.timeline();
			(batch as HTMLElement[]).forEach((perk, i) => {
				const at = i * 0.12;
				tl.to(
					perk,
					{ autoAlpha: 1, y: 0, duration: 1, ease: EASE, clearProps: 'transform,opacity,visibility' },
					at,
				);
				const counter = perk.querySelector<HTMLElement>('[data-count-to]');
				const count = counter && countUp(counter);
				if (count) tl.add(count, at + 0.15);
			});
		},
	});
}

/** Shows zero straight away (before the card fades in) and returns the count-up tween */
function countUp(el: HTMLElement) {
	const target = Number(el.dataset.countTo);
	if (!Number.isFinite(target)) return null;
	const { prefix = '', suffix = '' } = el.dataset;
	const format = (value: number) => `${prefix}${Math.round(value)}${suffix}`;

	// Width is reserved in the markup (PerkCard.astro), so the card never reflows
	const counter = { value: 0 };
	el.textContent = format(0);
	return gsap.to(counter, {
		value: target,
		duration: 1.2,
		ease: 'power3.out',
		onUpdate: () => {
			el.textContent = format(counter.value);
		},
	});
}
