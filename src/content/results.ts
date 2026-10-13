/**
 * Copy, before/after comparisons and proof stats for the Results section.
 */
import type { ImageMetadata } from 'astro';
import { site } from '../config/site';

/*
 * Photos are looked up by filename rather than imported directly, so a missing file
 * falls back to the slider's placeholder instead of breaking the build.
 */
const photos = import.meta.glob<{ default: ImageMetadata }>('../assets/images/results/*.{jpg,jpeg,png,webp,avif}', {
	eager: true,
});

function photo(name: string): ImageMetadata | undefined {
	const match = Object.entries(photos).find(([path]) => path.split('/').pop()?.replace(/\.\w+$/, '') === name);
	return match?.[1].default;
}

export interface ComparisonSide {
	/** Undefined until the photo is added to src/assets/images/results/ */
	image?: ImageMetadata;
	alt: string;
	/** Shown in the placeholder while there's no photo */
	hint: string;
}

export interface Comparison {
	id: string;
	title: string;
	featured?: boolean;
	before: ComparisonSide;
	after: ComparisonSide;
	caption: { car: string; package: string; town: string };
}

export interface Stat {
	value: number;
	suffix?: string;
	label: string;
	decimals?: number;
}

export const comparisons: Comparison[] = [
	{
		id: 'paint',
		title: 'Paint',
		featured: true,
		before: {
			image: photo('paint-before'),
			alt: 'Dull, swirled paint on a dark car door',
			hint: 'dull swirled paint',
		},
		after: {
			image: photo('paint-after'),
			alt: 'Deep, mirror-like gloss on the same car door',
			hint: 'deep gloss',
		},
		caption: { car: 'BMW 3 Series', package: 'Paint Enhancement', town: 'Didsbury' },
	},
	{
		id: 'interior',
		title: 'Interior',
		before: {
			image: photo('interior-before'),
			alt: 'Car seats and mats covered in crumbs and dust',
			hint: 'crumbs and dust',
		},
		after: {
			image: photo('interior-after'),
			alt: 'The same seats and mats spotless after a valet',
			hint: 'spotless seats',
		},
		caption: { car: 'Ford Kuga', package: 'Full Valet', town: 'Stockport' },
	},
	{
		id: 'wheels',
		title: 'Wheels',
		before: {
			image: photo('wheel-before'),
			alt: 'Alloy wheel coated in brake dust',
			hint: 'brake dust',
		},
		after: {
			image: photo('wheel-after'),
			alt: 'The same alloy wheel clean and glossy',
			hint: 'clean, glossy alloy',
		},
		caption: { car: 'Audi A4', package: 'Maintenance Wash', town: 'Sale' },
	},
];

export const stats: Stat[] = [
	{ value: 1200, suffix: '+', label: 'Cars detailed' },
	{ value: site.rating.score, suffix: '★', label: 'Average rating', decimals: 1 },
	{ value: site.serviceAreas.length, label: 'Towns covered' },
	{ value: 100, suffix: '%', label: 'Satisfaction guarantee' },
];

/** Stat number in the site's locale, e.g. "1,200" or "4.9" */
export function formatStat(value: number, decimals = 0): string {
	return new Intl.NumberFormat(site.locale, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(value);
}

/** "BMW 3 Series · Paint Enhancement · Didsbury" */
export function captionLine({ caption }: Comparison): string {
	return [caption.car, caption.package, caption.town].join(' · ');
}

/** Copy for the Results section */
export const resultsSection = {
	heading: 'The difference is in the details.',
	intro: `Real finishes from real driveways across ${site.region}. Drag to compare.`,
	slider: {
		ariaLabel: 'Compare before and after',
		beforeLabel: 'Before',
		afterLabel: 'After',
	},
	closing: {
		text: 'Like what you see? Get your price in under a minute.',
		cta: { label: 'Build your quote', href: '#quote' },
	},
};
