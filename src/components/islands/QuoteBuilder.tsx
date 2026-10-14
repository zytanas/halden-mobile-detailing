/**
 * Quote builder: postcode check, then size, package, add-ons and frequency, with a live
 * summary. Prices come from lib/pricing.ts, copy from content/quote.ts.
 *
 * Every choice is a real radio or checkbox inside a fieldset, styled as a card, so arrow
 * keys, Space and screen readers all work natively. The section script (quote.animation.ts)
 * adds the entrance motion and the tap on selection.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import AreaMap, { type MapFocus } from './AreaMap';
import Icon from '../ui/Icon';
import { buttonClass } from '../ui/button';
import type { IconName } from '../ui/icons';
import { addOns, formatPrice, packages, sizes, type SizeId } from '../../content/packages';
import { fill, quoteSection } from '../../content/quote';
import { isValidEmail } from '../../lib/email';
import { PRESELECT_EVENT, type Preselect } from '../../lib/events';
import { prefersReducedMotion } from '../../lib/motion';
import { checkPostcode, isValidPostcode, normalisePostcode, type PostcodeResult } from '../../lib/postcode';
import { bookingUrl, calculateQuote, FORTNIGHTLY_PACKAGE_ID, type Frequency, type Quote } from '../../lib/pricing';

const copy = quoteSection;

const DEFAULTS = { size: 'medium' as SizeId, package: 'full-valet' };

const sizeIcons: Record<SizeId, IconName> = { small: 'car-small', medium: 'car-medium', large: 'car-large' };

/** How long a card preselected from the Packages bento stays highlighted */
const HIGHLIGHT_MS = 1800;
/** Total count animation */
const COUNT_MS = 600;

/* ---------- Shared styles ---------- */

const inputClass =
	'min-h-13 w-full min-w-0 flex-1 rounded-pill border border-line bg-metal-100 px-5 text-ink transition-[border-color,box-shadow] duration-300 ease-out placeholder:text-ink-muted focus:border-accent focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_22%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-invalid:border-accent-deep';

/** Selectable card: a <label> wrapping a visually hidden radio or checkbox */
const optionClass = [
	'group relative flex cursor-pointer rounded-lg border border-line bg-surface',
	'transition-[border-color,background-color,box-shadow] duration-300 ease-out',
	'hover:border-ink-muted',
	'has-checked:border-accent has-checked:bg-metal-100 has-checked:shadow-soft has-checked:ring-1 has-checked:ring-accent',
	'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-deep',
].join(' ');

/* ---------- Hooks ---------- */

/** Eases the displayed number from its current value to the target on every change */
function useCountUp(target: number) {
	const [value, setValue] = useState(target);
	const current = useRef(target);

	useEffect(() => {
		if (prefersReducedMotion()) {
			current.current = target;
			setValue(target);
			return;
		}
		const from = current.current;
		const start = performance.now();
		let frame = 0;
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / COUNT_MS);
			const eased = 1 - (1 - t) ** 3;
			current.current = from + (target - from) * eased;
			setValue(current.current);
			if (t < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target]);

	return Math.round(value);
}

/* ---------- Component ---------- */

type Notify = { email: string; invalid: boolean; sent: boolean };
const NOTIFY_START: Notify = { email: '', invalid: false, sent: false };

