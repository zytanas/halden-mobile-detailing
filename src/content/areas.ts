/**
 * Service area data for the postcode checker and the area map.
 * Town names come from site.serviceAreas, so the map, checker and footer always agree.
 */
import { site } from '../config/site';

export interface Town {
	name: string;
	lat: number;
	lng: number;
}

/** Map position for each service area, keyed by its name in site.serviceAreas */
const coordinates: Record<string, [lat: number, lng: number]> = {
	Manchester: [53.4808, -2.2426],
	Salford: [53.4875, -2.2901],
	Stockport: [53.4106, -2.1575],
	Trafford: [53.446, -2.3086],
	Didsbury: [53.4166, -2.231],
	Altrincham: [53.3838, -2.3547],
	Sale: [53.4247, -2.3226],
	Bury: [53.5933, -2.2966],
};

export const towns: Town[] = site.serviceAreas.map((name) => {
	const position = coordinates[name];
	if (!position) throw new Error(`No map position for service area: ${name}`);
	const [lat, lng] = position;
	return { name, lat, lng };
});

/** Postcode areas (the leading letters of the outward code) we cover in full */
export const coveredAreas = ['M', 'SK', 'BL'];

/** Individual outward codes we cover outside those areas */
export const coveredDistricts = ['WA14', 'WA15'];

/** "M", 1, 4 → ["M1", "M2", "M3", "M4"] */
const districts = (area: string, from: number, to: number) =>
	Array.from({ length: to - from + 1 }, (_, i) => `${area}${from + i}`);

/** Outward codes we can name a town for. Any other covered code falls back to the region. */
const districtTowns: Record<string, string[]> = {
	Manchester: districts('M', 1, 4),
	Salford: [...districts('M', 5, 7), 'M50'],
	Trafford: ['M16', 'M17', 'M32', 'M41'],
	Didsbury: ['M20'],
	Sale: ['M33'],
	Stockport: districts('SK', 1, 8),
	Bury: ['BL0', 'BL8', 'BL9'],
	Altrincham: ['WA14', 'WA15'],
};

export const townByDistrict: Record<string, string> = Object.fromEntries(
	Object.entries(districtTowns).flatMap(([town, codes]) => codes.map((code) => [code, town])),
);

/** Shown for covered postcodes that don't map to a named town */
export const fallbackArea = site.region;

export interface MapTiles {
	url: string;
	attribution: string;
	subdomains: string;
	maxZoom: number;
	/** Fallback tiles are full colour, so the map greys them to match Positron */
	muted: boolean;
}

const osmAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/*
 * Light CARTO "Positron" basemap. CARTO tiles now need a free key (carto.com/basemaps/apikey)
 * or they're served with an "API key required" watermark. Set PUBLIC_CARTO_KEY in .env;
 * until then the map uses standard OpenStreetMap tiles, greyed out to match.
 */
const cartoKey: string | undefined = import.meta.env.PUBLIC_CARTO_KEY;

export const mapTiles: MapTiles = cartoKey
	? {
			url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
			attribution: `${osmAttribution} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
			subdomains: 'abcd',
			maxZoom: 19,
			muted: false,
		}
	: {
			url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
			attribution: osmAttribution,
			subdomains: 'abc',
			maxZoom: 19,
			muted: true,
		};

/** Zoom used when flying to a single town */
export const townZoom = 12;
