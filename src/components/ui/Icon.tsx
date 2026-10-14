/** React twin of Icon.astro for the islands. Same paths (icons.ts), decorative (aria-hidden). */
import { iconPaths, iconViewBox, type IconName } from './icons';

interface Props {
	name: IconName;
	className?: string;
}

export default function Icon({ name, className = 'size-4' }: Props) {
	return (
		<svg className={className} viewBox={iconViewBox(name)} fill="none" aria-hidden="true">
			<path
				d={iconPaths[name]}
				stroke="currentColor"
				strokeWidth={1.25}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
