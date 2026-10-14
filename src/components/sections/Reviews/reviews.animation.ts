import { gsap, ScrollTrigger } from '../../../lib/gsap';
import { prefersReducedMotion } from '../../../lib/motion';
import { formatStat } from '../../../content/results';

/** Seconds for one full loop of a marquee row */
const LOOP = 40;

/** Keep a focused card this far inside the row's edges, clear of the fade (--reviews-fade is 4rem) */
const SAFE_EDGE = 80;

/** Most extra speed scrolling can add, as a multiple of the normal speed */
const MAX_BOOST = 3;

/** Most the cards lean with scroll speed, in degrees */
const MAX_LEAN = 2;

const HIDDEN = 'inset(0% 100% 0% 0%)';
const SHOWN = 'inset(0% 0% 0% 0%)';

/*
 * The markup ships finished (final values, static list), which is what reduced motion and
 * no-JS users see. Entrances come from lib/reveal.ts (data-reveal in the markup); this adds
 * the summary's one-time count-up, and swaps the list for the marquee where there's room.
 */
export function initReviews(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	// Mobile keeps the swipe row (revealed by lib/reveal.ts); md and up get the marquee
	gsap.matchMedia().add('(min-width: 48rem) and (prefers-reduced-motion: no-preference)', () => initMarquee(root));

	const summary = root.querySelector<HTMLElement>('[data-reviews-summary]');
	if (summary) initSummary(summary);
}

/*
 * Once the panel has arrived (lib/reveal.ts scales it in): a sweep of light, the score counts
 * up, the stars fill left to right and the bars grow. Plays once; never replays on scroll.
 */
function initSummary(panel: HTMLElement) {
	const score = panel.querySelector<HTMLElement>('[data-count-to]');
	const fill = panel.querySelector<HTMLElement>('[data-stars-fill]');
	const bars = gsap.utils.toArray<HTMLElement>('[data-reviews-bar]', panel);
	const decimals = Number(score?.dataset.decimals) || 0;

	// Start empty; the panel is still hidden by its reveal at this point
	if (score) score.textContent = formatStat(0, decimals);
	if (fill) gsap.set(fill, { clipPath: HIDDEN });
	if (bars.length) gsap.set(bars, { clipPath: HIDDEN });

	ScrollTrigger.create({
		// The panel is sticky on desktop, so measure from its container, which scrolls normally
		trigger: panel.parentElement ?? panel,
		start: 'top 80%',
		once: true,
		onEnter: () => {
			const tl = gsap.timeline({ delay: 0.3 });
			tl.fromTo(panel, { '--sheen-x': '-30%' }, { '--sheen-x': '130%', duration: 1.4, ease: 'power2.inOut' }, 0);
			if (score) tl.add(countUp(score, decimals), 0);
			if (fill) tl.to(fill, { clipPath: SHOWN, duration: 1.3, ease: 'power2.inOut', clearProps: 'clipPath' }, 0.05);
			if (bars.length) {
				tl.to(bars, { clipPath: SHOWN, duration: 1, ease: 'power3.out', stagger: 0.08, clearProps: 'clipPath' }, 0.2);
			}
		},
	});
}

function countUp(el: HTMLElement, decimals: number) {
	const target = Number(el.dataset.countTo);
	// Width is reserved in the markup (RatingSummary.astro), so no measuring here
	const counter = { value: 0 };
	return gsap.to(counter, {
		value: target,
		duration: 1.4,
		ease: 'power3.out',
		onUpdate: () => {
			el.textContent = formatStat(counter.value, decimals);
		},
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
 * A row moves only once the marquee has arrived, while it's on screen, the visitor hasn't
 * paused it, and nobody is hovering it or focused inside it. Speed changes ease through
 * timeScale, so rows glide to a stop instead of freezing.
 *
 * Scrolling pushes the rows along: faster with scroll speed, and scrolling up runs them
 * backwards, until scrolling stops and they ease back to their normal speed and direction.
 * The cards lean slightly with the speed.
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
		// Far into the loop, so running backwards (scrolling up) never reaches its start
		tween.totalTime(LOOP * 1000);
		tween.timeScale(0);
		return [{ el, track, reverse, tween, hovered: false, focused: false }];
	});

	let started = false;
	let inView = false;
	let userPaused = false;
	/** Scroll push: 1 = forwards, -1 = backwards (scrolling up); boost adds speed */
	let direction = 1;
	let boost = 0;

	const update = (row: Row) => {
		const moving = started && inView && !userPaused && !row.hovered && !row.focused;
		const speed = moving ? direction * (1 + boost) : 0;
		gsap.to(row.tween, { timeScale: speed, duration: 0.6, ease: 'power2.out', overwrite: true });
	};
	const updateAll = () => rows.forEach(update);

	// Start moving shortly after the rows have begun their reveal (lib/reveal.ts)
	const start = () => {
		if (started) return;
		started = true;
		updateAll();
	};
	ScrollTrigger.create({ trigger: marquee, start: 'top 85%', once: true, onEnter: () => gsap.delayedCall(0.4, start) });

	const lean = rows.map((row) => gsap.quickTo(row.track, 'skewX', { duration: 0.5, ease: 'power3.out' }));
	let settle: gsap.core.Tween | undefined;

	// Don't spend frames on rows nobody can see; while they're in view, follow the scroll
	ScrollTrigger.create({
		trigger: marquee,
		start: 'top bottom',
		end: 'bottom top',
		onToggle: (self) => {
			inView = self.isActive;
			updateAll();
		},
		onUpdate: (self) => {
			const velocity = self.getVelocity();
			direction = self.direction;
			boost = gsap.utils.clamp(0, MAX_BOOST, Math.abs(velocity) / 600);
			updateAll();
			const angle = userPaused ? 0 : gsap.utils.clamp(-MAX_LEAN, MAX_LEAN, -velocity / 400);
			lean.forEach((to) => to(angle));

			// Scrolling has stopped: back to normal speed and direction, upright
			settle?.kill();
			settle = gsap.delayedCall(0.15, () => {
				direction = 1;
				boost = 0;
				updateAll();
				lean.forEach((to) => to(0));
			});
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
		settle?.kill();
		// Focus nudges and the scroll lean start after setup, so matchMedia doesn't know to revert them
		rows.forEach((row) => {
			gsap.killTweensOf(row.track, 'x,skewX');
			gsap.set(row.track, { x: 0, skewX: 0 });
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
