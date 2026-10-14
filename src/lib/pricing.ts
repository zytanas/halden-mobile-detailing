/**
 * Quote pricing. Pure functions over packages.ts and site.ts, so the builder, the booking
 * link and the tests all share one set of rules. All amounts are whole pounds.
 */
import { site } from '../config/site';
import {
	addOns,
	fortnightlyDiscount,
	getPackage,
	sizes,
	type AddOn,
	type Package,
	type SizeId,
	type VehicleSize,
} from '../content/packages';

/** The only package that can be booked fortnightly */
export const FORTNIGHTLY_PACKAGE_ID = 'maintenance-wash';

export type Frequency = 'one-off' | 'fortnightly';
export type OfferId = 'fortnightly' | 'welcome';

export interface QuoteSelection {
	packageId: string;
	sizeId: SizeId;
	addOnIds: readonly string[];
	/** Ignored unless the package is the Maintenance Wash */
	frequency: Frequency;
	firstBooking: boolean;
}

export interface Discount {
	id: OfferId;
	/** Whole pounds off */
	amount: number;
}

export interface Quote {
	package: Package;
	size: VehicleSize;
	/** Package price for the chosen size */
	base: number;
	/** Chosen add-ons, in catalogue order */
	addOns: AddOn[];
	/** Frequency after applying the package rule (fortnightly is wash only) */
	frequency: Frequency;
	subtotal: number;
	/** Every discount the selection qualifies for */
	eligible: Discount[];
	/** The one discount applied: whichever saves most */
	discount: Discount | null;
	total: number;
}

export function getSize(id: SizeId): VehicleSize {
	const size = sizes.find((s) => s.id === id);
	if (!size) throw new Error(`Unknown size: ${id}`);
	return size;
}

export function basePrice(packageId: string, sizeId: SizeId): number {
	return getPackage(packageId).prices[sizeId];
}

/** Known add-ons only, de-duplicated and in catalogue order */
export function selectedAddOns(ids: readonly string[]): AddOn[] {
	return addOns.filter((addOn) => ids.includes(addOn.id));
}

export function addOnsTotal(ids: readonly string[]): number {
	return selectedAddOns(ids).reduce((sum, addOn) => sum + addOn.price, 0);
}

export function effectiveFrequency(packageId: string, frequency: Frequency): Frequency {
	return packageId === FORTNIGHTLY_PACKAGE_ID ? frequency : 'one-off';
}

/** Every discount this selection qualifies for, worked out on the subtotal */
export function eligibleDiscounts(selection: QuoteSelection, subtotal: number): Discount[] {
	const discounts: Discount[] = [];
	if (effectiveFrequency(selection.packageId, selection.frequency) === 'fortnightly') {
		discounts.push({ id: 'fortnightly', amount: Math.round(subtotal * fortnightlyDiscount) });
	}
	if (selection.firstBooking) {
		discounts.push({ id: 'welcome', amount: site.offer.firstDetailDiscount });
	}
	return discounts;
}

/** One offer per booking: the biggest saving wins (the first listed on a tie) */
export function bestDiscount(discounts: readonly Discount[]): Discount | null {
	return discounts.reduce<Discount | null>((best, d) => (!best || d.amount > best.amount ? d : best), null);
}

export function calculateQuote(selection: QuoteSelection): Quote {
	const pkg = getPackage(selection.packageId);
	const base = pkg.prices[selection.sizeId];
	const chosen = selectedAddOns(selection.addOnIds);
	const subtotal = base + chosen.reduce((sum, addOn) => sum + addOn.price, 0);
	const eligible = eligibleDiscounts(selection, subtotal);
	const discount = bestDiscount(eligible);
	// A discount can never take the price below zero
	const total = Math.max(0, subtotal - (discount?.amount ?? 0));

	return {
		package: pkg,
		size: getSize(selection.sizeId),
		base,
		addOns: chosen,
		frequency: effectiveFrequency(selection.packageId, selection.frequency),
		subtotal,
		eligible,
		discount,
		total,
	};
}

/** Booking link carrying the whole quote, e.g. ?package=full-valet&size=medium&addons=pet-hair,leather… */
export function bookingUrl(quote: Quote, postcode: string, base: string = site.bookingUrl): string {
	const url = new URL(base);
	const params: Record<string, string> = {
		package: quote.package.id,
		size: quote.size.id,
		addons: quote.addOns.map((addOn) => addOn.id).join(','),
		frequency: quote.frequency,
		postcode,
		offer: quote.discount?.id ?? 'none',
		total: String(quote.total),
	};
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
	return url.toString();
}
