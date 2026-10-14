/** Client-side email check shared by the Club signup and the area waitlist (no backend yet) */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
	return EMAIL.test(value.trim());
}