export default function QuoteBuilder() {
	const id = useId();
	const ids = {
		postcode: `${id}-postcode`,
		postcodeStatus: `${id}-postcode-status`,
		notifyEmail: `${id}-notify-email`,
		notifyError: `${id}-notify-error`,
		area: `${id}-area`,
		sheet: `${id}-sheet`,
	};

	const [sizeId, setSizeId] = useState<SizeId>(DEFAULTS.size);
	const [packageId, setPackageId] = useState(DEFAULTS.package);
	const [addOnIds, setAddOnIds] = useState<string[]>([]);
	const [frequency, setFrequency] = useState<Frequency>('one-off');
	const [firstBooking, setFirstBooking] = useState(false);

	const [postcodeInput, setPostcodeInput] = useState('');
	const [result, setResult] = useState<PostcodeResult | null>(null);
	const [checks, setChecks] = useState(0);
	const [notify, setNotify] = useState<Notify>(NOTIFY_START);

	const [highlight, setHighlight] = useState<string | null>(null);
	const [barVisible, setBarVisible] = useState(false);
	const [sheetOpen, setSheetOpen] = useState(false);

	const rootRef = useRef<HTMLDivElement>(null);
	const postcodeRef = useRef<HTMLInputElement>(null);
	const notifyRef = useRef<HTMLInputElement>(null);
	const notifyStatusRef = useRef<HTMLDivElement>(null);
	const sheetToggleRef = useRef<HTMLButtonElement>(null);

	const quote = useMemo(
		() => calculateQuote({ packageId, sizeId, addOnIds, frequency, firstBooking }),
		[packageId, sizeId, addOnIds, frequency, firstBooking],
	);
	const displayTotal = useCountUp(quote.total);

	const covered = result?.status === 'covered' ? result : null;
	const isWash = packageId === FORTNIGHTLY_PACKAGE_ID;

	const mapFocus = useMemo<MapFocus | null>(() => (covered ? { town: covered.town, key: checks } : null), [covered, checks]);

	/* ----- Preselect from the Packages bento ----- */

	const applyPreselect = useCallback((choice: Preselect) => {
		window.__haldenPreselect = undefined;
		if (choice.kind === 'package' && packages.some((p) => p.id === choice.id)) {
			setPackageId(choice.id);
		} else if (choice.kind === 'addon' && addOns.some((a) => a.id === choice.id)) {
			setAddOnIds((current) => (current.includes(choice.id) ? current : [...current, choice.id]));
		} else {
			return;
		}
		setHighlight(`${choice.kind}:${choice.id}`);
	}, []);

	useEffect(() => {
		// A click that happened before this island hydrated
		if (window.__haldenPreselect) applyPreselect(window.__haldenPreselect);
		const onPreselect = (event: CustomEvent<Preselect>) => applyPreselect(event.detail);
		window.addEventListener(PRESELECT_EVENT, onPreselect);
		return () => window.removeEventListener(PRESELECT_EVENT, onPreselect);
	}, [applyPreselect]);

	useEffect(() => {
		if (!highlight) return;
		const timer = window.setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
		return () => window.clearTimeout(timer);
	}, [highlight]);

	/* ----- Mobile summary bar: shown while the builder is on screen ----- */

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const observer = new IntersectionObserver(([entry]) => {
			setBarVisible(entry.isIntersecting);
			if (!entry.isIntersecting) setSheetOpen(false);
		});
		observer.observe(root);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!sheetOpen) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			setSheetOpen(false);
			sheetToggleRef.current?.focus();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [sheetOpen]);

	/* ----- Postcode ----- */

	const onPostcodeInput = (value: string) => {
		setPostcodeInput(value);
		if (!result) return;
		// Editing a checked postcode locks booking again until it's re-checked
		if (result.status === 'invalid' ? isValidPostcode(value) : normalisePostcode(value) !== result.postcode) {
			setResult(null);
		}
	};

	const onCheck = (event: FormEvent) => {
		event.preventDefault();
		const next = checkPostcode(postcodeInput);
		setResult(next);
		setChecks((n) => n + 1);
		setNotify(NOTIFY_START);
		if (next.status === 'invalid') postcodeRef.current?.focus();
		else setPostcodeInput(next.postcode);
	};

	const postcodeMessage = (() => {
		if (!result) return null;
		if (result.status === 'covered')
			return { icon: 'check' as const, tone: 'covered', text: fill(copy.postcode.messages.covered, { town: result.town }) };
		if (result.status === 'not-covered')
			return {
				icon: 'info' as const,
				tone: 'info',
				text: fill(copy.postcode.messages.notCovered, { postcode: result.outward }),
			};
		return { icon: 'info' as const, tone: 'error', text: copy.postcode.messages.invalid };
	})();

	/* ----- Not covered: waitlist ----- */

	const onNotify = (event: FormEvent) => {
		event.preventDefault();
		if (!isValidEmail(notify.email)) {
			// Clear first, so the same mistake twice is announced again
			setNotify((n) => ({ ...n, invalid: false }));
			requestAnimationFrame(() => setNotify((n) => ({ ...n, invalid: true })));
			notifyRef.current?.focus();
			return;
		}
		// TODO: send notify.email and the outward code to a real waitlist (e.g. the newsletter
		// provider's API), and only show success once it responds OK.
		setNotify((n) => ({ ...n, invalid: false, sent: true }));
	};

	// The focused button has gone, so move focus to the message
	useEffect(() => {
		if (notify.sent) notifyStatusRef.current?.focus();
	}, [notify.sent]);

	/* ----- Selections ----- */

	const toggleAddOn = (addOnId: string, on: boolean) =>
		setAddOnIds((current) => (on ? [...current, addOnId] : current.filter((a) => a !== addOnId)));

	const book = () => {
		if (!covered) return;
		window.open(bookingUrl(quote, covered.postcode), '_blank', 'noopener,noreferrer');
	};

	const highlighted = (key: string) => (highlight === key ? '' : undefined);

	/* ----- Summary pieces (desktop card and mobile sheet) ----- */

	const areaLine = (() => {
		if (covered) return { icon: 'pin' as const, text: fill(copy.summary.area.covered, covered) };
		if (result?.status === 'not-covered')
			return { icon: 'info' as const, text: fill(copy.summary.area.notCovered, { postcode: result.outward }) };
		return { icon: 'pin' as const, text: copy.summary.area.notChecked };
	})();

	const bookButton = (size: 'md' | 'sm', className = '') => (
		<button
			type="button"
			disabled={!covered}
			onClick={book}
			aria-describedby={ids.area}
			className={`${buttonClass({ size })} ${className}`}
		>
			{covered ? (
				<>
					{copy.summary.button}
					<Icon name="arrow" className="size-4" />
				</>
			) : (
				<>
					<Icon name="lock" className="size-4 shrink-0" />
					{copy.summary.lockedButton}
				</>
			)}
		</button>
	);

	return (
		<div ref={rootRef} className="grid grid-cols-1 gap-y-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-x-10 xl:gap-x-14">
			{/* ---------- Steps ---------- */}
			<div className="flex min-w-0 flex-col gap-4">
				<Step number={1} title={copy.steps.postcode}>
					<div className="grid gap-6 @2xl:grid-cols-2">
						<div className="@container/postcode min-w-0">
							<form noValidate onSubmit={onCheck}>
								<label htmlFor={ids.postcode} className="block text-sm font-semibold text-ink">
									{copy.postcode.label}
								</label>
								<div className="mt-2 flex flex-col gap-3 @2xs/postcode:flex-row">
									<input
										ref={postcodeRef}
										id={ids.postcode}
										name="postcode"
										type="text"
										inputMode="text"
										autoComplete="postal-code"
										autoCapitalize="characters"
										spellCheck={false}
										placeholder={copy.postcode.placeholder}
										value={postcodeInput}
										onChange={(event) => onPostcodeInput(event.target.value)}
										aria-invalid={result?.status === 'invalid' || undefined}
										aria-describedby={ids.postcodeStatus}
										className={`${inputClass} uppercase placeholder:normal-case`}
									/>
									<button type="submit" className={`${buttonClass({ variant: 'dark' })} shrink-0`}>
										{copy.postcode.button}
									</button>
								</div>
							</form>

							<div id={ids.postcodeStatus} role="status" aria-live="polite" className="mt-3 min-h-6">
								{postcodeMessage && (
									<p
										key={checks}
										className={`flex items-start gap-2.5 text-[0.9375rem] leading-snug font-medium ${
											postcodeMessage.tone === 'error' ? 'text-accent-deep' : 'text-ink'
										}`}
									>
										<span
											className={`mt-px grid size-5 shrink-0 place-items-center rounded-full ${
												postcodeMessage.tone === 'covered'
													? 'bg-accent text-on-accent'
													: postcodeMessage.tone === 'error'
														? 'text-accent-deep'
														: 'text-ink-muted'
											}`}
										>
											<Icon name={postcodeMessage.icon} className={postcodeMessage.tone === 'covered' ? 'size-3' : 'size-5'} />
										</span>
										{postcodeMessage.text}
									</p>
								)}
							</div>

							{result?.status === 'not-covered' && (
								<div className="mt-5">
									{notify.sent ? (
										<div ref={notifyStatusRef} role="status" tabIndex={-1}>
											<p className="flex items-start gap-3 rounded-lg border border-line bg-metal-100 px-5 py-4 text-[0.9375rem] font-medium text-ink shadow-soft">
												<span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
													<Icon name="check" className="size-3" />
												</span>
												{fill(copy.notify.success, { postcode: result.outward })}
											</p>
										</div>
									) : (
										<form noValidate onSubmit={onNotify} className="@container/notify">
											<label htmlFor={ids.notifyEmail} className="block text-sm font-semibold text-ink">
												{copy.notify.label}
											</label>
											<div className="mt-2 flex flex-col gap-3 @2xs/notify:flex-row">
												<input
													ref={notifyRef}
													id={ids.notifyEmail}
													name="email"
													type="email"
													inputMode="email"
													autoComplete="email"
													spellCheck={false}
													required
													placeholder={copy.notify.placeholder}
													value={notify.email}
													onChange={(event) => {
														const email = event.target.value;
														// Once flagged, clear the error as soon as the address becomes valid
														setNotify((n) => ({ ...n, email, invalid: n.invalid && !isValidEmail(email) }));
													}}
													aria-invalid={notify.invalid || undefined}
													aria-describedby={ids.notifyError}
													className={inputClass}
												/>
												<button type="submit" className={`${buttonClass()} shrink-0`}>
													{copy.notify.button}
												</button>
											</div>
											<p
												id={ids.notifyError}
												aria-live="polite"
												className="mt-2 min-h-5 text-sm leading-5 font-medium text-accent-deep"
											>
												{notify.invalid ? copy.notify.error : ''}
											</p>
										</form>
									)}
								</div>
							)}
						</div>

						<div className="min-w-0">
							<AreaMap focus={mapFocus} />
							<p className="mt-3 text-xs leading-relaxed text-ink-muted">{copy.postcode.areasLine}</p>
						</div>
					</div>
				</Step>

				<Step number={2} title={copy.steps.size}>
					<div className="grid gap-3 @xl:grid-cols-3">
						{sizes.map((size) => (
							<label key={size.id} className={`${optionClass} items-center gap-4 p-4 @xl:flex-col @xl:items-start @xl:gap-3 @xl:p-5`} data-quote-option>
								<input
									type="radio"
									name={`${id}-size`}
									value={size.id}
									checked={sizeId === size.id}
									onChange={() => setSizeId(size.id)}
									className="sr-only"
								/>
								<Icon
									name={sizeIcons[size.id]}
									className="h-8 w-14 shrink-0 text-ink-muted transition-colors duration-300 group-has-checked:text-accent"
								/>
								<span className="flex min-w-0 flex-col pr-8 @xl:pr-0">
									<span className="font-semibold text-ink">{size.label}</span>
									<span className="text-sm text-ink-muted">{size.examples}</span>
								</span>
								<CheckBadge />
							</label>
						))}
					</div>
				</Step>

				<Step number={3} title={copy.steps.package}>
					<div className="grid gap-3 @lg:grid-cols-2">
						{packages.map((pkg) => (
							<label
								key={pkg.id}
								className={`${optionClass} flex-col gap-1 p-5`}
								data-quote-option
								data-highlight={highlighted(`package:${pkg.id}`)}
							>
								<input
									type="radio"
									name={`${id}-package`}
									value={pkg.id}
									checked={packageId === pkg.id}
									onChange={() => setPackageId(pkg.id)}
									className="sr-only"
								/>
								{pkg.badge && (
									<span className="absolute -top-2.5 left-4 rounded-pill bg-ink px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-on-accent uppercase">
										{pkg.badge}
									</span>
								)}
								<span className="heading pr-8 text-2xl text-ink">{pkg.name}</span>
								<span className="flex items-center gap-1.5 text-sm text-ink-muted">
									<Icon name="clock" className="size-3.5" />
									{pkg.duration}
								</span>
								<span className="mt-2 text-lg font-semibold text-accent-deep tabular-nums">
									{formatPrice(pkg.prices[sizeId])}
								</span>
								<CheckBadge />
							</label>
						))}
					</div>
				</Step>

				<Step number={4} title={copy.steps.addOns}>
					<div className="flex flex-wrap gap-2.5">
						{addOns.map((addOn) => (
							<label
								key={addOn.id}
								className={`${optionClass} min-h-11 items-center gap-2 rounded-pill py-2 pr-4 pl-3 text-sm`}
								data-quote-option
								data-highlight={highlighted(`addon:${addOn.id}`)}
							>
								<input
									type="checkbox"
									name={`${id}-addons`}
									value={addOn.id}
									checked={addOnIds.includes(addOn.id)}
									onChange={(event) => toggleAddOn(addOn.id, event.target.checked)}
									className="sr-only"
								/>
								<span className="grid size-5 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-colors duration-300 group-has-checked:border-accent group-has-checked:bg-accent group-has-checked:text-on-accent">
									<Icon name="plus" className="size-3 group-has-checked:hidden" />
									<Icon name="check" className="hidden size-3 group-has-checked:block" />
								</span>
								<span className="font-medium text-ink">{addOn.name}</span>
								<span className="font-semibold text-accent-deep tabular-nums">
									{copy.addOnPrefix}
									{formatPrice(addOn.price)}
								</span>
							</label>
						))}
					</div>
				</Step>

				{/* Only for the Maintenance Wash; collapses to nothing (and leaves the tab order) otherwise */}
				<div
					className={`-mt-4 grid transition-[grid-template-rows,opacity] duration-(--duration-base) ease-out motion-reduce:transition-none ${
						isWash ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
					}`}
					inert={!isWash}
					aria-hidden={!isWash || undefined}
				>
					{/* Padding on an inner box: on the collapsing box itself it couldn't shrink to zero */}
					<div className="min-h-0 overflow-hidden">
						<div className="pt-4">
						<Step number={5} title={copy.steps.frequency}>
							<div className="grid gap-3 @lg:grid-cols-2">
								{(
									[
										{ value: 'one-off', label: copy.frequency.oneOff },
										{ value: 'fortnightly', label: copy.frequency.fortnightly },
									] as const
								).map((option) => (
									<label key={option.value} className={`${optionClass} items-center p-4 pr-12`} data-quote-option>
										<input
											type="radio"
											name={`${id}-frequency`}
											value={option.value}
											checked={frequency === option.value}
											onChange={() => setFrequency(option.value)}
											className="sr-only"
										/>
										<span className="font-semibold text-ink">{option.label}</span>
										<CheckBadge className="top-1/2 right-4 -translate-y-1/2" />
									</label>
								))}
							</div>
						</Step>
						</div>
					</div>
				</div>

				<label className="group mt-2 flex cursor-pointer items-center gap-3 self-start rounded-sm text-[0.9375rem] font-medium text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent-deep"
					data-quote-step
					suppressHydrationWarning
				>
					<input
						type="checkbox"
						checked={firstBooking}
						onChange={(event) => setFirstBooking(event.target.checked)}
						className="sr-only"
					/>
					<span className="grid size-6 shrink-0 place-items-center rounded-sm border border-ink-muted bg-metal-100 text-on-accent transition-colors duration-300 group-has-checked:border-accent group-has-checked:bg-accent">
						<Icon name="check" className="size-3.5 opacity-0 transition-opacity duration-200 group-has-checked:opacity-100" />
					</span>
					{copy.firstBooking}
				</label>
			</div>

			{/* ---------- Summary: sticky card from lg ---------- */}
			<aside
				aria-label={copy.summary.title}
				className="quote-summary metal metal-sheen hidden rounded-xl border border-metal-100/80 p-7 shadow-lift lg:sticky lg:top-(--space-scroll-offset) lg:block xl:p-9"
				data-quote-summary
				suppressHydrationWarning
			>
				<div className="relative z-2">
					<h3 className="heading text-card-title text-ink">{copy.summary.title}</h3>
					<SummaryDetails quote={quote} areaLine={areaLine} areaId={ids.area} className="mt-5" />
					<div className="mt-6 border-t border-line pt-5">
						<p className="text-sm font-semibold text-ink">{copy.summary.totalLabel}</p>
						<Total value={displayTotal} final={quote.total} className="text-display" />
					</div>
					{bookButton('md', 'mt-6 w-full')}
					<p className="mt-3 text-center text-sm text-ink-muted">{copy.summary.note}</p>
				</div>
			</aside>

			{/* ---------- Summary: compact bar below lg, expands into the full summary ---------- */}
			<div
				className={`fixed inset-x-0 bottom-0 z-45 transition-[translate] duration-(--duration-header) ease-out motion-reduce:transition-none lg:hidden ${
					barVisible ? 'translate-y-0' : 'translate-y-full'
				}`}
				inert={!barVisible}
			>
				<section
					aria-label={copy.summary.barLabel}
					className="border-t border-line bg-metal-100/90 shadow-lift backdrop-blur-xl"
				>
					<div
						id={ids.sheet}
						className={`grid transition-[grid-template-rows] duration-(--duration-base) ease-out motion-reduce:transition-none ${
							sheetOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
						}`}
						inert={!sheetOpen}
					>
						<div className="min-h-0 overflow-hidden">
							<div className="mx-auto max-h-[60svh] w-full max-w-site overflow-y-auto px-gutter pt-5 pb-2">
								<h3 className="heading text-2xl text-ink">{copy.summary.title}</h3>
								<SummaryDetails quote={quote} areaLine={areaLine} className="mt-3" />
								<p className="mt-4 text-sm text-ink-muted">{copy.summary.note}</p>
							</div>
						</div>
					</div>

					<div className="mx-auto flex w-full max-w-site items-center gap-3 px-gutter pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
						<button
							ref={sheetToggleRef}
							type="button"
							aria-expanded={sheetOpen}
							aria-controls={ids.sheet}
							onClick={() => setSheetOpen((open) => !open)}
							className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-sm text-left"
						>
							<span className="flex flex-col">
								<span className="text-xs font-semibold text-ink-muted">{copy.summary.totalLabel}</span>
								<Total value={displayTotal} final={quote.total} className="text-3xl" />
							</span>
							<span className="grid size-8 place-items-center rounded-full border border-line text-ink">
								<Icon
									name="chevron-up"
									className={`size-4 transition-transform duration-300 ${sheetOpen ? 'rotate-180' : ''}`}
								/>
							</span>
							<span className="sr-only">{sheetOpen ? copy.summary.collapse : copy.summary.expand}</span>
						</button>
						{bookButton('sm', 'min-h-11 flex-1 px-4 text-center leading-tight')}
					</div>
				</section>
			</div>

			{/* One polite announcement per change, whichever summary is showing */}
			<p className="sr-only" aria-live="polite" aria-atomic="true">
				{fill(copy.summary.totalAnnouncement, { total: formatPrice(quote.total) })}
			</p>
		</div>
	);
}

