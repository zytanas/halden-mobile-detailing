import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';
import { formatStat } from '../../../content/results';

// Matches --ease-out: cubic-bezier(0.16, 1, 0.3, 1)
const EASE = 'expo.out';

/** Seconds for one full loop of a marquee row */
const LOOP = 40;

/** Keep a focused card this far inside the row's edges, clear of the fade (--reviews-fade is 4rem) */
const SAFE_EDGE = 80;

const HIDDEN = 'inset(0% 100% 0% 0%)';
const SHOWN = 'inset(0% 0% 0% 0%)';

/*
 * The markup ships finished (final values, static list), which is what reduced motion and
 * no-JS users see. Everything below rewinds it and plays it back, and swaps the list for
 * the marquee where there's room for it.
 */
export function initReviews(root: HTMLElement) {
	const mm = gsap.matchMedia();
	mm.add(
		{ wide: '(min-width: 48rem)', motion: '(prefers-reduced-motion: no-preference)' },
		(context) => {
			const { wide, motion } = context.conditions ?? {};
			if (!motion) return;
			return wide ? initMarquee(root) : revealList(root);
		},
	);

	if (prefersReducedMotion()) return;

	const q = gsap.utils.selector(root);

	const heading = q('[data-reviews-reveal]');
	gsap.set(heading, { autoAlpha: 0, y: 24 });
	ScrollTrigger.create({
		trigger: root,
		start: 'top 80%',
		once: true,
		onEnter: () => gsap.to(heading, { autoAlpha: 1, y: 0, duration: 1, ease: EASE }),
	});

	const summary = q('[data-reviews-summary]')[0] as HTMLElement | undefined;
	if (summary) initSummary(summary);
}

/*
 * Panel rises in with a sweep of light; the score counts up, the stars fill left to right
 * and the bars grow. Opacity rather than autoAlpha, so the button stays in the tab order.
 */
function initSummary(panel: HTMLElement) {
	const score = panel.querySelector<HTMLElement>('[data-count-to]');
	const fill = panel.querySelector<HTMLElement>('[data-stars-fill]');
	const bars = gsap.utils.toArray<HTMLElement>('[data-reviews-bar]', panel);

	gsap.set(panel, { opacity: 0, y: 40 });

	ScrollTrigger.create({
		trigger: panel,
		start: 'top 85%',
		once: true,
		onEnter: () => {
			const tl = gsap.timeline();
			tl.to(panel, { opacity: 1, y: 0, duration: 1, ease: EASE, clearProps: 'transform,opacity' }).fromTo(
				panel,
				{ '--sheen-x': '-30%' },
				{ '--sheen-x': '130%', duration: 1.4, ease: 'power2.inOut' },
				0.2,
			);
			if (score) tl.add(countUp(score), 0.2);
			if (fill) {
				tl.fromTo(
					fill,
					{ clipPath: HIDDEN },
					{ clipPath: SHOWN, duration: 1.3, ease: 'power2.inOut', clearProps: 'clipPath' },
					0.25,
				);
			}
			if (bars.length) {
				tl.fromTo(
					bars,
					{ clipPath: HIDDEN },
					{ clipPath: SHOWN, duration: 1, ease: 'power3.out', stagger: 0.08, clearProps: 'clipPath' },
					0.4,
				);
			}
		},
	});
}

/** Shows zero straight away (the panel is still transparent) and returns the count-up tween */
function countUp(el: HTMLElement) {
	const target = Number(el.dataset.countTo);
	const decimals = Number(el.dataset.decimals) || 0;
	// Width is reserved in the markup (RatingSummary.astro), so no measuring here
	const counter = { value: 0 };
	el.textContent = formatStat(0, decimals);
	return gsap.to(counter, {
		value: target,
		duration: 1.4,
		ease: 'power3.out',
		onUpdate: () => {
			el.textContent = formatStat(counter.value, decimals);
		},
	});
}

/* Mobile swipe row: a simple fade up */
function revealList(root: HTMLElement) {
	const list = root.querySelector<HTMLElement>('[data-reviews-list]');
	if (!list) return;
	gsap.set(list, { opacity: 0, y: 32 });
	ScrollTrigger.create({
		trigger: list,
		start: 'top 90%',
		once: true,
		onEnter: () => gsap.to(list, { opacity: 1, y: 0, duration: 1, ease: EASE, clearProps: 'transform,opacity' }),
	});
}

interface Row {
	el: HTMLElement;
	track: HTMLElement;
	reverse: boolean;
	tween: gsap.core.Tween;
	hovered: boolean;
	focused: boolean;
}

/** One loop is one set of cards: a third of the track (repeat, original, repeat) */
const SET = 100 / 3;

/*
 * Two rows looping in opposite directions. Each track holds its cards three times; the loop
 * slides it by one set (a third of its width), so the end frame matches the start exactly.
 *
 * A row moves only when the whole section has entered, it's on screen, the visitor hasn't
 * paused it, and nobody is hovering it or focused inside it. Speed changes ease through
 * timeScale, so rows glide to a stop instead of freezing.
 *
 * Returns a cleanup for gsap.matchMedia (tweens and triggers made here are reverted by it).
 */
