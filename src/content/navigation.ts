export interface NavLink {
	label: string;
	href: `#${string}`;
}

export const navigation = {
	links: [
		{ label: 'Packages', href: '#packages' },
		{ label: 'Results', href: '#results' },
		{ label: 'How it works', href: '#how' },
		{ label: 'Club', href: '#club' },
		{ label: 'Reviews', href: '#reviews' },
		{ label: 'FAQ', href: '#faq' },
	] satisfies NavLink[],
	cta: { label: 'Get a quote', href: '#quote' },
	homeLabel: 'back to top',
	navLabel: 'Main',
	openMenu: 'Open menu',
	closeMenu: 'Close menu',
	menuLabel: 'Site menu',
	callLabel: 'Call',
	emailLabel: 'Email',
	hoursLabel: 'Hours',
};

export const mobileBar = {
	label: 'Quick booking',
	call: 'Call',
	quote: { label: 'Get a quote', href: '#quote' },
};