/* ---------- Pieces ---------- */

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
	return (
		<fieldset
			className="@container min-w-0 rounded-xl border border-line bg-surface p-5 sm:p-7"
			data-quote-step
			suppressHydrationWarning
		>
			<legend className="float-left mb-5 flex w-full items-center gap-3">
				<span
					className="heading grid size-9 shrink-0 place-items-center rounded-full bg-ink pt-0.5 text-lg text-on-accent"
					aria-hidden="true"
				>
					{number}
				</span>
				<span className="heading text-2xl text-ink sm:text-3xl">{title}</span>
			</legend>
			<div className="clear-both">{children}</div>
		</fieldset>
	);
}

function CheckBadge({ className = 'top-3 right-3' }: { className?: string }) {
	return (
		<span
			className={`absolute grid size-6 scale-50 place-items-center rounded-full bg-accent text-on-accent opacity-0 transition-[opacity,scale] duration-300 ease-out group-has-checked:scale-100 group-has-checked:opacity-100 ${className}`}
			aria-hidden="true"
		>
			<Icon name="check" className="size-3.5" />
		</span>
	);
}

function Total({ value, final, className }: { value: number; final: number; className: string }) {
	return (
		<p className={`heading text-ink tabular-nums ${className}`}>
			<span aria-hidden="true">{formatPrice(value)}</span>
			<span className="sr-only">{formatPrice(final)}</span>
		</p>
	);
}

