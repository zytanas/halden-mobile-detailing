/**
 * Direction-aware reveals, opted into from markup:
 *
 *   data-reveal="up" (default) | "left" | "right" | "scale" | "clip" | "lines" | "stagger"
 *   data-reveal-delay="0.1"      seconds before the reveal starts
 *   data-reveal-stagger="0.08"   "stagger" only: seconds between items
 *
 * "stagger" animates the element's direct children, or its [data-reveal-item] descendants
 * when it has any (for groups whose items are nested, like the quote builder's steps).
 *
 * Motion follows the scroll: scrolling down, elements rise into place from below; scrolling
 * back up past one, it sinks away again; scrolling up into one from above, it drops into
 * place from above. Elements leaving the top of the screen stay put until they're fully off
 * it, then wait above, out of sight, so there's never a flicker at the top edge.
 *
 * Content is visible without JavaScript: BaseLayout adds html.js, and global.css only hides
 * [data-reveal] content until this script has taken over (html.reveal-ready).
 */
import { gsap, ScrollTrigger, SplitText } from './gsap';
import { REVEAL_END_EVENT, REVEAL_START_EVENT } from './events';
import { EASE_OUT, domReady, fontsSettled, onMotion, type Motion } from './media';

/** Where a hidden element waits: below the screen (not reached yet) or above it (scrolled past) */
type Side = 'below' | 'above';
type State = Side | 'shown';

type SingleVariant = 'up' | 'left' | 'right' | 'scale' | 'clip';

interface Look {
	hidden: (side: Side) => gsap.TweenVars;
	shown: gsap.TweenVars;
	/** Inline styles to drop once shown, handing the element back to its own CSS */
	clear: string;
}

interface Run {
	/** Receives the start and end events */
	emitter: HTMLElement;
	shown: boolean;
	duration: number;
	ease: string;
	delay?: number;
	stagger?: gsap.TweenVars['stagger'];
	clear?: string;
	/** Only clear targets that pass (default: all) */
	clearIf?: (target: Element) => boolean;
}

const READY_CLASS = 'reveal-ready';

/** Reveal once the top is 88% down the screen. clamp() lets items at the very end of the page still get there. */
const START = 'clamp(top 88%)';
/** Fully off the top of the screen */
const END = 'bottom top';

const CLIP_SHOWN = 'inset(0% 0% 0% 0%)';
const STAGGER = 0.08;
/** Items crossing the line within this many ms of each other reveal as one staggered batch */
const BATCH_MS = 100;
const LINE_STAGGER = 0.08;
/** Sinking away (scrolling back up past an element) is quicker than arriving */
const HIDE_RATIO = 0.6;
const HIDE_EASE = 'power2.out';

function looks(m: Motion): Record<SingleVariant, Look> {
	const y = (side: Side) => (side === 'below' ? m.distance : -m.distance);
	const fade = 'opacity,transform';
	return {
		up: { hidden: (side) => ({ opacity: 0, y: y(side) }), shown: { opacity: 1, y: 0 }, clear: fade },
		left: { hidden: () => ({ opacity: 0, x: -m.slide }), shown: { opacity: 1, x: 0 }, clear: fade },
		right: { hidden: () => ({ opacity: 0, x: m.slide }), shown: { opacity: 1, x: 0 }, clear: fade },
		scale: {
			hidden: (side) => ({ opacity: 0, scale: 0.94, y: y(side) / 2 }),
			shown: { opacity: 1, scale: 1, y: 0 },
			clear: fade,
		},
		// Opens from the bottom edge when arriving from below, from the top edge when arriving from above
		clip: {
			hidden: (side) => ({ clipPath: side === 'below' ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)' }),
			shown: { clipPath: CLIP_SHOWN },
			clear: 'clipPath',
		},
	};
}

export async function initReveal() {
	// Every section script has run (the FAQ rebuilds its items), and headings split against final fonts
	await domReady();
	await fontsSettled();

	onMotion((m) => {
		const managed: Element[] = [];
		const cleanups: Array<() => void> = [];
		const variants = looks(m);

		for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal]')) {
			const variant = el.dataset.reveal || 'up';
			const delay = Number(el.dataset.revealDelay) || 0;

			if (variant === 'stagger') managed.push(...revealGroup(el, variants.up, m, delay, cleanups));
			else if (variant === 'lines') cleanups.push(revealLines(el, m, delay));
			else managed.push(revealSingle(el, variants[variant as SingleVariant] ?? variants.up, m, delay));
		}

		// Breakpoint change or reduced motion switched on: back to plain, visible markup
		return () => {
			gsap.killTweensOf(managed);
			gsap.set(managed, { clearProps: 'opacity,transform,clipPath,willChange' });
			cleanups.forEach((cleanup) => cleanup());
		};
	});

	document.documentElement.classList.add(READY_CLASS);
}

/* ---------- Variants ---------- */

/*
 * Every reveal works the same way: ScrollTrigger callbacks only say "something changed".
 * Each target then takes the state its trigger is in right now (before the line: below;
 * on screen: shown; past the top: above) and animates only if that differs from where it
 * last settled. Batched callbacks fire on separate timers, so their order can't be trusted
 * near the line, and none fire while the page is re-measured (onRefresh catches up); reading
 * the live state instead means nothing can end up hidden on screen.
 */

type Sync = (pairs: Array<[Element, ScrollTrigger]>, direction: number) => void;

const stateOf = (st: ScrollTrigger): State => (st.isActive ? 'shown' : st.progress >= 1 ? 'above' : 'below');

function revealSingle(el: HTMLElement, look: Look, m: Motion, delay: number) {
	const sync = controller([el], el, look, m, delay);
	const update = (self: ScrollTrigger) => sync([[el, self]], self.direction);

	ScrollTrigger.create({
		trigger: triggerFor(el),
		start: START,
		end: END,
		onEnter: update,
		onEnterBack: update,
		onLeave: update,
		onLeaveBack: update,
		// Callbacks are muted while ScrollTrigger re-measures; catch up on whatever changed
		onRefresh: update,
	});

	return el;
}

/** Children rise in one after another, in reading order (reversed when arriving from above) */
function revealGroup(el: HTMLElement, look: Look, m: Motion, delay: number, cleanups: Array<() => void>) {
	const marked = gsap.utils.toArray<HTMLElement>('[data-reveal-item]', el);
	const items = marked.length ? marked : ([...el.children] as HTMLElement[]);
	const each = Number(el.dataset.revealStagger) || STAGGER;
	const sync = controller(items, el, look, m, delay, each);

	/*
	 * Items crossing the line together (a row of cards) animate as one staggered batch.
	 * Batched here rather than with ScrollTrigger.batch, whose queue stops for good if its
	 * timer is ever interrupted, leaving a whole group hidden.
	 */
	const pending = new Map<Element, ScrollTrigger>();
	let timer = 0;
	const flush = () => {
		timer = 0;
		const pairs = [...pending];
		pending.clear();
		sync(pairs, pairs[pairs.length - 1]?.[1].direction ?? 1);
	};
	const update = (self: ScrollTrigger) => {
		pending.set(self.trigger as Element, self);
		timer ||= window.setTimeout(flush, BATCH_MS);
	};

	for (const item of items) {
		ScrollTrigger.create({
			trigger: item,
			start: START,
			end: END,
			onEnter: update,
			onEnterBack: update,
			onLeave: update,
			onLeaveBack: update,
			// Callbacks are muted while ScrollTrigger re-measures; catch up on whatever changed
			onRefresh: update,
		});
	}

	cleanups.push(() => window.clearTimeout(timer));
	return items;
}

function controller(items: Element[], emitter: HTMLElement, look: Look, m: Motion, delay: number, stagger?: number): Sync {
	const states = new Map<Element, State>(items.map((item) => [item, 'below']));
	const isShown = (target: Element) => states.get(target) === 'shown';
	gsap.set(items, look.hidden('below'));

	return (pairs, direction) => {
		const show: Element[] = [];
		const sink: Element[] = [];
		const park: Element[] = [];
		const drop: Element[] = [];

		for (const [item, st] of pairs) {
			const prev = states.get(item);
			const next = stateOf(st);
			if (next === prev) continue;
			states.set(item, next);
			if (next === 'shown') show.push(item);
			else if (next === 'above') park.push(item);
			else if (prev === 'shown') sink.push(item);
			// Above to below in one jump: out of sight the whole way
			else drop.push(item);
		}

		if (show.length) {
			const ordered = byPosition(show);
			if (direction < 0) ordered.reverse();
			animate(ordered, look.shown, {
				emitter,
				shown: true,
				clear: look.clear,
				clearIf: isShown,
				duration: m.duration,
				ease: EASE_OUT,
				delay,
				stagger,
			});
		}

		// Sink back down out of view (scrolling up past it). Settled elements had their inline
		// styles cleared, so write the shown values back first: clip-path can't tween from "none".
		if (sink.length) {
			const idle = sink.filter((target) => !gsap.isTweening(target));
			if (idle.length) gsap.set(idle, look.shown);
			animate(sink, look.hidden('below'), {
				emitter,
				shown: false,
				duration: m.duration * HIDE_RATIO,
				ease: HIDE_EASE,
			});
		}

		// Fully off the top of the screen: wait above, invisibly, ready to drop back in
		if (park.length) {
			gsap.set(park, { ...look.hidden('above'), overwrite: true, clearProps: 'willChange' });
			emit(emitter, REVEAL_END_EVENT, false);
		}
		if (drop.length) gsap.set(drop, { ...look.hidden('below'), overwrite: true, clearProps: 'willChange' });
	};
}

