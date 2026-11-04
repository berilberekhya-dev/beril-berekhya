# Beril Berekhya | Portfolio

I build web applications, AI tools, and automations for the work people do every day.

**[Explore the portfolio](https://beril-berekhya.vercel.app/)** · [LinkedIn](https://www.linkedin.com/in/beril-berekhya/)

## Built with

Next.js App Router, React, TypeScript, CSS Modules, GSAP/ScrollTrigger, and Three.js. The site uses self-hosted Geist fonts and statically generated project pages.

## The experience

- A real 3D B sculpture: drag to rotate, release to return, and click/tap or use the keyboard to flip it.
- Draggable floating cards, a stable-width letter wave, and coordinated scroll scenes.
- A loading bar, four-verb opening, and split-curtain reveal on each document visit or refresh. Skip and Escape open the page immediately.
- Responsive project compositions, full case studies, and a complete About portrait.
- Reduced-motion support, visible keyboard focus, and readable content when animation is unavailable.
- Original social previews, contact links, a résumé download, and privacy/cookie controls.

## Work and content

The collection includes HiTalent, United Tractors Internal Web, Methodata, Family Gathering, Coal/Agro reporting, ASTRON onboarding, computer-vision research, palm-tree counting, the GMI Bahtera website, and a team drone project. Case studies distinguish production contributions, prepilot work, development, prototypes, and research.

- `src/data/profile.ts`: public biography, experience, achievements, and contacts.
- `src/data/projects.ts`: project narratives, stages, technologies, and media.
- `src/components/`: interactive UI and motion controllers.
- `src/app/`: homepage, work collection, case studies, policies, and metadata.
- `public/`: approved website imagery, fonts, and résumé.

Project imagery uses approved redacted captures or labeled synthetic examples. Private project code, working notes, source captures, and operational records are not part of this repository. The images and project identities illustrate Beril's contributions; they are not reusable template assets.

## Run locally

Use **Node.js 24**.

```sh
npm ci
npm run dev
```

Open the local URL printed by Next.js. No database, account, or environment variables are required to view the portfolio.

```sh
npm run typecheck
npm test
npm run build
npm run start
```

## Browser verification

Run a production preview separately, then use the focused checks:

```sh
node scripts/verify-intro.mjs http://127.0.0.1:3000
node scripts/verify-hero-playground.mjs http://127.0.0.1:3000
node scripts/verify-name-motion.mjs http://127.0.0.1:3000
node scripts/verify-social-preview.mjs http://127.0.0.1:3000
```

These scripts require Playwright and a browser. A local Playwright installation is detected first; `PLAYWRIGHT_MODULE` and `CHROME_PATH` can select another installation. Screenshots and recordings are written to the ignored `.artifacts/` folder.

The 4 November 2026 loading-bar release passed 20/20 focused checks on both local and public production builds, including six desktop/mobile viewports, repeat visits, Skip/Escape, hash landing, reduced motion, and script/font fallbacks. The production build and 11 unit tests also passed. Phone checks used Chromium touch-capable viewports; physical iPhone/Safari verification was unavailable. Older performance measurements do not establish a score for later revisions.

## Analytics and privacy

**Google Analytics is currently disabled.** `.env.example` lists the optional production settings. Analytics requires an enabled flag, a real GA4 measurement ID, the exact HTTPS site origin, and Vercel's production environment. Local development and previews remain ineligible.

Google tags load only after explicit analytics consent. Cookie settings allows rejection and withdrawal; consent expires after 180 days. Events use project slugs and channel names rather than contact details or document contents. Advertising features remain disabled.

Before activating analytics, configure the property and retention settings, review Enhanced Measurement to avoid duplicate events, update the published notices if processing changes, and verify consent behavior and event delivery on the production domain.

## Deploy to Vercel

Import this repository into Vercel as a Next.js project using Node.js 24. The committed `vercel.json` selects `npm ci` and `npm run build`.

Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS production origin. Leave analytics disabled unless its configuration and consent behavior have been verified. Git-driven deployments require connecting the repository to the Vercel project.

## Repository boundaries

This public repository starts with a reviewed snapshot of the working portfolio. Earlier development history and internal notes remain private. The ignore rules keep private documentation, raw screenshots, promotional drafts, credentials, local build output, and verification recordings out of future commits.