function SummaryDetails({
	quote,
	areaLine,
	areaId,
	className = '',
}: {
	quote: Quote;
	areaLine: { icon: IconName; text: string };
	areaId?: string;
	className?: string;
}) {
	const { summary } = copy;
	return (
		<div className={className}>
			<p id={areaId} className="flex items-center gap-2 text-sm font-medium text-ink">
				<Icon name={areaLine.icon} className="size-4 shrink-0 text-accent" />
				{areaLine.text}
			</p>

			<dl className="mt-4 flex flex-col gap-2.5 text-[0.9375rem]">
				<Line
					label={fill(summary.lineItem, { package: quote.package.name, size: quote.size.label })}
					value={formatPrice(quote.base)}
				/>
				{quote.addOns.map((addOn) => (
					<Line key={addOn.id} label={addOn.name} value={`${copy.addOnPrefix}${formatPrice(addOn.price)}`} />
				))}
				{quote.discount && (
					<Line
						label={summary.discounts[quote.discount.id]}
						value={`${summary.minus}${formatPrice(quote.discount.amount)}`}
						accent
					/>
				)}
			</dl>
			{quote.discount && <p className="mt-2 text-xs text-ink-muted">{summary.offerRule}</p>}
		</div>
	);
}

function Line({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
	return (
		<div className={`flex items-baseline justify-between gap-4 ${accent ? 'font-semibold text-accent-deep' : 'text-ink'}`}>
			<dt className="min-w-0">{label}</dt>
			<dd className="shrink-0 font-semibold tabular-nums">{value}</dd>
		</div>
	);
}
