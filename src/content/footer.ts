/**
 * Copy for the footer. Contact details, areas and the brand name come from site.ts,
 * quick links from navigation.ts.
 */
import { site } from '../config/site';
import type { IconName } from '../components/ui/icons';

export interface SocialLink {
	label: string;
	href: string;
	icon: IconName;
}

export const footer = {
	cta: {
		title: 'Ready for that showroom feeling?',
		text: 'Get your fixed price in under a minute.',
		primary: { label: 'Get an instant quote', href: '#quote' },
		call: { label: `Call ${site.phone}`, href: site.phoneHref },
	},
	blurb: `Premium mobile car detailing across ${site.region}.`,
	contact: {
		title: 'Contact',
		phoneLabel: 'Phone',
		emailLabel: 'Email',
		hoursLabel: 'Hours',
	},
	areasTitle: 'Areas covered',
	linksTitle: 'Quick links',
	legal: [
		{ label: 'Privacy', href: '/privacy' },
		{ label: 'Terms', href: '/terms' },
	],
	socialLabel: 'Social media',
	social: [
		{ label: `${site.shortName} on Instagram`, href: '#', icon: 'instagram' },
		{ label: `${site.shortName} on Facebook`, href: '#', icon: 'facebook' },
		{ label: `${site.shortName} on TikTok`, href: '#', icon: 'tiktok' },
	] satisfies SocialLink[],
	/** Giant wordmark across the bottom */
	wordmark: site.shortName.toUpperCase(),
	copyright: (year: number) =>
		`© ${year} ${site.name} Ltd. Fully insured. Concept site by Julia Almoite.`,
};
