/**
 * Smooth scrolling. Lenis eases wheel scrolling (touch stays native) and is driven from GSAP's
 * ticker, so ScrollTrigger and Lenis update in the same frame. In-page links go through
 * scrollToHash, which uses Lenis when it's running and the browser's own jump otherwise.
 * With reduced motion Lenis never starts.
 */
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap, ScrollTrigger } from './gsap';
import { MENU_TOGGLE_EVENT } from './events';
import { prefersReducedMotion } from './motion';

/** Gap kept between the navbar and a target without its own scroll-margin-top */
const NAV_GAP = 16;

let lenis: Lenis | null = null;
let initialised = false;
let menuOpen = false;

const raf = (time: number) => lenis?.raf(time * 1000);

function startLenis() {
	if (lenis || prefersReducedMotion()) return;
	lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: false });
	lenis.on('scroll', ScrollTrigger.update);
	gsap.ticker.add(raf);
	if (menuOpen) lenis.stop();
}

function stopLenis() {
	if (!lenis) return;
	gsap.ticker.remove(raf);
	lenis.destroy();
	lenis = null;
}

export function initScroll() {
	if (initialised) return;
	initialised = true;

	// Mobile address bars resizing the viewport shouldn't re-measure every trigger mid-scroll
	ScrollTrigger.config({ ignoreMobileResize: true });
	gsap.ticker.lagSmoothing(0);

	startLenis();
	window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
		if (event.matches) stopLenis();
		else startLenis();
	});

	// The mobile menu locks the page; Lenis would otherwise keep easing underneath it
	window.addEventListener(MENU_TOGGLE_EVENT, (event) => {
		menuOpen = event.detail.open;
		if (menuOpen) lenis?.stop();
		else lenis?.start();
	});

	document.addEventListener('click', onLinkClick);
	initRefresh();
}

/*
 * Same-page "#hash" links. Runs on document, after any handler on the way up (the Packages
 * "Details" preselect, the mobile menu), and leaves alone anything they already handled.
 * Without Lenis the browser's own jump is fine (and instant with reduced motion).
 */
function onLinkClick(event: MouseEvent) {
	if (!lenis || event.defaultPrevented || event.button !== 0) return;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

	const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[href]');
	if (!link || (link.target && link.target !== '_self')) return;

	const url = new URL(link.href, location.href);
	if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
	if (url.hash !== '#top' && !findTarget(url.hash)) return;

	event.preventDefault();
	scrollToHash(url.hash);
}

function findTarget(hash: string) {
	try {
		return document.getElementById(decodeURIComponent(hash.slice(1)));
	} catch {
		return null;
	}
}

/** Targets with a scroll-margin-top (sections, legal headings) already clear the navbar; Lenis applies it */
function navOffset(target: HTMLElement) {
	if (parseFloat(getComputedStyle(target).scrollMarginTop) > 0) return 0;
	const bar = document.querySelector('[data-header-bar]');
	return bar ? -(bar.getBoundingClientRect().bottom + NAV_GAP) : 0;
}

/**
 * Scrolls to "#id" (or "#top") the way an anchor would, records it in history and moves
 * focus to the target, so keyboard and screen reader users continue from there.
 * Returns false for "#top" so callers can decide where focus goes.
 */
export function scrollToHash(hash: string): boolean {
	const target = hash === '#top' ? null : findTarget(hash);
	history.pushState(null, '', hash);

	if (lenis) {
		lenis.scrollTo(target ?? 0, { offset: target ? navOffset(target) : 0 });
	} else if (target) {
		target.scrollIntoView({ block: 'start' });
	} else {
		window.scrollTo({ top: 0 });
	}

	if (!target) return false;
	if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
	target.focus({ preventScroll: true });
	return true;
}

/*
 * Triggers measure the page once; re-measure whenever it settles into a different shape:
 * web fonts swapping in, images finishing, and anything that changes the page height
 * (the FAQ accordion, the quote builder's messages, the map loading).
 */
function initRefresh() {
	let timer = 0;
	const refresh = () => {
		window.clearTimeout(timer);
		timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
	};

	document.fonts.ready.then(refresh);
	if (document.readyState === 'complete') refresh();
	else window.addEventListener('load', refresh, { once: true });

	let height = document.body.offsetHeight;
	new ResizeObserver(() => {
		const next = document.body.offsetHeight;
		if (Math.abs(next - height) < 1) return;
		height = next;
		refresh();
	}).observe(document.body);
}
