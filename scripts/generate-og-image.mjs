/**
 * Builds public/og-image.jpg, the 1200×630 preview card shown when the site link is shared
 * (WhatsApp, iMessage, Facebook, LinkedIn, Slack…). Run with: npm run og-image
 *
 * Text is set in the site's display face (Barlow Condensed). Fontsource ships it as WOFF only,
 * which the text renderer can't read, so the needed weights are unpacked to TTF in a temp dir.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import sharp from 'sharp';
import { site } from '../src/config/site.ts';

const root = new URL('../', import.meta.url);
const path = (p) => fileURLToPath(new URL(p, root));

const W = 1200;
const H = 630;
const PAD = 72;
// Mirrors src/styles/tokens.css
const color = {
	bg: '#e3e5e8',
	surface: '#f4f5f7',
	ink: '#141618',
	inkMuted: '#5a6067',
	accent: '#d7263d',
	accentDeep: '#a3121f',
};

/** WOFF 1.0 → TTF: inflate each table and rebuild a plain sfnt directory */
function woffToTtf(woff) {
	const count = woff.readUInt16BE(12);
	const tables = Array.from({ length: count }, (_, i) => {
		const entry = 44 + i * 20;
		const offset = woff.readUInt32BE(entry + 4);
		const compLength = woff.readUInt32BE(entry + 8);
		const origLength = woff.readUInt32BE(entry + 12);
		const raw = woff.subarray(offset, offset + compLength);
		return {
			tag: woff.subarray(entry, entry + 4),
			checksum: woff.readUInt32BE(entry + 16),
			data: compLength < origLength ? inflateSync(raw) : raw,
		};
	});

	const header = Buffer.alloc(12 + count * 16);
	woff.copy(header, 0, 4, 8); // sfnt version
	const pow2 = 2 ** Math.floor(Math.log2(count));
	header.writeUInt16BE(count, 4);
	header.writeUInt16BE(pow2 * 16, 6); // searchRange
	header.writeUInt16BE(Math.log2(pow2), 8); // entrySelector
	header.writeUInt16BE(count * 16 - pow2 * 16, 10); // rangeShift

	const body = [];
	let offset = header.length;
	tables.forEach(({ tag, checksum, data }, i) => {
		const entry = 12 + i * 16;
		tag.copy(header, entry);
		header.writeUInt32BE(checksum, entry + 4);
		header.writeUInt32BE(offset, entry + 8);
		header.writeUInt32BE(data.length, entry + 12);
		const pad = (4 - (data.length % 4)) % 4;
		body.push(data, Buffer.alloc(pad));
		offset += data.length + pad;
	});

	return Buffer.concat([header, ...body]);
}

const fontDir = await mkdtemp(join(tmpdir(), 'halden-og-'));
const fonts = {};
for (const weight of [500, 700]) {
	const woff = await readFile(path(`node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-${weight}-normal.woff`));
	fonts[weight] = join(fontDir, `barlow-condensed-${weight}.ttf`);
	await writeFile(fonts[weight], woffToTtf(woff));
}

/** A transparent PNG of Pango-marked-up text, plus its size */
async function text(markup, { weight, size, width, spacing = 0, lineHeight }) {
	const { data, info } = await sharp({
		text: {
			text: markup,
			font: `Barlow Condensed ${weight === 700 ? 'Bold' : 'Medium'} ${size}`,
			fontfile: fonts[weight],
			width,
			spacing,
			rgba: true,
			dpi: 72,
		},
	})
		.png()
		.toBuffer({ resolveWithObject: true });
	return { input: data, width: info.width, height: lineHeight ?? info.height };
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (fg, s, extra = '') => `<span foreground="${fg}"${extra}>${escape(s)}</span>`;

// Background: metal gradient, a dark band on the right so the red car stands out, and a
// thin red stripe echoing the one on the featured package card
const background = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
	<defs>
		<linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="${color.surface}" />
			<stop offset="1" stop-color="${color.bg}" />
		</linearGradient>
	</defs>
	<rect width="${W}" height="${H}" fill="url(#metal)" />
	<polygon points="${W * 0.72},0 ${W},0 ${W},${H} ${W * 0.57},${H}" fill="${color.ink}" />
	<polygon points="${W * 0.67},0 ${W * 0.685},0 ${W * 0.535},${H} ${W * 0.52},${H}" fill="${color.accent}" />
</svg>`);

// The tagline split into two lines, the second in red ("Showroom finish, / on your driveway.")
const [lineOne, lineTwo] = site.tagline.split(/,\s*/);
const headline = await text(
	`${span(color.ink, `${lineOne},`.toUpperCase())}\n${span(color.accent, lineTwo.toUpperCase())}`,
	{ weight: 700, size: 88, width: 600, spacing: -18 },
);
const eyebrow = await text(span(color.inkMuted, site.name.toUpperCase(), ' letter_spacing="4096"'), {
	weight: 700,
	size: 24,
});
const subline = await text(
	span(color.ink, `Mobile car detailing across ${site.region}`) +
		'\n' +
		span(color.inkMuted, 'Valeting · Paint correction · Ceramic coating'),
	{ weight: 500, size: 28, width: 560, spacing: 4 },
);

const logo = await sharp(path('src/assets/images/logo/halden-logomark.png')).resize({ height: 44 }).toBuffer();
const car = await sharp(path('src/assets/images/hero/red-jaguar.webp'))
	.resize({ width: 640 })
	.toBuffer({ resolveWithObject: true });
// Soft contact shadow under the car so it doesn't float on the red band
const shadow = await sharp(
	Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${car.info.width}" height="80">
	<ellipse cx="${car.info.width / 2}" cy="40" rx="${car.info.width * 0.44}" ry="18" fill="#000" fill-opacity="0.35" />
</svg>`),
)
	.blur(14)
	.toBuffer();

const carLeft = W - car.info.width - 16;
const carTop = H - car.info.height - 72;
const logoWidth = (await sharp(logo).metadata()).width;
// Logo row, headline and subline as one block, centred vertically
const blockTop = Math.round((H - (64 + headline.height + 20 + subline.height)) / 2);
const headlineTop = blockTop + 64;

await sharp(background)
	.composite([
		{ input: logo, left: PAD, top: blockTop - 8 },
		{ input: eyebrow.input, left: PAD + logoWidth + 16, top: blockTop + 2 },
		{ input: headline.input, left: PAD - 4, top: headlineTop },
		{ input: subline.input, left: PAD, top: headlineTop + headline.height + 20 },
		{ input: shadow, left: carLeft, top: carTop + car.info.height - 52 },
		{ input: car.data, left: carLeft, top: carTop },
	])
	.jpeg({ quality: 88, mozjpeg: true })
	.toFile(path('public/og-image.jpg'));

await rm(fontDir, { recursive: true, force: true });
console.log('Social preview written to public/og-image.jpg');
