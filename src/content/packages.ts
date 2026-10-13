/**
 * Single source of truth for packages, add-ons and pricing.
 * The Packages section renders from this file, and the price calculator will too.
 * Prices are whole pounds in site.currency.
 */
import type { ImageMetadata } from 'astro';
import { site } from '../config/site';
import engineBay from '../assets/images/packages/engine-bay.webp';
import hairRemove from '../assets/images/packages/hair-remove.webp';
import headlight from '../assets/images/packages/headlight.webp';
import leatherCare from '../assets/images/packages/leather-care.webp';
import polisher from '../assets/images/packages/car-wash-detailing-station.webp';
import snowFoam from '../assets/images/packages/snow-foam.webp';
import steeringWheel from '../assets/images/packages/steering-wheel.webp';
import waterBead from '../assets/images/packages/water-bead.webp';

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
	image?: CardImage;
	/** Describes the image this card uses; shown in the placeholder when there's no image */
	imageHint: string;
}

export interface AddOn {
	id: string;
	name: string;
	price: number;
	image?: CardImage;
	imageHint: string;
}

export interface CardImage {
	src: ImageMetadata;
	/** CSS object-position for the square crop, e.g. '30% 50%'. Defaults to centre. */
	focus?: string;
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
		image: { src: snowFoam, focus: '80% 40%' },
		imageHint: 'snow foam cannon',
	},
	{
		id: 'full-valet',
		name: 'Full Valet',
		description: 'Deep clean inside and out, including seats, carpets and glass.',
		duration: '3–4 hrs',
		prices: { small: 95, medium: 115, large: 135 },
		image: { src: steeringWheel, focus: '30% 50%' },
		imageHint: 'steering wheel',
	},
	{
		id: 'paint-enhancement',
		name: 'Paint Enhancement',
		description: 'Single-stage machine polish that removes light swirls and restores gloss.',
		duration: '5–6 hrs',
		prices: { small: 220, medium: 260, large: 300 },
		badge: 'Most popular',
		image: { src: polisher, focus: '40% 45%' },
		imageHint: 'machine polisher',
	},
	{
		id: 'ceramic-coating',
		name: 'Ceramic Coating',
		description: 'Paint correction plus a 3-year ceramic layer for lasting shine and protection.',
		duration: '1–2 days',
		prices: { small: 450, medium: 520, large: 600 },
		image: { src: waterBead, focus: '35% 50%' },
		imageHint: 'water beading on paint',
	},
];

export const addOns: AddOn[] = [
	{
		id: 'pet-hair',
		name: 'Pet hair removal',
		price: 20,
		image: { src: hairRemove, focus: '45% 60%' },
		imageHint: 'pet hair vacuum',
	},
	{
		id: 'engine-bay',
		name: 'Engine bay clean',
		price: 25,
		image: { src: engineBay, focus: '60% 50%' },
		imageHint: 'engine bay',
	},
	{ id: 'headlights', name: 'Headlight restoration', price: 35, image: { src: headlight }, imageHint: 'headlight' },
	{
		id: 'leather',
		name: 'Leather conditioning',
		price: 30,
		image: { src: leatherCare, focus: '35% 60%' },
		imageHint: 'leather seat',
	},
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
