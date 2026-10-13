/**
 * Copy and perks for the Halden Club section. Discount values come from config
 * (site.offer, site.club) and packages.ts, so every number on the page stays in sync.
 */
import { site } from '../config/site';
import { formatPrice, fortnightlyDiscount } from './packages';

/** A perk's headline value, split so the animation can count the number between prefix and suffix */
export interface PerkValue {
	amount: number;
	prefix: string;
	suffix: string;
}

export interface ClubPerk {
	id: string;
	value: PerkValue;
	title: string;
	text: string;
	condition: string;
	featured?: boolean;
	badge?: string;
}

const MINUS = '−';

const poundsOff = (amount: number): PerkValue => ({ amount, prefix: `${MINUS}${site.currencySymbol}`, suffix: '' });
const percentOff = (fraction: number): PerkValue => ({ amount: Math.round(fraction * 100), prefix: MINUS, suffix: '%' });

/** e.g. "−£10" or "−15%". Pass amount to format an in-between value while counting. */
export function formatPerkValue(value: PerkValue, amount = value.amount): string {
	return `${value.prefix}${Math.round(amount)}${value.suffix}`;
}

const welcome = formatPrice(site.offer.firstDetailDiscount);
const referral = `${Math.round(site.club.referralDiscount * 100)}%`;
const regular = `${Math.round(fortnightlyDiscount * 100)}%`;

export const perks: ClubPerk[] = [
	{
		id: 'welcome',
		value: poundsOff(site.offer.firstDetailDiscount),
		title: 'Welcome offer',
		text: `${welcome} off your first detail, any package.`,
		condition: 'First booking only',
	},
	{
		id: 'referral',
		value: percentOff(site.club.referralDiscount),
		title: 'Refer a friend',
		text: `You and your friend both get ${referral} off your next detail.`,
		condition: 'No limit on referrals',
		featured: true,
		badge: 'Most shared',
	},
	{
		id: 'regular',
		value: percentOff(fortnightlyDiscount),
		title: 'Stay regular',
		text: `${regular} off every Maintenance Wash when you book fortnightly.`,
		condition: 'Cancel any time',
	},
];

export const clubSection = {
	heading: 'Join the Halden Club.',
	intro: 'Free to join. Rewards from your very first detail, and they keep getting better the more you book.',
	perksLabel: `${site.club.name} perks`,
	card: {
		label: 'Member',
		number: 'HC · 0001 · MCR',
		since: 'Member since 2026',
		/** Read by screen readers in place of the decorative card */
		description: `Illustration of a silver ${site.club.name} membership card.`,
	},
	signup: {
		label: 'Email address',
		placeholder: 'you@example.co.uk',
		button: 'Join the Club',
		success: `You're in. Your ${welcome} welcome offer is on its way to your inbox.`,
		error: 'Please enter a valid email address.',
	},
	finePrint: 'One offer per booking. Concept site: no emails are sent.',
};
