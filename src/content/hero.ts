import { site } from '../config/site';

export interface HeroLink {
	label: string;
	href: string;
}

export interface TrustItem {
	label: string;
	icon?: 'star';
}

export interface HeadlineLine {
	text: string;
	/** Render this line in the accent colour */
	accent?: boolean;
}

export interface HeroContent {
	/** Each entry renders on its own line */
	headline: HeadlineLine[];
	subhead: string;
	primaryCta: HeroLink;
	secondaryCta: HeroLink;
	availability: { title: string; detail: string };
	trust: TrustItem[];
	image: { alt: string; placeholder: string };
}

export const hero: HeroContent = {
	headline: [{ text: 'Showroom finish.' }, { text: 'On your driveway.', accent: true }],
	subhead:
		'Premium valeting, paint correction and ceramic coating, done at your home or office. We bring our own water and power.',
	primaryCta: { label: 'Get an instant quote', href: '#quote' },
	secondaryCta: { label: 'See our work', href: '#results' },
	availability: {
		title: `Next available: ${site.nextAvailable}`,
		detail: `across ${site.region}`,
	},
	trust: [
		{
			icon: 'star',
			label: `${site.rating.score.toLocaleString(site.locale)} from ${site.rating.count.toLocaleString(site.locale)} reviews`,
		},
		{ label: 'Fully insured' },
		{ label: 'Fixed prices' },
	],
	image: {
		alt: 'Glossy red Jaguar convertible, front three-quarter view',
		placeholder: 'Red car cut-out goes here',
	},
};
