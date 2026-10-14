/**
 * Copy for the Quote section (postcode check + price builder). Prices, packages and
 * discounts come from packages.ts and site.ts; areas from areas.ts.
 *
 * Messages use {placeholders}, filled in with fill().
 */
import { site } from '../config/site';
import { fortnightlyDiscount, formatPrice } from './packages';

const percent = `${Math.round(fortnightlyDiscount * 100)}%`;
const areas = new Intl.ListFormat(site.locale, { type: 'conjunction' }).format(site.serviceAreas);

/** "Good news, we cover {town}." + { town: 'Sale' } → "Good news, we cover Sale." */
export function fill(template: string, values: Record<string, string>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export const quoteSection = {
	heading: 'Build your quote.',
	intro: 'Check we cover you, then build your exact price. No hidden extras, no deposit for washes and valets.',

	steps: {
		postcode: 'Check your postcode',
		size: 'Car size',
		package: 'Package',
		addOns: 'Add-ons',
		frequency: 'How often?',
	},

	postcode: {
		label: 'Your postcode',
		placeholder: 'e.g. M20 2AB',
		button: 'Check',
		messages: {
			covered: 'Good news, we cover {town}.',
			notCovered: "We're not in {postcode} yet. Leave your email and we'll let you know when we are.",
			invalid: "That doesn't look like a UK postcode. Try again.",
		},
		areasLine: `We cover ${areas}.`,
	},

	notify: {
		label: 'Email address',
		placeholder: 'you@example.co.uk',
		button: 'Notify me',
		success: "Thanks. We'll email you as soon as we reach {postcode}.",
		error: 'Please enter a valid email address.',
	},

	map: {
		label: `Map of the areas we cover across ${site.region}`,
		loading: 'Loading map…',
		popup: `{town} · Next available: ${site.nextAvailable}`,
		zoomIn: 'Zoom in',
		zoomOut: 'Zoom out',
	},

	addOnPrefix: '+',

	frequency: {
		oneOff: 'One-off',
		fortnightly: `Fortnightly (save ${percent})`,
	},

	firstBooking: 'This is my first booking with Halden',

	summary: {
		title: 'Your detail',
		area: {
			notChecked: 'Postcode not checked yet',
			covered: '{town}, {postcode}',
			notCovered: "{postcode} isn't covered yet",
		},
		lineItem: '{package} · {size}',
		discounts: {
			fortnightly: `Fortnightly saving (${percent})`,
			welcome: `Welcome offer (${formatPrice(site.offer.firstDetailDiscount)} off)`,
		},
		minus: '−',
		offerRule: "One offer per booking. We've applied your best saving.",
		totalLabel: 'Total',
		/** Announced to screen readers whenever the total changes */
		totalAnnouncement: 'Total {total}',
		note: 'Fixed price, paid on the day.',
		button: 'Book this detail',
		lockedButton: 'Check your postcode to book',
		/** Mobile summary bar */
		expand: 'Show quote details',
		collapse: 'Hide quote details',
		barLabel: 'Your quote',
	},
};

export type QuoteCopy = typeof quoteSection;
