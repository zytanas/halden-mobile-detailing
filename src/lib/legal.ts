/**
 * Fills the {placeholders} in the legal Markdown with business details from site.ts,
 * so rebranding never means editing the policy text.
 */
import { site } from '../config/site';

const escapeHtml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const areas = new Intl.ListFormat(site.locale, { type: 'conjunction' }).format(site.serviceAreas);

const text: Record<string, string> = {
	name: site.name,
	shortName: site.shortName,
	region: site.region,
	club: site.club.name,
	email: site.email,
	phone: site.phone,
	areas,
};

/** In the rendered body, contact details become links */
const html: Record<string, string> = {
	...Object.fromEntries(Object.entries(text).map(([key, value]) => [key, escapeHtml(value)])),
	email: `<a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a>`,
	phone: `<a href="${escapeHtml(site.phoneHref)}" class="whitespace-nowrap tabular-nums">${escapeHtml(site.phone)}</a>`,
};

const PLACEHOLDER = /\{(\w+)\}/g;

function fill(source: string, values: Record<string, string>): string {
	return source.replace(PLACEHOLDER, (match, key: string) => {
		// Fail the build rather than ship a raw "{placeholder}"
		if (!(key in values)) throw new Error(`Unknown placeholder ${match} in legal content`);
		return values[key];
	});
}

/** For plain-text fields: frontmatter, headings */
export const fillText = (source: string) => fill(source, text);

/** For rendered Markdown HTML */
export const fillHtml = (source: string) => fill(source, html);
