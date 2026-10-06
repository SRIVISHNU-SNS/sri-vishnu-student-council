# Sri Vishnu for Students General Council — Full-stack implementation plan

The site keeps the approved campaign-poster visual system: orange field, electric-blue structure, red action accents, bold display type, supplied Sri Vishnu logo, and supplied Sri Vishnu poster. Public pages are `/`, `/manifesto.html`, and `/about.html`; all share the same header, navigation, visual rhythm, and footer.

The join form stores first name, email, section, and mobile number in a file-backed SQLite database. The admin dashboard at `/admin.html` uses a deliberately simple email-only gate: entering the configured admin email grants access, with no password or OAuth step. The server stores an expiring HTTP-only admin session token and does not expose the configured email to the browser.

Admin users can filter applications, accept or reject them with an optional review note, and view active memberships. Acceptance creates a unique `SV-YYYY-XXXXXX` member code and a public membership card at `/membership-card.html?code=...`. The card displays the member’s first name, section, code, and a generated QR code. The QR code resolves to `/verify.html?code=...`, which checks the active membership record through the public API and displays a limited verification result.

The manifesto page reads its title, intro, sections, closing line, and photo URLs from the `site_content` table. The admin dashboard’s Edit manifesto tab allows all of those text fields and photo URLs to be changed without editing source code. The seed content includes the supplied project poster and logo as initial visuals.

The project uses a dependency-free Node HTTP server plus `better-sqlite3` and `qrcode`. `migrate.js` applies the SQLite migration. Production uses the included Dockerfile, with `SQLITE_DB_PATH=/var/data/sri-vishnu.sqlite` on a Render persistent disk, and `/api/health` for readiness.
