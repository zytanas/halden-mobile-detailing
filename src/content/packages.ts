/**
 * Single source of truth for packages, add-ons and pricing.
 * The Packages section renders from this file, and the price calculator will too.
 * Prices are whole pounds in site.currency.
 */
import { site } from '../config/site';

export type SizeId = 'small' | 'medium' | 'large';

export interface VehicleSize {
	id: SizeId;
	label: string;
	examples: string;
}

export interface Package {
	id: string;
	name: string;
	description: string;
	duration: string;
	prices: Record<SizeId, number>;
	badge?: string;
	/** Describes the cut-out image this card will use */
	imageHint: string;
}

export interface AddOn {
	id: string;
	name: string;
	price: number;
	imageHint: string;
}

export const sizes: VehicleSize[] = [
	{ id: 'small', label: 'Small car', examples: 'e.g. Fiesta, Polo' },
	{ id: 'medium', label: 'Saloon/Hatch', examples: 'e.g. Golf, 3 Series' },
	{ id: 'large', label: 'SUV/Van', examples: 'e.g. Qashqai, X5, Transit' },
];

export const packages: Package[] = [
	{
		id: 'maintenance-wash',
		name: 'Maintenance Wash',
		description: 'Safe hand wash, wheels, tyres and a quick interior tidy.',
		duration: '1–1.5 hrs',
		prices: { small: 45, medium: 55, large: 65 },
		imageHint: 'snow foam bottle cut-out',
	},
	{
		id: 'full-valet',
		name: 'Full Valet',
		description: 'Deep clean inside and out, including seats, carpets and glass.',
		duration: '3–4 hrs',
		prices: { small: 95, medium: 115, large: 135 },
		imageHint: 'steering wheel cut-out',
	},
	{
		id: 'paint-enhancement',
		name: 'Paint Enhancement',
		description: 'Single-stage machine polish that removes light swirls and restores gloss.',
		duration: '5–6 hrs',
		prices: { small: 220, medium: 260, large: 300 },
		badge: 'Most popular',
		imageHint: 'car polisher cut-out',
	},
	{
		id: 'ceramic-coating',
		name: 'Ceramic Coating',
		description: 'Paint correction plus a 3-year ceramic layer for lasting shine and protection.',
		duration: '1–2 days',
		prices: { small: 450, medium: 520, large: 600 },
		imageHint: 'water-beaded bonnet cut-out',
	},
];

export const addOns: AddOn[] = [
	{ id: 'pet-hair', name: 'Pet hair removal', price: 20, imageHint: 'dog hair brush cut-out' },
	{ id: 'engine-bay', name: 'Engine bay clean', price: 25, imageHint: 'engine cut-out' },
	{ id: 'headlights', name: 'Headlight restoration', price: 35, imageHint: 'headlight cut-out' },
	{ id: 'leather', name: 'Leather conditioning', price: 30, imageHint: 'leather seat cut-out' },
];

/** Discount applied to fortnightly maintenance plans (0.10 = 10%) */
export const fortnightlyDiscount = 0.1;

/** Lowest price across all vehicle sizes */
export function fromPrice(pkg: Package): number {
	return Math.min(...Object.values(pkg.prices));
}

const priceFormatter = new Intl.NumberFormat(site.locale, {
	style: 'currency',
	currency: site.currency,
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
});

/** Whole-pound price in the site's locale and currency, e.g. "£45" */
export function formatPrice(amount: number): string {
	return priceFormatter.format(amount);
}

export function getPackage(id: string): Package {
	const pkg = packages.find((p) => p.id === id);
	if (!pkg) throw new Error(`Unknown package: ${id}`);
	return pkg;
}

export function getAddOn(id: string): AddOn {
	const addOn = addOns.find((a) => a.id === id);
	if (!addOn) throw new Error(`Unknown add-on: ${id}`);
	return addOn;
}

/** Copy for the Packages section */
export const packagesSection = {
	heading: 'Choose your detail.',
	intro: 'Pick a package, then build your exact price below. No hidden extras.',
	packageEyebrow: 'Package',
	addOnEyebrow: 'Add-on',
	fromLabel: 'from',
	addOnPrefix: '+',
	detailsLabel: 'Details',
	imageHintPrefix: 'Image:',
	cta: {
		title: 'Not sure what you need?',
		label: 'Build your quote',
		href: '#quote',
	},
};
