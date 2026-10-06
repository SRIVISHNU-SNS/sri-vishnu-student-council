# Sri Vishnu for Students General Council — Implementation Plan

## Scope

Recreate the visible homepage structure and graphic treatment of `zohranfornyc.com` as a single-page student general council campaign site for Sri Vishnu. Preserve the reference’s composition, bold color blocking, two-column hero, headline/form hierarchy, spacing rhythm, and footer band. Replace all candidate/city/political language with student general council language, use the supplied Sri Vishnu logo, and remove the contribution/donation corner and its related calls to action.

## Approved design direction

- **Design movement:** Campaign-poster modernism: oversized condensed sans-serif headlines, hard color fields, thick outlined controls, and print-like blocks.
- **Core principles:** loud but legible; direct information hierarchy; high contrast; simple, action-oriented interactions.
- **Color philosophy:** warm orange creates energy and approachability; electric blue anchors trust and institutional clarity; red is reserved for high-attention actions; white panels create breathing room.
- **Layout paradigm:** a wide editorial split—brand/visual statement on the left, action form on the right—stacking into a single column on mobile.
- **Signature elements:** full-bleed orange field, blue footer block, italicized “for” accent, and red outlined action button.
- **Interaction philosophy:** low-friction, clear field labels, visible focus states, and no unnecessary steps or payment flow.
- **Animation:** subtle lift on buttons and links only; no decorative motion that competes with the poster-like composition.
- **Typography system:** system sans-serif stack with heavy uppercase display headings, italic accent text, and compact body copy.
- **Brand essence:** a student-first candidacy that listens, represents, and delivers; **clear, energetic, accountable**.
- **Brand voice:** concise, collective, and practical. Example lines: “A new voice for every student.” and “Let’s build a council that listens.”
- **Wordmark/logo:** use the supplied Sri Vishnu image as the source of truth in the header and hero brand panel.
- **Signature brand color:** electric blue `#2419dc`.

## Project structure

- `index.html` — single-page semantic shell and visible content hierarchy.
- `styles.css` — reference-inspired responsive layout, colors, typography, controls, and breakpoints.
- `script.js` — minimal form interaction and mobile navigation affordance; no network submission.
- `server.js` — dependency-free static server on the configured port.
- `public/manus-routes.json` — route manifest for the single `/` page.
- `public/logo.jpg` — managed storage path is used directly for the supplied logo.
- `plan.md` and `TODO.md` — approved scope and tracked outcomes.

## Serving

Use a dependency-free Node static server bound to `0.0.0.0:3000` for Preview. The page is intentionally static: no server, database, account, donation, or payment capability is needed.
