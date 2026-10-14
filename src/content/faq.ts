/**
 * Copy and questions for the FAQ section. Contact details and service areas come from
 * site.ts and durations from packages.ts, so answers never drift from the rest of the page.
 *
 * Answers are plain text with at most one Markdown-style link: "[label](href)".
 */
import { site } from '../config/site';
import { getPackage } from './packages';

export interface Faq {
	id: string;
	question: string;
	answer: string;
}

/** A run of answer text, or the link inside it */
export type AnswerPart = { text: string; href?: string };

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;

/** Splits an answer around its link, e.g. ["Check ", {link}, "."] */
export function answerParts(answer: string): AnswerPart[] {
	const match = LINK.exec(answer);
	if (!match) return [{ text: answer }];
	const [whole, text, href] = match;
	const before = answer.slice(0, match.index);
	const after = answer.slice(match.index + whole.length);
	return [{ text: before }, { text, href }, { text: after }].filter((part) => part.text);
}

/** The answer with its link reduced to the link text (for structured data) */
export const plainAnswer = (answer: string) => answerParts(answer).map((part) => part.text).join('');

/** "1–1.5 hrs" → "1 to 1.5 hours", "1–2 days" → "1 to 2 days" */
const spokenDuration = (id: string) =>
	getPackage(id)
		.duration.replace(/\s*–\s*/, ' to ')
		.replace(/\bhrs?\b/, 'hours');

const name = (id: string) => getPackage(id).name;

const areas = new Intl.ListFormat(site.locale, { type: 'conjunction' }).format(site.serviceAreas);

export const faqs: Faq[] = [
	{
		id: 'water-power',
		question: 'Do I need to provide water or electricity?',
		answer: `No. Every ${site.shortName} van carries its own water supply and power, so all we need is access to the car.`,
	},
	{
		id: 'duration',
		question: 'How long does a detail take?',
		answer:
			`About ${spokenDuration('maintenance-wash')} for a ${name('maintenance-wash')}, ` +
			`${spokenDuration('full-valet')} for a ${name('full-valet')}, ` +
			`${spokenDuration('paint-enhancement')} for ${name('paint-enhancement')}, ` +
			`and ${spokenDuration('ceramic-coating')} for a ${name('ceramic-coating')}.`,
	},
	{
		id: 'be-home',
		question: 'Do I need to be home?',
		answer:
			"No. As long as we can reach the car and you leave us the keys, you can carry on with your day. We'll message you when we're done.",
	},
	{
		id: 'office',
		question: 'Can you work at my office?',
		answer: "Yes, as long as there's a parking space with about a metre of room around the car and permission to work there.",
	},
	{
		id: 'rain',
		question: 'What happens if it rains?',
		answer: "Light rain is fine, as we work under a canopy. For heavy rain we'll rebook you at no charge.",
	},
	{
		id: 'areas',
		question: 'What areas do you cover?',
		answer: `We cover ${areas}. Check your postcode in our [postcode checker](#quote).`,
	},
	{
		id: 'payment',
		question: 'How do I pay?',
		answer:
			"By card or bank transfer on the day. There's no deposit for washes and valets. Ceramic Coating bookings need a 20% deposit.",
	},
	{
		id: 'reschedule',
		question: 'Can I reschedule or cancel?',
		answer: 'Yes, free of charge up to 24 hours before your booking.',
	},
	{
		id: 'ceramic-lifespan',
		question: 'How long does a ceramic coating last?',
		answer: "Up to 3 years with regular maintenance washes. We'll give you simple aftercare tips on the day.",
	},
	{
		id: 'insurance',
		question: 'Are you insured?',
		answer: `Yes. We're fully insured for public liability up to ${site.currencySymbol}5 million, and for customer vehicles while in our care.`,
	},
];

const mailto = `mailto:${site.email}`;

export const faqSection = {
	heading: 'Questions, answered.',
	intro: 'Everything you need to know before we arrive.',
	help: {
		title: 'Still not sure?',
		text: 'Talk to a real person. We usually reply within an hour during opening times.',
		phone: { label: 'Phone', value: site.phone, href: site.phoneHref },
		email: { label: 'Email', value: site.email, href: mailto },
		hours: site.hours,
		call: { label: 'Call us', href: site.phoneHref },
		write: { label: 'Email us', href: mailto },
	},
};
