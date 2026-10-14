// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Production URL: absolute links in social previews (og:image, og:url) are built from this
  site: 'https://halden-mobile-detailing.vercel.app',

  vite: {
    plugins: [tailwindcss()],
    // The area map imports these lazily; pre-bundle them so dev doesn't re-optimise mid-session
    optimizeDeps: { include: ['leaflet', 'react-leaflet'] }
  },

  integrations: [react()]
});