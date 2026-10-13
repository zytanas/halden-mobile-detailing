/**
 * Registers GSAP plugins once. Import gsap (and plugins) from here, never from 'gsap' directly,
 * so registration happens in one place and only the plugins we actually use are bundled.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };
