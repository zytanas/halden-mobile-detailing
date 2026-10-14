/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Astro's Vite config, so content modules that import images resolve as they do in the site
export default getViteConfig({
	test: {
		include: ['src/**/*.test.ts'],
	},
});
