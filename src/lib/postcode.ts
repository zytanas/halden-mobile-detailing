/**
 * UK postcode helpers for the quote builder's area check.
 * Pure functions: no DOM, so they're safe to import anywhere and easy to test.
 */
import { coveredAreas, coveredDistricts, fallbackArea, townByDistrict } from '../content/areas';

/** Standard UK postcode format (including the GIR 0AA special case), on normalised input */
const UK_POSTCODE =
	/^(GIR 0AA|[A-PR-UWYZ]([0-9]{1,2}|[A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?|[0-9][A-HJKPS-UW]) [0-9][ABD-HJLNP-UW-Z]{2})$/;

export type PostcodeResult =
	| { status: 'invalid' }
	| { status: 'covered'; postcode: string; outward: string; town: string }
	| { status: 'not-covered'; postcode: string; outward: string };

/** Trims, uppercases and puts a single space before the inward code: " m202ab " → "M20 2AB" */
export function normalisePostcode(input: string): string {
	const compact = input.replace(/\s+/g, '').toUpperCase();
	if (compact.length <= 3) return compact;
	return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function isValidPostcode(input: string): boolean {
	return UK_POSTCODE.test(normalisePostcode(input));
}

/** "M20 2AB" → "M20" */
export function outwardCode(postcode: string): string {
	return normalisePostcode(postcode).split(' ')[0];
}

/** Leading letters of the outward code: "SK4" → "SK", "M20" → "M" */
function postcodeArea(outward: string): string {
	return outward.match(/^[A-Z]+/)?.[0] ?? '';
}

export function isCovered(outward: string): boolean {
	return coveredAreas.includes(postcodeArea(outward)) || coveredDistricts.includes(outward);
}

/** Named town for a covered outward code, or the region for the rest */
export function townFor(outward: string): string {
	return townByDistrict[outward] ?? fallbackArea;
}

/** Normalises, validates and looks up a postcode in one go */
export function checkPostcode(input: string): PostcodeResult {
	const postcode = normalisePostcode(input);
	if (!UK_POSTCODE.test(postcode)) return { status: 'invalid' };
	const outward = outwardCode(postcode);
	if (!isCovered(outward)) return { status: 'not-covered', postcode, outward };
	return { status: 'covered', postcode, outward, town: townFor(outward) };
}
