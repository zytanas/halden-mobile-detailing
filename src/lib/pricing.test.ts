import { describe, expect, it } from 'vitest';
import { site } from '../config/site';
import { addOns, fortnightlyDiscount, formatPrice, packages, sizes } from '../content/packages';
import {
	addOnsTotal,
	basePrice,
	bestDiscount,
	bookingUrl,
	calculateQuote,
	FORTNIGHTLY_PACKAGE_ID,
	type QuoteSelection,
} from './pricing';

const select = (overrides: Partial<QuoteSelection> = {}): QuoteSelection => ({
	packageId: 'full-valet',
	sizeId: 'medium',
	addOnIds: [],
	frequency: 'one-off',
	firstBooking: false,
	...overrides,
});

const welcome = site.offer.firstDetailDiscount;

describe('base price', () => {
	for (const pkg of packages) {
		for (const size of sizes) {
			it(`${pkg.name} × ${size.label} = ${formatPrice(pkg.prices[size.id])}`, () => {
				const quote = calculateQuote(select({ packageId: pkg.id, sizeId: size.id }));
				expect(basePrice(pkg.id, size.id)).toBe(pkg.prices[size.id]);
				expect(quote.base).toBe(pkg.prices[size.id]);
				expect(quote.subtotal).toBe(pkg.prices[size.id]);
				expect(quote.total).toBe(pkg.prices[size.id]);
				expect(quote.discount).toBeNull();
			});
		}
	}

	it('throws on an unknown package', () => {
		expect(() => calculateQuote(select({ packageId: 'nope' }))).toThrow();
	});
});

describe('add-ons', () => {
	it('adds each add-on on top of the base price', () => {
		for (const addOn of addOns) {
			const quote = calculateQuote(select({ addOnIds: [addOn.id] }));
			expect(quote.total).toBe(115 + addOn.price);
		}
	});

	it('adds every add-on together', () => {
		const all = addOns.map((a) => a.id);
		const sum = addOns.reduce((total, a) => total + a.price, 0);
		expect(addOnsTotal(all)).toBe(sum);
		expect(calculateQuote(select({ addOnIds: all })).total).toBe(115 + sum);
	});

	it('ignores duplicates and unknown ids, and keeps catalogue order', () => {
		const quote = calculateQuote(select({ addOnIds: ['leather', 'pet-hair', 'leather', 'mystery'] }));
		expect(quote.addOns.map((a) => a.id)).toEqual(['pet-hair', 'leather']);
		expect(quote.total).toBe(115 + 20 + 30);
	});
});

describe('fortnightly discount', () => {
	it(`takes ${fortnightlyDiscount * 100}% off a fortnightly Maintenance Wash`, () => {
		const quote = calculateQuote(select({ packageId: FORTNIGHTLY_PACKAGE_ID, sizeId: 'large', frequency: 'fortnightly' }));
		expect(quote.discount).toEqual({ id: 'fortnightly', amount: 7 }); // 10% of £65, rounded
		expect(quote.total).toBe(58);
	});

	it('applies to add-ons too (10% of the subtotal)', () => {
		const quote = calculateQuote(
			select({ packageId: FORTNIGHTLY_PACKAGE_ID, sizeId: 'medium', frequency: 'fortnightly', addOnIds: ['engine-bay'] }),
		);
		expect(quote.subtotal).toBe(80);
		expect(quote.discount).toEqual({ id: 'fortnightly', amount: 8 });
		expect(quote.total).toBe(72);
	});

	it('does not apply to one-off washes', () => {
		const quote = calculateQuote(select({ packageId: FORTNIGHTLY_PACKAGE_ID, frequency: 'one-off' }));
		expect(quote.discount).toBeNull();
	});

	it('does not apply to other packages, even if fortnightly was picked earlier', () => {
		for (const pkg of packages.filter((p) => p.id !== FORTNIGHTLY_PACKAGE_ID)) {
			const quote = calculateQuote(select({ packageId: pkg.id, frequency: 'fortnightly' }));
			expect(quote.frequency).toBe('one-off');
			expect(quote.eligible).toEqual([]);
			expect(quote.total).toBe(quote.subtotal);
		}
	});

	it('gives whole pounds', () => {
		for (const size of sizes) {
			const quote = calculateQuote(select({ packageId: FORTNIGHTLY_PACKAGE_ID, sizeId: size.id, frequency: 'fortnightly' }));
			expect(Number.isInteger(quote.total)).toBe(true);
		}
	});
});

