# Halden Mobile Detailing

Website for Halden Mobile Detailing, built with **Astro**, **Tailwind CSS v4**, and **GSAP**.

## Project Structure

```text
/
├── public/                 # Static assets (favicon, images)
├── src/
│   ├── layouts/
│   │   └── Layout.astro    # Shared HTML shell, imports global.css
│   ├── pages/
│   │   └── index.astro     # Home page
│   ├── scripts/
│   │   └── animations.ts   # GSAP + ScrollTrigger animations
│   └── styles/
│       └── global.css      # Tailwind entry (@import "tailwindcss")
├── astro.config.mjs        # Tailwind wired in via @tailwindcss/vite
└── package.json
```

## Animations

`src/scripts/animations.ts` uses data attributes, so you can animate elements without writing JS:

- `data-hero`: fades up on page load, staggered
- `data-reveal`: fades up when scrolled into view

Animations are skipped for users with `prefers-reduced-motion` enabled.

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start dev server at `localhost:4321`        |
| `npm run build`   | Build the production site to `./dist/`      |
| `npm run preview` | Preview the production build locally        |
