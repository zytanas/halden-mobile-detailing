/**
 * Copy for the How it works section.
 */

export interface HowStep {
	number: string;
	icon: 'calendar' | 'van' | 'key';
	title: string;
	text: string;
	meta: string;
	metaIcon: 'clock' | 'card';
}

export const steps: HowStep[] = [
	{
		number: '01',
		icon: 'calendar',
		title: 'Book',
		text: 'Choose your package and a time that suits you. Your price is fixed before you confirm.',
		meta: 'Takes about 60 seconds',
		metaIcon: 'clock',
	},
	{
		number: '02',
		icon: 'van',
		title: 'We arrive',
		text: "Our van turns up fully equipped. You don't need to provide water or power.",
		meta: 'Within your booked time slot',
		metaIcon: 'clock',
	},
	{
		number: '03',
		icon: 'key',
		title: 'Drive away',
		text: 'Inspect the finish with us, then enjoy the car you remember buying.',
		meta: 'Pay by card on the day',
		metaIcon: 'card',
	},
];

export const howSection = {
	heading: 'Booked in a minute. Done while you work.',
	intro: 'No trips to a garage, no waiting rooms. We come to you, wherever the car is parked.',
	reassurance: {
		title: 'All we need from you is the keys.',
		items: ['No water needed', 'No power needed', 'No need to stay home', 'Home or office'],
	},
	cta: { label: 'Book your detail', href: '#quote' },
};
