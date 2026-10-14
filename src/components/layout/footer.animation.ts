import { gsap } from '../../lib/gsap';
import { prefersReducedMotion } from '../../lib/motion';
import { fontsSettled, onMotion } from '../../lib/media';

/** Extra space between neighbouring wordmark letters at the start, in viewBox units (1000 wide) */
const LETTER_SPREAD = 44;

/*
 * Scrubbed to the scroll, so both rewind on the way back up. Entrances for the CTA copy and
 * the link columns come from lib/reveal.ts (data-reveal in Footer.astro).
 */
export async function initFooter(root: HTMLElement) {
	if (prefersReducedMotion()) return;

	const stripes = gsap.utils.toArray<HTMLElement>('[data-footer-stripe]', root);
	const panel = stripes[0]?.closest<HTMLElement>('.footer-cta');
	if (panel) {
		// The stripes only show from md
		onMotion((m) => {
			if (m.device === 'mobile') return;
			const tl = gsap.timeline({
				defaults: { ease: 'power2.out' },
				scrollTrigger: { trigger: panel, start: 'top bottom', end: 'top 35%', scrub: 0.6 },
			});
			// Down their own (rotated) axis from the top-right; the thin one travels further
			stripes.forEach((stripe, i) => tl.fromTo(stripe, { yPercent: i === 0 ? -40 : -60 }, { yPercent: 0 }, 0));
		});
	}

	const wordmark = root.querySelector<SVGSVGElement>('[data-footer-wordmark]');
	if (!wordmark) return;

	// Letters are measured from the laid-out text, so wait for the display font
	await fontsSettled(3000);
	const letters = splitWordmark(wordmark);
	if (!letters.length) return;

	// The wordmark rises and its letters draw together from wide spacing to their places
	onMotion((m) => {
		const mid = (letters.length - 1) / 2;
		const tl = gsap.timeline({
			defaults: { ease: 'power2.out' },
			scrollTrigger: {
				trigger: wordmark,
				start: 'top bottom',
				end: 'clamp(bottom bottom)',
				scrub: 0.6,
				onToggle: (self) => gsap.set(wordmark, { willChange: self.isActive ? 'transform' : 'auto' }),
			},
		});
		tl.fromTo(wordmark, { yPercent: 35 * m.amount }, { yPercent: 0 }, 0);
		letters.forEach((letter, i) => {
			tl.fromTo(letter, { x: (i - mid) * LETTER_SPREAD * m.amount }, { x: 0 }, 0);
		});
	});
}

/*
 * The wordmark is one <text> stretched to the full width (textLength), so letter-spacing
 * can't be animated directly, and it isn't a transform anyway. Instead each letter becomes
 * its own <text> at exactly the place and width it had, which looks identical, and the
 * letters can then be moved apart and back with transforms.
 */
function splitWordmark(svg: SVGSVGElement): SVGTextElement[] {
	const text = svg.querySelector('text');
	const word = text?.textContent ?? '';
	if (!text || word.length < 2) return [];

	try {
		const letters = [...word].map((char, i) => {
			const box = text.getExtentOfChar(i);
			const letter = text.cloneNode(false) as SVGTextElement;
			letter.textContent = char;
			letter.setAttribute('x', String(box.x));
			letter.setAttribute('textLength', String(box.width));
			return letter;
		});
		text.replaceWith(...letters);
		return letters;
	} catch {
		// Not laid out (e.g. hidden): leave the wordmark as it is
		return [];
	}
}