/** Each line slides up (or down) out of its own mask. Re-splits on resize, keeping the current state. */
function revealLines(el: HTMLElement, m: Motion, delay: number) {
	const offset: Record<State, number> = { below: 110, above: -110, shown: 0 };
	let state: State = 'below';
	let lines: Element[] = [];

	const split = SplitText.create(el, {
		type: 'lines',
		mask: 'lines',
		linesClass: 'reveal-line',
		autoSplit: true,
		onSplit: (self) => {
			lines = self.lines;
			gsap.set(lines, { yPercent: offset[state] });
		},
	});

	const update = (self: ScrollTrigger) => {
		const prev = state;
		const next = stateOf(self);
		if (next === prev) return;
		state = next;

		if (next === 'shown') {
			animate(lines, { yPercent: 0 }, {
				emitter: el,
				shown: true,
				duration: m.duration,
				ease: EASE_OUT,
				delay,
				// Top line first on the way down, bottom line first on the way up
				stagger: { each: LINE_STAGGER, from: self.direction < 0 ? 'end' : 'start' },
			});
		} else if (next === 'below' && prev === 'shown') {
			animate(lines, { yPercent: offset.below }, {
				emitter: el,
				shown: false,
				duration: m.duration * HIDE_RATIO,
				ease: HIDE_EASE,
				stagger: { each: LINE_STAGGER / 2, from: 'end' },
			});
		} else {
			gsap.set(lines, { yPercent: offset[next], overwrite: true, clearProps: 'willChange' });
		}
	};

	ScrollTrigger.create({
		trigger: triggerFor(el),
		start: START,
		end: END,
		onEnter: update,
		onEnterBack: update,
		onLeave: update,
		onLeaveBack: update,
		// Callbacks are muted while ScrollTrigger re-measures; catch up on whatever changed
		onRefresh: update,
	});

	return () => {
		gsap.killTweensOf(lines);
		split.revert();
	};
}

/* ---------- Shared ---------- */

function animate(targets: Element[], vars: gsap.TweenVars, run: Run) {
	if (!targets.length) return;
	gsap.to(targets, {
		...vars,
		duration: run.duration,
		ease: run.ease,
		delay: run.delay ?? 0,
		stagger: run.stagger,
		overwrite: 'auto',
		// will-change only while moving, so idle elements don't hold on to compositor layers
		onStart: () => {
			gsap.set(targets, { willChange: 'transform, opacity' });
			emit(run.emitter, REVEAL_START_EVENT, run.shown);
		},
		onComplete: () => settle(targets, run, true),
		onInterrupt: () => settle(targets, run, false),
	});
}

/*
 * Drop will-change, and once shown, the inline styles too, handing elements back to their
 * own CSS. A tween can outlive some of its targets (one parked meanwhile), so only clear
 * the ones still meant to be shown.
 */
function settle(targets: Element[], run: Run, complete: boolean) {
	gsap.set(targets, { clearProps: 'willChange' });
	const clearable = complete && run.clear ? targets.filter((target) => run.clearIf?.(target) ?? true) : [];
	if (clearable.length) gsap.set(clearable, { clearProps: run.clear });
	emit(run.emitter, REVEAL_END_EVENT, run.shown);
}

function emit(el: HTMLElement, type: typeof REVEAL_START_EVENT | typeof REVEAL_END_EVENT, shown: boolean) {
	el.dispatchEvent(new CustomEvent(type, { bubbles: true, detail: { shown } }));
}

/**
 * Inside a position: sticky element, positions measured at refresh depend on how far it has
 * stuck, so measure from the sticky element's container instead, which scrolls normally.
 */
function triggerFor(el: HTMLElement): HTMLElement {
	for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
		if (getComputedStyle(node).position === 'sticky') return node.parentElement ?? el;
	}
	return el;
}

/** Visual reading order (row, then column), which can differ from DOM order in grids */
function byPosition(elements: Element[]) {
	return elements
		.map((el) => ({ el, box: el.getBoundingClientRect() }))
		.sort((a, b) => Math.round(a.box.top - b.box.top) || a.box.left - b.box.left)
		.map(({ el }) => el);
}
