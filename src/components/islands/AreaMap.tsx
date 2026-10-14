/**
 * Service area map. Leaflet touches `window` as soon as it's imported, so both Leaflet and
 * react-leaflet are loaded with a dynamic import, on the client only, once the map is near
 * the viewport (the same idea as client:visible, which can't be used on a nested component).
 * The server renders the framed placeholder in the same box, so nothing shifts.
 */
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { mapTiles, towns, townZoom } from '../../content/areas';
import { fill, quoteSection } from '../../content/quote';
import { prefersReducedMotion } from '../../lib/motion';

type ReactLeaflet = typeof import('react-leaflet');
type Libs = { L: typeof Leaflet; RL: ReactLeaflet };

export interface MapFocus {
	/** A town from areas.ts, or anything else (e.g. the region) to show every town */
	town: string;
	/** Changes on every check, so checking the same town again replays the move */
	key: number;
}

interface Props {
	focus: MapFocus | null;
	className?: string;
}

const copy = quoteSection.map;

const FIT_PADDING: Leaflet.PointTuple = [24, 24];
const FLY_SECONDS = 1.2;

export default function AreaMap({ focus, className = '' }: Props) {
	const frameRef = useRef<HTMLDivElement>(null);
	const [libs, setLibs] = useState<Libs | null>(null);

	useEffect(() => {
		const frame = frameRef.current;
		if (!frame) return;
		let cancelled = false;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				observer.disconnect();
				Promise.all([import('leaflet'), import('react-leaflet')]).then(([leaflet, RL]) => {
					// Leaflet is UMD: the API is on the default export when bundled
					const L = ((leaflet as { default?: typeof Leaflet }).default ?? leaflet) as typeof Leaflet;
					if (!cancelled) setLibs({ L, RL });
				});
			},
			{ rootMargin: '200px 0px' },
		);
		observer.observe(frame);

		return () => {
			cancelled = true;
			observer.disconnect();
		};
	}, []);

	return (
		<div
			ref={frameRef}
			className={`area-map ${mapTiles.muted ? 'area-map-muted' : ''} relative isolate h-80 overflow-hidden rounded-frame border border-line bg-metal-200 ${className}`}
			role="region"
			aria-label={copy.label}
			// Wheel and drag over the map scroll natively rather than through Lenis
			data-lenis-prevent
		>
			{libs ? (
				<LeafletMap libs={libs} focus={focus} />
			) : (
				<p className="grid size-full place-items-center text-sm text-ink-muted">{copy.loading}</p>
			)}
		</div>
	);
}

function LeafletMap({ libs: { L, RL }, focus }: { libs: Libs; focus: MapFocus | null }) {
	const { MapContainer, TileLayer, Marker, Popup, ZoomControl } = RL;
	const [map, setMap] = useState<Leaflet.Map | null>(null);

	const bounds = useMemo(() => L.latLngBounds(towns.map((town) => [town.lat, town.lng])), [L]);

	// A fresh icon for the focused town on every check restarts its pulse
	const icon = (active: boolean) =>
		L.divIcon({
			className: `area-marker${active ? ' is-active' : ''}`,
			html: '<span class="area-marker-dot"></span>',
			iconSize: [18, 18],
			iconAnchor: [9, 9],
			popupAnchor: [0, -10],
		});

	useEffect(() => {
		if (!map || !focus) return;
		const options = { animate: !prefersReducedMotion(), duration: FLY_SECONDS };
		const town = towns.find((t) => t.name === focus.town);
		if (town) map.flyTo([town.lat, town.lng], townZoom, options);
		else map.flyToBounds(bounds, { ...options, padding: FIT_PADDING });
	}, [map, focus, bounds]);

	return (
		<MapContainer
			ref={setMap}
			bounds={bounds}
			boundsOptions={{ padding: FIT_PADDING }}
			zoomSnap={0.5}
			scrollWheelZoom={false}
			dragging
			zoomControl={false}
			className="size-full"
		>
			<TileLayer
				url={mapTiles.url}
				attribution={mapTiles.attribution}
				subdomains={mapTiles.subdomains}
				maxZoom={mapTiles.maxZoom}
			/>
			<ZoomControl position="topright" zoomInTitle={copy.zoomIn} zoomOutTitle={copy.zoomOut} />
			{towns.map((town) => {
				const active = focus?.town === town.name;
				return (
					<Marker
						key={active ? `${town.name}-${focus.key}` : town.name}
						position={[town.lat, town.lng]}
						icon={icon(active)}
						title={town.name}
						alt={town.name}
					>
						<Popup>{fill(copy.popup, { town: town.name })}</Popup>
					</Marker>
				);
			})}
		</MapContainer>
	);
}
