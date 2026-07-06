# UI/UX Design System — "Liquid Glass" Identity

**Doc:** `ui-ux.md` · **Version:** 1.0 · **Status:** Baseline for build
**Applies to:** Passenger App, Driver App (Flutter), Admin Panel (Next.js)

The platform's visual identity is a **glassmorphic / liquid-glass** design language — frosted,
translucent surfaces floating above a live map — applied with discipline: glass is the *signature*,
not the wallpaper. Industry standards (Material 3 foundations, WCAG 2.2 AA, platform conventions)
remain the base layer; glass is the differentiating skin.

---

## 1. Design Principles

1. **Map-first, glass-above.** In both mobile apps the map IS the background. All UI floats over it as translucent glass layers — the core reason glassmorphism fits this product: content behind the panels (the city, the route, the moving car) stays perceivable.
2. **Glass with restraint.** Glass surfaces are reserved for *floating* elements: bottom sheets, cards, app bars, dialogs, chips. Full-screen forms and dense admin tables use calm solid surfaces — legibility beats style.
3. **One-hand, glanceable, driver-safe.** Primary actions in the bottom 40% of the screen; driver-facing controls oversized (min 56 dp) with high contrast for sunlight/vibration; nothing critical hidden behind gestures.
4. **Motion = liquid.** Transitions use soft spring curves, sheet morphs, and subtle specular sweeps — surfaces feel like they flow, never snap.
5. **Accessible always.** Every glass recipe must pass WCAG 2.2 AA contrast (4.5:1 text) over the *worst-case* map tile behind it. Blur ≠ excuse.
6. **Bilingual by design.** EN/UR from day one; Urdu (RTL) mirrors layout; Noto Nastaliq Urdu for Urdu text with adjusted line-height (glass cards must size to Nastaliq's tall glyphs).

---

## 2. Visual Language

### 2.1 Color system

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | `#0FA958` (EV green) | `#38D57F` | CTAs, active states, driver-online |
| `secondary` | `#0B3954` (deep petrol) | `#9AC1D9` | Headers, secondary actions |
| `accent` | `#00C2A8` (electric teal) | `#2EE6CB` | Live/tracking highlights, specular tints |
| `warn` | `#F5A524` | `#F7B84E` | Geofence warnings |
| `danger` | `#E5484D` | `#FF6B6E` | Violations, SOS, cancellations |
| `surface-solid` | `#F7F9FA` | `#0E1416` | Non-glass screens |
| `on-glass-text` | `#0B1215` @ 100% | `#F2F7F5` @ 100% | Text on glass is always fully opaque |

Semantic ride-status colors: matching = pulsing accent; assigned/arriving = primary; in-progress = accent; pending-payment = warn; completed = primary; cancelled/failed = danger.

### 2.2 The Glass Recipe (canonical tokens)

All glass surfaces derive from three tiers. **These are the only allowed glass styles** — no ad-hoc blurs.

| Token | Blur (σ) | Fill (light / dark) | Border | Shadow | Use |
|---|---|---|---|---|---|
| `glass/raised` | 24 | white 65% / #101820 55% | 1 px white 45% (top-lit gradient border) | 0 8 32 rgba(0,0,0,.12) | Bottom sheets, primary cards, nav bar |
| `glass/overlay` | 16 | white 50% / #101820 45% | 1 px white 30% | 0 4 16 rgba(0,0,0,.10) | Chips, pills, floating buttons, toasts |
| `glass/modal` | 40 | white 78% / #0B1215 70% | 1.5 px white 55% | 0 16 48 rgba(0,0,0,.20) | Dialogs, ride-offer takeover, payment sheet |

Liquid details that create the "liquid glass" signature:
- **Specular edge:** 1 px inner top border, gradient white→transparent — the light-catch line.
- **Sheen sweep:** on state change (e.g., driver assigned), a 600 ms diagonal highlight sweeps across the sheet once.
- **Refraction tint:** glass picks up 8% of `accent` when the surface is "live" (tracking active).
- **Depth rule:** max **2 glass layers** stacked; a third layer must be solid (readability + GPU).

### 2.3 Shape, type, iconography

- Radii: cards 24, sheets 28 (top corners), chips/pills 999, buttons 16. Squircle-smooth corners.
- Type: **Inter** (EN) / **Noto Nastaliq Urdu** (UR). Scale: Display 32/38 · H1 24/30 · H2 20/26 · Body 16/24 · Caption 13/18. Numerals tabular in fares/timers.
- Icons: Lucide (outlined, 1.75 px stroke); filled variants only for active nav states.
- Elevation via blur+shadow tiers above, never Material elevation overlays on glass.

### 2.4 Motion tokens

| Token | Spec | Use |
|---|---|---|
| `motion/sheet` | Spring (damping .85, ~350 ms) | Bottom sheet snap points |
| `motion/morph` | 300 ms ease-in-out-cubic container transform | Card → detail transitions |
| `motion/pulse` | 1.6 s soft opacity/scale loop | "Finding your driver…", live dots |
| `motion/sweep` | 600 ms specular sweep | State-change celebration |
| `motion/press` | Scale .97 + brightness +4%, 120 ms | All touch feedback on glass |
Reduced-motion OS setting disables sweep/pulse (fade instead).

---

## 3. Passenger App — Key Screens

| Screen | Layout & glass usage |
|---|---|
| **Home / Map** | Full-bleed map. Top: `glass/overlay` status pill ("You're in Clifton Zone" / "Outside service area"). Bottom: `glass/raised` sheet with greeting + "Where to?" field + big **Book a Ride** CTA. |
| **Set pickup/destination** | Draggable pin over map, `glass/overlay` address chip follows pin; confirm bar as raised glass. **No fare shown anywhere** — sheet copy explains: "Fare is calculated at ride end from time & distance." |
| **Matching** | Sheet morphs into radar state: pulsing accent rings over pickup, per-round copy ("Contacting nearby drivers… expanding search"), glass Cancel pill. |
| **Driver assigned / arriving** | Sheet shows driver photo, name, rating, EV badge, plate in high-contrast plate chip; live car marker glides (interpolated); ETA countdown; call (masked) + cancel actions. |
| **In-trip** | Minimal glass: slim top pill (elapsed time · km so far — *neutral info, not fare*), route polyline, SOS floating glass button (danger tint, always visible). |
| **Fare & payment** | `glass/modal` payment sheet: big fare numeral (count-up animation), expandable breakdown rows (base/distance/time/rounding), payment method segmented glass control (Cash · JazzCash · Card), pay CTA. Failure state swaps to danger-tinted glass with Retry / Switch method. |
| **Receipt & rating** | Receipt card (glass) with share/PDF; 5-star rater with haptic ticks; optional comment. |
| **History / Profile** | Solid surfaces, glass only for list cards' hover/pressed states. |

Empty/edge states specified: outside-zone, no-driver-found (retry), GPS off, offline banner, ride-cancelled-by-driver (auto-rematch notice).

## 4. Driver App — Key Screens

| Screen | Layout & glass usage |
|---|---|
| **Home** | Map + huge Online/Offline glass toggle (bottom). Online = primary-tinted glass with subtle pulse; zone status strip: green "Inside Korangi Zone" / red warning glass banner when outside (D-11). Today's earnings pill. |
| **Ride offer (takeover)** | Full-screen `glass/modal` over dimmed map: pickup point, straight-line distance to pickup, **circular countdown ring** (T_offer), giant Accept (primary) / Dismiss. Loud + haptic. Full-screen intent when backgrounded. |
| **To pickup** | Route + oversized Navigate button (deep-link), Arrived slide-action. Slide-to-confirm pattern for all irreversible actions (Arrived / Start / End) — prevents pocket taps. |
| **In-trip** | Elapsed time + distance tiles (large), End Ride slide control. |
| **Fare collection** | Fare numeral full-width; per method: Cash → "Cash received" slide-confirm; digital → live status of passenger payment with success/failed states. |
| **Earnings / History / Documents** | Solid lists; document upload flow with camera capture + status chips (pending/approved/rejected). |

Driver-mode rules: min touch target 56 dp, base type 18, auto dark theme at night, screen kept awake during active ride.

## 5. Admin Panel — Key Views

Aesthetic: **"glass-accented dashboard"** — app shell (sidebar, top bar) and KPI cards are glass over an ambient gradient mesh background; data tables, forms, and charts sit on solid `surface` for density and legibility.

| View | Contents |
|---|---|
| **Overview** | KPI glass cards (active rides, online drivers, today's revenue, open violations), live mini-map, match-rate sparkline. |
| **Live Fleet Map** | Full-screen map, vehicle markers color-coded (free/on-trip/violating/stale), zone polygons toggle, click → vehicle drawer (glass) with driver, last ping, actions. |
| **Zone Editor** | Draw/edit polygon with vertex handles, name/status form, version history timeline, impacted-vehicles warning on edit. |
| **Rides Monitor** | Filterable table; ride detail drawer with **trail replay** (play/scrub over map) + state timeline + fare breakdown + payment status. |
| **Violation Center** | Real-time queue (danger-tinted glass toasts on new), detail with map excursion path, ack/resolve/escalate actions, SLA timers. |
| **Driver Onboarding** | Kanban (pending → review → approved), document viewer with zoom, approve/reject with reason. |
| **Fare Config** | Current version card, "Create new version" wizard with effective-from date, diff vs previous, full audit list. Super Admin only. |
| **Reports** | Chart set (rides/zone/day, revenue by method, driver performance, violations) + CSV export. |
| **Audit Log / Settings / Broadcast** | Table + filters; dispatch-config form with guardrail hints. |

Admin standards: desktop-first 1280+, responsive to tablet; dark mode; command palette (⌘K); every destructive action confirms with typed reason.

## 6. Component Library & Implementation

- **Flutter:** design tokens as a `DesignTokens` theme extension; one `LiquidGlass` widget (BackdropFilter + gradient border + optional sheen) implementing the three tiers — *the only* sanctioned glass primitive. Golden tests lock its rendering.
- **Performance guardrails (critical for glassmorphism):** `BackdropFilter` is GPU-expensive — max 2 active blur regions per screen; blur disabled (fallback: 92%-opacity solid with same border/shadow) on low-end devices (detect via `flutter_displaymode`/frame-time probe); target 60 fps on a Redmi-class device; map marker interpolation on isolate.
- **Next.js:** Tailwind + shadcn/ui restyled with the same tokens (`backdrop-filter: blur()`, CSS custom properties exported from a shared `tokens.json` — single source of truth consumed by both Flutter codegen and Tailwind config).
- **Do-not list:** no glass on top of glass on top of glass; no blur under scrolling long lists (jank); no low-contrast gray-on-glass text; no glass for dense tables/forms.

## 7. UX Process & Deliverables (built into roadmap)

1. **Wireframes** (all flows above) → client sign-off — Phase 1, weeks 3–4.
2. **High-fidelity Figma** with the token library + liquid-glass component set → sign-off gate before mobile UI build.
3. **Interactive prototype** for the 3 critical flows (book→ride→pay; offer→trip→cash; violation handling) — used in usability tests with 5 drivers + 5 passengers (Urdu-first participants included).
4. **Design QA** checklist per screen at each release: token conformance, RTL, contrast (automated via Stark/axe), reduced-motion, low-end device fps.

## 8. Accessibility checklist (release gate)

- WCAG 2.2 AA contrast on all glass surfaces (validated over 5 worst-case map screenshots).
- TalkBack/VoiceOver labels on every actionable element; ride status changes announced.
- Dynamic type up to 130% without layout break; RTL snapshot tests for Urdu.
- Color never the sole signal (violations get icon + text, not just red).
- Haptics accompany all slide-confirms and offer alerts.
