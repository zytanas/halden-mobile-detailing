/**
 * Copy and reviews for the Reviews section. The score and review count come from
 * site.rating and package names from packages.ts, so they stay in sync with the rest of the page.
 */
import { site } from '../config/site';
import { getPackage } from './packages';
import { formatStat } from './results';

export interface Review {
	id: string;
	name: string;
	town: string;
	/** Package name, as shown on the Packages section */
	package: string;
	/** Whole stars, 1–5 */
	rating: number;
	text: string;
}

export interface RatingShare {
	stars: number;
	/** Percent of all reviews */
	percent: number;
}

/** Ratings are out of this many stars */
export const RATING_MAX = 5;

const pkg = (id: string) => getPackage(id).name;

export const reviews: Review[] = [
	{
		id: 'sarah',
		name: 'Sarah K.',
		town: 'Sale',
		package: pkg('paint-enhancement'),
		rating: 5,
		text: 'Booked on Monday, done on my drive by Wednesday. The paint looks better than when I bought it.',
	},
	{
		id: 'james',
		name: 'James P.',
		town: 'Stockport',
		package: pkg('full-valet'),
		rating: 5,
		text: 'Professional from start to finish. They even cleaned the door shuts.',
	},
	{
		id: 'priya',
		name: 'Priya M.',
		town: 'Didsbury',
		package: pkg('full-valet'),
		rating: 5,
		text: 'Two kids and a dog, and somehow the interior looks new again.',
	},
	{
		id: 'tom',
		name: 'Tom H.',
		town: 'Altrincham',
		package: pkg('ceramic-coating'),
		rating: 5,
		text: 'Worth every penny for the ceramic coating. Rain just slides off.',
	},
	{
		id: 'aisha',
		name: 'Aisha R.',
		town: 'Salford',
		package: pkg('maintenance-wash'),
		rating: 5,
		text: "I'm on the fortnightly plan now. The car is never dirty and I never have to think about it.",
	},
	{
		id: 'daniel',
		name: 'Daniel W.',
		town: 'Bury',
		package: pkg('paint-enhancement'),
		rating: 5,
		text: "Swirl marks I'd had for years are gone. Clear prices and no upselling.",
	},
	{
		id: 'hannah',
		name: 'Hannah L.',
		town: 'Trafford',
		package: pkg('maintenance-wash'),
		rating: 4,
		text: 'Arrived 15 minutes late but texted ahead, and washed the car in my office car park while I was in meetings. Really handy.',
	},
	{
		id: 'mark',
		name: 'Mark O.',
		town: 'Manchester',
		package: pkg('ceramic-coating'),
		rating: 5,
		text: "Explained everything clearly and the finish is unreal. Already booked my wife's car.",
	},
];

/** Marquee rows: alternate reviews between the two, so each row mixes packages and towns */
export const reviewRows: Review[][] = [
	reviews.filter((_, i) => i % 2 === 0),
	reviews.filter((_, i) => i % 2 === 1),
];

/** Rating to one decimal in the site's locale, e.g. "4.9" */
export const formatScore = (score: number) => formatStat(score, 1);

/** "Rated 4.9 out of 5" (whole ratings drop the decimal: "Rated 5 out of 5") */
export function ratingLabel(rating: number): string {
	const value = Number.isInteger(rating) ? String(rating) : formatScore(rating);
	return `Rated ${value} out of ${RATING_MAX}`;
}

/** Short visible bar label, e.g. "5★" */
export const starsShort = (stars: number) => `${stars}★`;

/** Screen reader text for a distribution bar, e.g. "5 stars: 92% of reviews" */
export const shareLabel = ({ stars, percent }: RatingShare) =>
	`${stars} ${stars === 1 ? 'star' : 'stars'}: ${percent}% of reviews`;

/** "Sale · Paint Enhancement" */
export const reviewMeta = (review: Review) => `${review.town} · ${review.package}`;

/** "Sarah K." → "SK" */
export function initials(name: string): string {
	return name
		.split(/\s+/)
		.map((part) => part.replace(/[^\p{L}]/gu, '').charAt(0))
		.join('')
		.slice(0, 2)
		.toUpperCase();
}

export const reviewsSection = {
	heading: 'Trusted by 300+ Manchester drivers.',
	summary: {
		score: site.rating.score,
		count: site.rating.count,
		outOf: `out of ${RATING_MAX}`,
		basedOn: `Based on ${site.rating.count} reviews`,
		distributionLabel: 'Ratings breakdown',
		distribution: [
			{ stars: 5, percent: 92 },
			{ stars: 4, percent: 6 },
			{ stars: 3, percent: 1 },
			{ stars: 2, percent: 1 },
			{ stars: 1, percent: 0 },
		] satisfies RatingShare[],
	},
	listLabel: 'Customer reviews',
	toggle: { pause: 'Pause reviews', play: 'Play reviews' },
	cta: { label: 'Book your detail', href: '#quote' },
	disclaimer: 'Concept site: reviews are illustrative.',
};
