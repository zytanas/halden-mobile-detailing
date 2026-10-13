import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
	// Hero entrance: any element marked [data-hero] fades up in sequence
	gsap.from('[data-hero]', {
		y: 40,
		opacity: 0,
		duration: 0.9,
		ease: 'power3.out',
		stagger: 0.15,
	});

	// Scroll reveal: any element marked [data-reveal] fades up when it enters the viewport
	gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
		gsap.from(el, {
			y: 60,
			opacity: 0,
			duration: 0.8,
			ease: 'power2.out',
			scrollTrigger: { trigger: el, start: 'top 85%' },
		});
	});
}
