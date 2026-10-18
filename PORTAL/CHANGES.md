# Changes log — Guangzhou Fashion Co. Ltd portal

## Login page (`app/login/page.tsx`)
- Removed the gradient color-block overlay on top of the background video ("figuras con gradiente"); replaced with a simple dark scrim for text contrast.
- Removed the split rectangular layout (video panel / white panel). The video now fills the whole screen and the login form floats on top as a glass card (`bg-white/10 backdrop-blur-xl`) — no hard straight-line separation.
- Removed the top header banner (`<Header variant="login" />`) — it didn't integrate with the full-bleed video layout.
- Title font changed twice: first to Alfa Slab One (rejected), settled on **Playfair Display** (bold serif), color changed to amber/orange (`--color-brand-amber: #f5a623`).

## Dashboard layout (`app/dashboard/layout.tsx`, `app/components/Header.tsx`)
- Removed the separate white sticky top banner. The header (brand mark, welcome message, logout) is now integrated inline inside the page's own padding, restyled smaller/transparent instead of a full-bleed bar with shadow/border.

## Dashboard page (`app/dashboard/page.tsx`)
- **Language**: all UI text confirmed/reverted to English (menus were always English; page content translated back from an earlier Spanish pass).
- **Layout**: company profile is now a tall rectangular card on the left; the 4 KPI cards form a 2×2 grid on the right (same total height as the profile card via CSS grid `items-stretch`); sales chart + invoices list sit full-width below.
- **Company profile card**: real Nextwear logo (`/nextwear-logo.png`, copied from the sibling `DASHBOARD_NEXTWEAR` project) replacing the placeholder "N" avatar, enlarged for legibility. Added mock company facts (account manager, trade lane, incoterm, payment terms, carrier, annual volume) and profile tags.
- **KPI cards**: compact, "floating" design — background photos from `videos/` (`barco.jpg`, `ropa.jpg`, `invoice.jpg`, `container.jpg`) each with its own gradient tint, colored ambient shadow on hover, trend badges, icons. Toned down the invoice-card tint after the photo was unreadable under solid red.
  - Note: `container.jpg` carries a visible Freepik watermark — used per explicit request, flagged as demo-only, not fit for production.
- **Sales chart** (`app/components/SalesChart.tsx`): rebuilt three times —
  1. Animated SVG line chart (basic).
  2. Editorial/journalistic style modeled after a reference chart image (`videos/grafica.jpg`) — flat shaded bands vs. average, dashed reference line.
  3. **Final**: grouped **vertical bar chart**, 2026 vs. 2025 per month, hover tooltip (month, both years, %YoY), y-axis gridlines, legend chips.
- **Invoices list**: converted from a wide table to a compact scrollable list; distinct visual treatment (dark header bar with Seigaiha pattern texture + invoice count badge, off-white list background, gold left-border accent on the pending row).
  - Added the new invoice `F-2026-00349` (copied from `invoices/` into `public/invoices/`), marked **Pending** with an active download button.
  - Existing invoices relabeled **Completed** (was "Downloaded") with their download button disabled (greyed out, non-interactive).
  - Added amount and date columns to each row.

## Assets added
- `public/nextwear-logo.png` — real Nextwear logo.
- `public/photos/barco.jpg`, `ropa.jpg`, `container.jpg`, `invoice.jpg` — sourced from the `videos/` folder for KPI card backgrounds.
- `public/invoices/F-2026-00349.pdf` — new invoice made downloadable.

## Global styles (`app/globals.css`)
- Removed the unused `animate-gradient` keyframe/class (the gradient overlay it powered was deleted).
- Added `animate-draw-line` keyframe for the chart's animated stroke draw-in.
- Added `--color-brand-amber` token for the login title color.

## Not done / follow-ups
- No git repository is initialized in this project, so nothing was committed — all changes are plain file edits on disk.
- `container.jpg`'s Freepik watermark should be replaced with a licensed/original photo before any real deployment.

## Session: background video, rename, transitions
- **Background video**: moved from the company profile card to the dashboard page background (`app/dashboard/layout.tsx`): fixed, behind all containers, `opacity-40`, `blur-[2px]`, with a vertical `neutral-bg` fade gradient so it stays subtle. Profile card now uses solid `bg-neutral-900`. Applies to `/dashboard/invoices` too.
- **Provider rename**: "SinoTrans Retail Logistics" / "SinoTrans Ocean" → "Guangzhou Fashion Co. Ltd" (Header, login, page title, profile text, carrier fact, seal aria-label). Not changed: `public/invoice-MDS-2025.pdf` (still shows old name), `package.json` name.
- **Login**: removed "Real-time visibility…" paragraph; title animates letter by letter (`animate-letter`); on submit the form block fades out (`animate-out`, 550 ms) before navigating.
- **Dashboard entrance**: staggered "soft notification" animation (`animate-notify`) — header, profile, facts, KPIs, chart, invoices, rows. Keyframes in `globals.css`; all disabled under `prefers-reduced-motion`.
