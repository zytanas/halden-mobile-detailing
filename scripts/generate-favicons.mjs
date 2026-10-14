/**
 * Builds the favicons in public/ from the logomark, so a rebrand only needs a new
 * src/assets/images/logo/halden-logomark.png. Run with: npm run favicons
 *
 * - favicon.ico: 16, 32 and 48px PNG frames, transparent, mark centred
 * - apple-touch-icon.png: 180px on the brand background (iOS fills transparency with black)
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { site } from '../src/config/site.ts';

const root = new URL('../', import.meta.url);
const source = fileURLToPath(new URL('src/assets/images/logo/halden-logomark.png', root));
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

/** The wide mark, scaled to fit a square with `padding` (fraction of the side) on each side */
async function squareIcon(size, { padding = 0, background = transparent } = {}) {
	const inner = Math.round(size * (1 - padding * 2));
	const mark = await sharp(source).resize(inner, inner, { fit: 'inside' }).toBuffer();
	return sharp({ create: { width: size, height: size, channels: 4, background } })
		.composite([{ input: mark, gravity: 'centre' }])
		.png({ compressionLevel: 9 })
		.toBuffer();
}

/** ICO container holding PNG frames (supported by every current browser) */
function ico(frames) {
	const header = Buffer.alloc(6 + frames.length * 16);
	header.writeUInt16LE(0, 0); // reserved
	header.writeUInt16LE(1, 2); // type: icon
	header.writeUInt16LE(frames.length, 4);

	let offset = header.length;
	frames.forEach(({ size, data }, i) => {
		const entry = 6 + i * 16;
		header.writeUInt8(size >= 256 ? 0 : size, entry); // width (0 = 256)
		header.writeUInt8(size >= 256 ? 0 : size, entry + 1); // height
		header.writeUInt16LE(1, entry + 4); // colour planes
		header.writeUInt16LE(32, entry + 6); // bits per pixel
		header.writeUInt32LE(data.length, entry + 8);
		header.writeUInt32LE(offset, entry + 12);
		offset += data.length;
	});

	return Buffer.concat([header, ...frames.map((frame) => frame.data)]);
}

const frames = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await squareIcon(size) })));
await writeFile(new URL('public/favicon.ico', root), ico(frames));

await writeFile(
	new URL('public/apple-touch-icon.png', root),
	await squareIcon(180, { padding: 0.12, background: site.themeColor }),
);

console.log('Favicons written to public/');
