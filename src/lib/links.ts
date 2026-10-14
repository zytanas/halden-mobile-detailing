/**
 * The shared header, footer and mobile bar link to home-page sections with "#hash" hrefs.
 * Those only work on the home page, so on every other page they're rewritten to "/#hash".
 */
export function isHomePath(pathname: string): boolean {
	return pathname.replace(/\/+$/, '') === '';
}

/** "#packages" → "/#packages" off the home page; "#top" → "/". Other hrefs pass through. */
export function homeHref(href: string, pathname: string): string {
	if (!href.startsWith('#') || isHomePath(pathname)) return href;
	return href === '#top' ? '/' : `/${href}`;
}

/** True when `href` is the page at `pathname` (ignoring trailing slashes). */
export function isCurrentPath(href: string, pathname: string): boolean {
	const strip = (path: string) => path.replace(/\/+$/, '') || '/';
	return href.startsWith('/') && strip(href) === strip(pathname);
}