describe('welcome offer', () => {
	it(`takes ${formatPrice(welcome)} off a first booking, any package`, () => {
		for (const pkg of packages) {
			const quote = calculateQuote(select({ packageId: pkg.id, sizeId: 'small', firstBooking: true }));
			expect(quote.discount).toEqual({ id: 'welcome', amount: welcome });
			expect(quote.total).toBe(pkg.prices.small - welcome);
		}
	});
});

describe('best single discount', () => {
	it('picks the welcome offer when it saves more', () => {
		// 10% of £55 = £6 < £10
		const quote = calculateQuote(
			select({ packageId: FORTNIGHTLY_PACKAGE_ID, frequency: 'fortnightly', firstBooking: true }),
		);
		expect(quote.eligible.map((d) => d.id)).toEqual(['fortnightly', 'welcome']);
		expect(quote.discount?.id).toBe('welcome');
		expect(quote.total).toBe(55 - welcome);
	});

	it('picks fortnightly when it saves more', () => {
		// £65 + every add-on (£110) = £175, 10% = £18 > £10
		const quote = calculateQuote(
			select({
				packageId: FORTNIGHTLY_PACKAGE_ID,
				sizeId: 'large',
				frequency: 'fortnightly',
				firstBooking: true,
				addOnIds: addOns.map((a) => a.id),
			}),
		);
		expect(quote.discount).toEqual({ id: 'fortnightly', amount: 18 });
		expect(quote.total).toBe(175 - 18);
	});

	it('never stacks discounts', () => {
		const quote = calculateQuote(
			select({ packageId: FORTNIGHTLY_PACKAGE_ID, frequency: 'fortnightly', firstBooking: true, addOnIds: ['pet-hair'] }),
		);
		const biggest = Math.max(...quote.eligible.map((d) => d.amount));
		expect(quote.subtotal - quote.total).toBe(biggest);
	});

	it('keeps the first listed discount on a tie, and returns null for none', () => {
		expect(bestDiscount([{ id: 'fortnightly', amount: 10 }, { id: 'welcome', amount: 10 }])?.id).toBe('fortnightly');
		expect(bestDiscount([])).toBeNull();
	});
});

describe('booking URL', () => {
	it('carries the full quote', () => {
		const quote = calculateQuote(select({ addOnIds: ['leather', 'pet-hair'], firstBooking: true }));
		const url = new URL(bookingUrl(quote, 'M20 2AB'));
		expect(`${url.origin}${url.pathname}`).toBe(site.bookingUrl);
		expect(Object.fromEntries(url.searchParams)).toEqual({
			package: 'full-valet',
			size: 'medium',
			addons: 'pet-hair,leather',
			frequency: 'one-off',
			postcode: 'M20 2AB',
			offer: 'welcome',
			total: String(115 + 20 + 30 - welcome),
		});
	});

	it('sends an empty add-on list, fortnightly frequency and no offer', () => {
		const quote = calculateQuote(select({ packageId: FORTNIGHTLY_PACKAGE_ID, sizeId: 'small', frequency: 'fortnightly' }));
		const params = new URL(bookingUrl(quote, 'SK4 1AA')).searchParams;
		expect(params.get('addons')).toBe('');
		expect(params.get('frequency')).toBe('fortnightly');
		expect(params.get('offer')).toBe('fortnightly');
		expect(params.get('total')).toBe('40'); // £45 − £5 (10%, rounded)
	});
});
