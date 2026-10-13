import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export interface BeforeAfterImage {
	/** Optimised URL; omit to show the placeholder */
	src?: string;
	srcset?: string;
	alt: string;
	/** Placeholder text, e.g. "dull swirled paint" */
	placeholder?: string;
}

interface Props {
	before: BeforeAfterImage;
	after: BeforeAfterImage;
	sizes?: string;
	ariaLabel: string;
	beforeLabel: string;
	afterLabel: string;
}

const START = 50;
const KEY_STEP = 5;
/** Touch moves further than this sideways become a drag; less is treated as a tap */
const DRAG_THRESHOLD = 6;
/** One-time nudge to show the divider moves: 50% → HINT_TO → 50% */
const HINT_TO = 62;
const HINT_DURATION = 1400;
/** Wait for the section's entrance animation before nudging */
const HINT_DELAY = 700;

const clamp = (value: number) => Math.min(100, Math.max(0, value));
// Matches --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1), approximated
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export default function BeforeAfter({ before, after, sizes, ariaLabel, beforeLabel, afterLabel }: Props) {
	const [position, setPosition] = useState(START);
	const [failed, setFailed] = useState({ before: false, after: false });
	const rootRef = useRef<HTMLDivElement>(null);
	const drag = useRef<{ id: number; startX: number; startY: number; active: boolean } | null>(null);
	const touched = useRef(false);
	const hintFrame = useRef(0);

	const stopHint = useCallback(() => {
		touched.current = true;
		cancelAnimationFrame(hintFrame.current);
	}, []);

	const moveTo = useCallback((clientX: number) => {
		const rect = rootRef.current?.getBoundingClientRect();
		if (!rect?.width) return;
		setPosition(clamp(((clientX - rect.left) / rect.width) * 100));
	}, []);

	// One-time hint the first time the slider is properly in view
	useEffect(() => {
		const root = rootRef.current;
		if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		let timer = 0;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				observer.disconnect();
				timer = window.setTimeout(() => {
					if (touched.current) return;
					const start = performance.now();
					const tick = (now: number) => {
						const t = Math.min(1, (now - start) / HINT_DURATION);
						// Out and back: 0 → 1 → 0 over the duration
						const swing = easeInOut(t < 0.5 ? t * 2 : 2 - t * 2);
						setPosition(START + (HINT_TO - START) * swing);
						if (t < 1 && !touched.current) hintFrame.current = requestAnimationFrame(tick);
					};
					hintFrame.current = requestAnimationFrame(tick);
				}, HINT_DELAY);
			},
			{ threshold: 0.6 },
		);
		observer.observe(root);

		return () => {
			observer.disconnect();
			window.clearTimeout(timer);
			cancelAnimationFrame(hintFrame.current);
		};
	}, []);

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		stopHint();
		event.currentTarget.setPointerCapture(event.pointerId);

		// Mouse and pen jump straight to the pointer. Touch waits to see whether this is a
		// sideways drag, a tap, or the start of a vertical page scroll.
		const isTouch = event.pointerType === 'touch';
		drag.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, active: !isTouch };
		if (!isTouch) {
			event.preventDefault(); // no text selection or native image drag
			moveTo(event.clientX);
		}
	};

	const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
		const current = drag.current;
		if (!current || current.id !== event.pointerId) return;
		if (!current.active && Math.abs(event.clientX - current.startX) > DRAG_THRESHOLD) current.active = true;
		if (current.active) moveTo(event.clientX);
	};

	const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
		const current = drag.current;
		if (!current || current.id !== event.pointerId) return;
		// A touch that barely moved is a tap: jump there. Anything else was a scroll attempt.
		const isTap =
			Math.abs(event.clientX - current.startX) <= DRAG_THRESHOLD &&
			Math.abs(event.clientY - current.startY) <= DRAG_THRESHOLD;
		if (!current.active && isTap) moveTo(event.clientX);
		drag.current = null;
	};

	// The browser took over (vertical scroll): leave the divider where it was
	const onPointerCancel = () => {
		drag.current = null;
	};

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const keys: Record<string, (value: number) => number> = {
			ArrowLeft: (v) => v - KEY_STEP,
			ArrowDown: (v) => v - KEY_STEP,
			ArrowRight: (v) => v + KEY_STEP,
			ArrowUp: (v) => v + KEY_STEP,
			Home: () => 0,
			End: () => 100,
		};
		const next = keys[event.key];
		if (!next) return;
		event.preventDefault();
		stopHint();
		// Snap to the 5% grid so keyboard steps stay tidy after a drag
		setPosition((value) => clamp(Math.round(next(value) / KEY_STEP) * KEY_STEP));
	};

	const showBefore = before.src && !failed.before;
	const showAfter = after.src && !failed.after;
	const rounded = Math.round(position);

	return (
		<div
			ref={rootRef}
			className="relative size-full touch-pan-y overflow-hidden select-none"
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerCancel}
		>
			{/* After: base layer */}
			{showAfter ? (
				<img
					src={after.src}
					srcSet={after.srcset}
					sizes={sizes}
					alt={after.alt}
					loading="lazy"
					decoding="async"
					draggable={false}
					onError={() => setFailed((f) => ({ ...f, after: true }))}
					className="absolute inset-0 size-full object-cover"
				/>
			) : (
				<Placeholder side="after" text={`${afterLabel}: ${after.placeholder ?? after.alt}`} />
			)}

			{/* Before: on top, clipped from the right so nothing reflows while dragging */}
			<div
				className="absolute inset-0"
				style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
			>
				{showBefore ? (
					<img
						src={before.src}
						srcSet={before.srcset}
						sizes={sizes}
						alt={before.alt}
						loading="lazy"
						decoding="async"
						draggable={false}
						onError={() => setFailed((f) => ({ ...f, before: true }))}
						className="absolute inset-0 size-full object-cover"
					/>
				) : (
					<Placeholder side="before" text={`${beforeLabel}: ${before.placeholder ?? before.alt}`} />
				)}
			</div>

			{/* Corner labels */}
			<span className="pointer-events-none absolute top-3 left-3 rounded-pill bg-metal-100/75 px-3 py-1 text-xs font-semibold text-ink backdrop-blur-sm sm:top-4 sm:left-4">
				{beforeLabel}
			</span>
			<span className="pointer-events-none absolute top-3 right-3 rounded-pill bg-metal-100/75 px-3 py-1 text-xs font-semibold text-ink backdrop-blur-sm sm:top-4 sm:right-4">
				{afterLabel}
			</span>

			{/* Divider */}
			<div
				className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-metal-100 shadow-[0_0_8px_color-mix(in_oklab,var(--color-ink)_35%,transparent)]"
				style={{ left: `${position}%` }}
			/>

			{/* Handle: follows the divider but stops short of the edges so it's never clipped */}
			<div
				role="slider"
					tabIndex={0}
					aria-label={ariaLabel}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={rounded}
					aria-valuetext={`${rounded}%`}
					aria-orientation="horizontal"
					onKeyDown={onKeyDown}
				className="absolute top-1/2 grid size-11 -translate-1/2 cursor-ew-resize place-items-center rounded-full bg-accent text-on-accent shadow-lift focus-visible:rounded-full focus-visible:outline-offset-2 focus-visible:outline-metal-100"
				style={{ left: `clamp(1.5rem, ${position}%, calc(100% - 1.5rem))` }}
			>
				<svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
				</svg>
			</div>
		</div>
	);
}

function Placeholder({ side, text }: { side: 'before' | 'after'; text: string }) {
	const isBefore = side === 'before';
	return (
		<div className={`absolute inset-0 p-3 sm:p-4 ${isBefore ? 'bg-metal-300' : 'bg-metal-100'}`} aria-hidden="true">
			<div
				// ink-muted text only on metal-200 or lighter, so the darker before side uses ink
				// Text sits low and stays within its half so it clears the centred handle
				className={`flex size-full items-end rounded-lg border-2 border-dashed border-ink-muted/70 p-4 text-xs font-medium sm:p-6 sm:text-sm ${
					isBefore ? 'justify-start text-left text-ink' : 'justify-end text-right text-ink-muted'
				}`}
			>
				<span className="max-w-[40%] text-balance">{text}</span>
			</div>
		</div>
	);
}
