import { describe, expect, it } from 'vitest';
import { site } from '../config/site';
import { checkPostcode, isValidPostcode, normalisePostcode } from './postcode';

describe('normalisePostcode', () => {
	it('trims, uppercases and adds the space', () => {
		expect(normalisePostcode('  m202ab ')).toBe('M20 2AB');
		expect(normalisePostcode('m20   2ab')).toBe('M20 2AB');
		expect(normalisePostcode('wa141ep')).toBe('WA14 1EP');
	});
});

describe('checkPostcode', () => {
	it.each([
		['m20 2ab', 'M20 2AB', 'Didsbury'],
		['M202AB', 'M20 2AB', 'Didsbury'],
		['SK4 1AA', 'SK4 1AA', 'Stockport'],
		['WA14 1EP', 'WA14 1EP', 'Altrincham'],
		['M1 1AE', 'M1 1AE', 'Manchester'],
		['M50 3AZ', 'M50 3AZ', 'Salford'],
		['BL9 0AA', 'BL9 0AA', 'Bury'],
		['M33 7XX', 'M33 7XX', 'Sale'],
		['M41 0AB', 'M41 0AB', 'Trafford'],
		['M14 5AA', 'M14 5AA', site.region],
		['BL1 1AA', 'BL1 1AA', site.region],
	])('%s is covered (%s, %s)', (input, postcode, town) => {
		expect(checkPostcode(input)).toMatchObject({ status: 'covered', postcode, town });
	});

	it.each(['LS1 4AP', 'WA1 1AA', 'ML1 1AA', 'SW1A 1AA'])('%s is not covered', (input) => {
		expect(checkPostcode(input).status).toBe('not-covered');
	});

	it.each(['hello', '', 'M20', '12345', 'M20 2A'])('"%s" is invalid', (input) => {
		expect(checkPostcode(input)).toEqual({ status: 'invalid' });
		expect(isValidPostcode(input)).toBe(false);
	});
});
