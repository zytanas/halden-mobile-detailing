/**
 * Brand configuration. Every component reads business details from here,
 * so rebranding for another client starts (and mostly ends) in this file.
 */
export interface SiteConfig {
	name: string;
	shortName: string;
	tagline: string;
	description: string;
	phone: string;
	phoneHref: string;
	email: string;
	hours: string;
	bookingUrl: string;
	country: string;
	locale: string;
	currency: string;
	currencySymbol: string;
	serviceAreas: string[];
	rating: { score: number; count: number };
	/** Region served, used in copy like "across Greater Manchester". */
	region: string;
	offer: { firstDetailDiscount: number; label: string };
	/** Next free booking day shown in the hero. */
	nextAvailable: string;
	/** Browser UI colour (<meta name="theme-color">). Keep in sync with --color-bg. */
	themeColor: string;
}

export const site: SiteConfig = {
	name: 'Halden Mobile Detailing',
	shortName: 'Halden',
	tagline: 'Showroom finish, on your driveway.',
	description:
		'Premium mobile car detailing across Greater Manchester: valeting, paint correction and ceramic coating at your home or office.',
	phone: '0161 496 0732',
	phoneHref: 'tel:+441614960732',
	email: 'hello@haldendetailing.co.uk',
	hours: 'Mon–Sat, 8am–6pm',
	bookingUrl: 'https://cal.com/halden',
	country: 'UK',
	locale: 'en-GB',
	currency: 'GBP',
	currencySymbol: '£',
	serviceAreas: ['Manchester', 'Salford', 'Stockport', 'Trafford', 'Didsbury', 'Altrincham', 'Sale', 'Bury'],
	rating: { score: 4.9, count: 312 },
	region: 'Greater Manchester',
	offer: { firstDetailDiscount: 10, label: '£10 off your first detail' },
	nextAvailable: 'Thursday',
	themeColor: '#E3E5E8',
};