function initMarquee(root: HTMLElement) {
	const marquee = root.querySelector<HTMLElement>('[data-reviews-marquee]');
	const toggle = root.querySelector<HTMLButtonElement>('[data-reviews-toggle]');
	if (!marquee || !toggle) return;

	// Swap the static list for the marquee before anything is measured
	root.dataset.marquee = 'on';

	const rows: Row[] = gsap.utils.toArray<HTMLElement>('[data-reviews-row]', marquee).flatMap((el) => {
		const track = el.querySelector<HTMLElement>('[data-reviews-track]');
		if (!track) return [];
		const reverse = el.dataset.direction === 'right';
		// Starts with the original set in view, at -1 set
		const tween = gsap.fromTo(
			track,
			{ xPercent: reverse ? -2 * SET : -SET },
			{ xPercent: reverse ? -SET : -2 * SET, duration: LOOP, ease: 'none', repeat: -1 },
		);
		tween.timeScale(0);
		return [{ el, track, reverse, tween, hovered: false, focused: false }];
	});

	let started = false;
	let inView = false;
	let userPaused = false;

	const update = (row: Row) => {
		const moving = started && inView && !userPaused && !row.hovered && !row.focused;
		gsap.to(row.tween, { timeScale: moving ? 1 : 0, duration: 0.6, ease: 'power2.out', overwrite: true });
	};
	const updateAll = () => rows.forEach(update);

	// Rows fade in, then start moving. Opacity only, so the cards stay focusable meanwhile.
	const rowEls = rows.map((row) => row.el);
	gsap.set(rowEls, { opacity: 0, y: 24 });
	let entrance: gsap.core.Tween | undefined;
	const reveal = () => {
		entrance ??= gsap.to(rowEls, {
			opacity: 1,
			y: 0,
			duration: 1,
			ease: EASE,
			stagger: 0.12,
			clearProps: 'transform,opacity',
			onComplete: () => {
				started = true;
				updateAll();
			},
		});
		return entrance;
	};

	ScrollTrigger.create({ trigger: marquee, start: 'top 85%', once: true, onEnter: reveal });

	// Don't spend frames on rows nobody can see
	ScrollTrigger.create({
		trigger: marquee,
		start: 'top bottom',
		end: 'bottom top',
		onToggle: (self) => {
			inView = self.isActive;
			updateAll();
		},
	});

	const cleanups: Array<() => void> = [];
	const listen = <K extends keyof HTMLElementEventMap>(
		target: HTMLElement,
		type: K,
		handler: (event: HTMLElementEventMap[K]) => void,
	) => {
		target.addEventListener(type, handler);
		cleanups.push(() => target.removeEventListener(type, handler));
	};

	rows.forEach((row) => {
		// Mouse only: touch has no "leave", so a tapped row would stay paused
		listen(row.el, 'pointerenter', (event) => {
			if (event.pointerType !== 'mouse') return;
			row.hovered = true;
			update(row);
		});
		listen(row.el, 'pointerleave', (event) => {
			if (event.pointerType !== 'mouse') return;
			row.hovered = false;
			update(row);
		});

		listen(row.el, 'focusin', (event) => {
			// Tabbing in before the entrance has played: finish it so nothing is invisible
			reveal().progress(1);
			row.focused = true;
			update(row);
			if (event.target instanceof HTMLElement) bringIntoView(row, event.target);
		});
		listen(row.el, 'focusout', (event) => {
			if (event.relatedTarget instanceof Node && row.el.contains(event.relatedTarget)) return;
			row.focused = false;
			foldNudge(row);
			update(row);
		});
	});

	listen(toggle, 'click', () => {
		userPaused = !userPaused;
		toggle.toggleAttribute('data-paused', userPaused);
		toggle.setAttribute('aria-label', (userPaused ? toggle.dataset.labelPlay : toggle.dataset.labelPause) ?? '');
		updateAll();
	});

	return () => {
		cleanups.forEach((cleanup) => cleanup());
		// Focus nudges start after setup, so matchMedia doesn't know to revert them
		rows.forEach((row) => {
			gsap.killTweensOf(row.track, 'x');
			gsap.set(row.track, { x: 0 });
		});
		delete root.dataset.marquee;
		toggle.removeAttribute('data-paused');
		toggle.setAttribute('aria-label', toggle.dataset.labelPause ?? '');
	};
}

/*
 * A card focused near (or past) either edge slides fully into view. The rows clip overflow
 * rather than scrolling, so the browser can't do this itself. The nudge is a pixel x offset
 * on top of the loop's xPercent: it mustn't wrap, or the repeat would slide into view instead
 * of the focused original. The repeat either side keeps the row filled wherever it lands.
 */
function bringIntoView(row: Row, card: HTMLElement) {
	const bounds = row.el.getBoundingClientRect();
	const box = card.getBoundingClientRect();
	const left = bounds.left + SAFE_EDGE;
	const right = bounds.right - SAFE_EDGE;

	// Pixels the track needs to move left (negative: right)
	let shift = 0;
	if (box.right > right) shift = box.right - right;
	else if (box.left < left) shift = box.left - left;
	if (!shift) return;

	const x = Number(gsap.getProperty(row.track, 'x'));
	gsap.to(row.track, { x: x - shift, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
}

/*
 * Once focus leaves, hand the nudge back to the loop: clear the x offset and move the loop's
 * progress by the same distance. Sets of cards are identical, so nothing visibly moves.
 */
function foldNudge(row: Row) {
	gsap.killTweensOf(row.track, 'x');
	const x = Number(gsap.getProperty(row.track, 'x'));
	if (!x) return;
	const setWidth = row.track.offsetWidth / 3;
	// Forward rows move left as progress grows, reverse rows move right
	const delta = (-x / setWidth) * (row.reverse ? -1 : 1);
	gsap.set(row.track, { x: 0 });
	row.tween.progress(gsap.utils.wrap(0, 1, row.tween.progress() + delta));
}
