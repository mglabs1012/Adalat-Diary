---
name: Adalat Diary
platform: Responsive — Android-first PWA, full desktop layout
colors:
  background: '#f8f9ff'
  on-background: '#0f172a'
  surface: '#f8f9ff'
  surface-dim: '#d8dbe8'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4fb'
  surface-container: '#eceff8'
  surface-container-high: '#e5e9f4'
  surface-container-highest: '#dee3f0'
  surface-variant: '#dee3f0'
  on-surface: '#0f172a'
  on-surface-variant: '#4a5160'
  inverse-surface: '#28313c'
  inverse-on-surface: '#eef1f9'
  outline: '#757a85'
  outline-variant: '#c7ccd8'
  surface-tint: '#1a2b49'
  primary: '#1a2b49'
  on-primary: '#ffffff'
  primary-container: '#0b1f33'
  on-primary-container: '#b6c7ec'
  inverse-primary: '#b5c8e3'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#b5c8e3'
  on-primary-fixed: '#081b38'
  on-primary-fixed-variant: '#36485e'
  secondary: '#8a6400'
  on-secondary: '#ffffff'
  secondary-container: '#fec342'
  on-secondary-container: '#4a3400'
  secondary-fixed: '#ffdea4'
  secondary-fixed-dim: '#f8bd3d'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5d4200'
  tertiary: '#4f46e5'
  on-tertiary: '#ffffff'
  tertiary-container: '#ede9fe'
  on-tertiary-container: '#3323cc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  success: '#18794e'
  success-container: '#dcfce7'
  on-success-container: '#166534'
typography:
  display-mobile:
    fontFamily: Poppins
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Poppins
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Poppins
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  legal-code:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-xxs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
  gutter: 1rem
  screen-margin: 1rem
  app-bar: 3.5rem
  nav-height: 4.25rem
  fab-size: 3.25rem
---

## What this app is

**Adalat Diary** is a personal court diary for a practising advocate. It answers three
questions, in this order of importance:

1. **What is listed today?**
2. **What is coming up, and what date has already passed?**
3. **What is the record of this file?**

Everything else is subordinate. The app is Android-first — it is used one-handed, standing
in a corridor, often with no signal — and installs as a PWA. The responsive web layout is a
second-priority expansion of the same code, not a separate product.

### The record

Seven fields carry the diary. They are the ones that appear on every card, every export and
every screen:

| Field | Meaning |
| --- | --- |
| `crn` | Case Registration Number. Optional — a matter is often opened before the registry issues one — but unique within a chamber where present. |
| `preDate` | The previous hearing date. |
| `court` | The establishment, chosen from the 93 registry codes. |
| `party1` | Petitioner / Plaintiff / Complainant. |
| `party2` | Respondent / Defendant / Accused. |
| `stage` | Where the matter has reached procedurally. |
| `nextDate` | The next date of hearing. The single most valuable value in the app. |

Case detail (case number, court room, judge, purpose, client, notes) hangs off the record in
a second card that is **collapsed by default**, behind a disclosure chevron. The seven fields
are what a matter needs to exist; everything else is context you add when you have it, and
it should not stand between the advocate and a saved record.

## Brand & Style

The design system sits at the meeting point of Google Material 3 Expressive and
high-precision legal tooling. It should project judicial authority, discretion, and
operational clarity — a chamber file rendered on glass. The tone is refined ink on archival
paper: subtle tonal depth, tactile controls, deliberate whitespace, nothing decorative
competing with a date.

The single design rule that outranks all others: **a date must never be ambiguous.** Every
date is rendered in tabular figures, given a colour that encodes urgency, and paired with a
plain-language relative reading ("Today", "in 4 days", "5 days ago").

## Colours

An executive hierarchy anchored in deep judicial slate, warmed by legal ochre.

- **Primary `#1A2B49`** — judicial authority and structure. App bars, primary CTAs, the
  board header, active states.
- **Secondary `#8A6400` / container `#FEC342`** — legal amber. Reserved almost entirely for
  *time*: today's listing, the edge strip on a card listed today, the active nav pill. Amber
  in this app means "this needs you today".
- **Tertiary `#4F46E5`** — indigo, for utility affordances (links, phone actions, export)
  that are neither authority nor urgency.
- **Error `#BA1A1A`** — a passed date is an error state, not a warning. It is the one thing
  that can lose a client their case.
- **Success `#18794E`** — disposed matters and a healthy sync.
- **Surfaces** — alabaster canvas (`#F8F9FF`) with cards lifted in pure white for optical
  depth.

Dark theme is a token swap on `.dark`, not a second set of components. Every colour is
declared once as a CSS variable in `src/app/globals.css`. The dark ramp is deeper and less
saturated than a straight inversion would give — the surfaces read as *dark* rather than as
navy — with `outline-variant` lifted so hairlines and dividers still register, and the
tertiary and error *containers* muted, since a container is a background and has no business
being vivid.

**Brand surfaces do not invert.** The board hero, the next-date panel and the sign-in screen
use `.brand-panel` and the `*-fixed` tokens, which hold their value in both themes. Built
from `bg-primary` they flipped to pale blue in dark mode while the text on them stayed pale,
and the supporting copy disappeared.

### Procedural stage indicators

Low-saturation pastels, so a docket of twenty cards still reads calmly:

| Group | Stages | Light |
| --- | --- | --- |
| Notice | Appearance, Notice / Summons | `#FEF3C7` on `#92400E` |
| Filing | Written statement, Framing of issues, Execution | `#E2E8F0` on `#334155` |
| Evidence | Evidence, Cross examination | `#DBEAFE` on `#1E40AF` |
| Arguments | Arguments, Final arguments | `#EDE9FE` on `#5B21B6` |
| Order | Judgment, Order, Disposed | `#DCFCE7` on `#166534` |

## Typography

Two families, and only two. Both self-hosted at build time via `next/font` — no runtime
request to a font CDN, because the app must render correctly with the radio off.

- **Poppins** (500/600/700) carries every heading: the board date, cause titles, section
  headers, stat counters, sheet titles, the 404 and error screens. Its geometric, slightly
  warm forms give the app a voice that a grotesque alone would not — authoritative without
  being austere. Applied through `font-display`, and automatically to `h1`/`h2`/`h3`.
- **Inter** (400/500/600/700) carries everything else: body copy, labels, form fields, chips,
  navigation, and every number. At 12–14px on a 6" screen nothing beats it, and its tabular
  figures are what keep a column of dates from drifting.

The division is strict. If it is a heading, it is Poppins; if it is information you read
rather than scan, it is Inter. Nothing else is loaded.

Every CRN, case number, date and counter carries `font-variant-numeric: tabular-nums`
(the `.tnum` utility). Without it, digits drift across a column of cause-list rows and the
list becomes unreadable at a glance. Uppercase micro-labels use `+0.04em` tracking so they
survive at 10px on a 6" screen.

## Layout & Spacing

An 8-point grid with a 4-point micro-grid for icons and badges. One breakpoint carries the
whole responsive story: **`lg` (1024px)**. Below it the app is a phone; above it, a desktop
application. There is no awkward in-between state to design for.

### Containers

Three `.page*` classes in `globals.css` decide every screen's measure, so no screen invents
its own width:

| Class | Mobile | Desktop | Used by |
| --- | --- | --- | --- |
| `.page` | `max-w-screen-sm`, 16px gutter | `max-w-page` (78rem), 32px gutter | Board, docket, diary, case detail, settings |
| `.page-form` | same | `max-w-form` (46rem) | New case, edit case |
| `.page-narrow` | same | `max-w-prose` (38rem) | Long-form copy |

The app bar takes a `width` prop matching the screen below it, so a form's title sits on the
same left edge as the form itself rather than drifting to the window edge.

### Mobile (< 1024px)

- Single column, `16px` lateral margin. `12px` between cards in a group, `24px` between
  sections.
- **Bottom navigation** — four destinations with the "New case" FAB docked at the centre.
  The thumb never leaves the bottom third of the screen. Every scrollable screen ends in
  `pb-nav`, which clears the bar *and* the gesture inset.
- Primary actions are pinned above that bar: the "Record next date" CTA floats over the
  case detail rather than waiting at the bottom of a scroll.

### Desktop (≥ 1024px)

- **The bottom bar is replaced by a fixed 240px sidebar** (`SideNav`) carrying the brand, a
  "New case" button, the four destinations with live counts, and the account chip. A
  four-tab bar across a 1440px viewport wastes the space; a sidebar gives the docket and
  the board their full height back. Content is offset by `lg:pl-side-nav`; the app bar,
  sync banner and toaster all start after it.
- **Screens gain a second column** rather than simply stretching:
  - *Board* — the hero becomes an inset card; stats go 2×2 → 1×4; the cause list leads a
    1.6 : 1 split with "Coming up" and the docket summary beside it.
  - *Docket & Diary* — cards flow into two columns at `xl`, and the stage-filter chips stop
    hiding behind a toggle.
  - *Case detail* — dossier and next-date panel occupy a **sticky** left column; the
    Overview/History tabs scroll independently on the right.
  - *Forms* — a two-column field grid inside 46rem, with the action bar inline and
    right-aligned instead of stuck to the viewport.
  - *Auth* — splits into a navy brand panel and the form, rather than one small card adrift.
- **Bottom sheets become centred dialogs** — same component, `lg:` variants.

### Everywhere

- **Touch targets** — 48×48px minimum, enforced by the `.tap` utility even where the
  painted control is 32–40px.
- **Safe areas** — `pt-safe` / `pb-safe`; the app runs edge-to-edge with
  `viewport-fit=cover`.

## Elevation & Depth

Material 3 tonal tiers with soft ambient shadows. No hard drop shadows.

| Level | Use | Token |
| --- | --- | --- |
| 0 | Canvas | `#F8F9FF` |
| 1 | Cards | `shadow-e1` — `0 2px 8px rgba(15,23,42,.04)` + hairline border |
| 2 | Sticky headers, segmented tracks | `shadow-e2` — `0 4px 16px rgba(15,23,42,.06)` |
| 3 | Bottom sheets | `shadow-e3` + scrim `rgba(15,23,42,.45)` with 4px blur |
| 4 | FAB, floating CTA | `shadow-e4`; presses to `scale(.97)` |

## Shapes

- Base radius `0.5rem` for inputs, cells and cards; `1rem` for dossier cards; `1.5rem` for
  sheet top rims.
- **Pill philosophy** — the search omnibar, all stage badges, the FAB, quick-jump chips and
  the primary "Record next date" CTA are fully rounded.
- Segmented tabs are inner pills (`8px`) inside a rounded track (`12px`).

## Components

### Case docket card
Three zones, in reading order:
1. **Calendar tile** (left, 48×56) — day over month, coloured by urgency. Amber today, red
   past, blue soon, grey later.
2. **Header** — CRN in legal-code tracking, plus the stage badge, pin and sync glyphs.
3. **Body & footer** — `Party 1 v. Party 2` as the cause title, the forum beneath, and a
   split footer carrying the relative next date against the previous date.

A `1.5px` left edge strip marks a card as listed today (amber) or past its date (red).

### Next-date panel
On the case detail screen, an inverted `primary-container` panel states the next date, how
far away it is, and what the matter is listed for. This is the answer the advocate opened
the app for; it gets its own surface.

### Record-next-date sheet
The most-used write in the app. A bottom sheet with adjournment presets (1 week / 2 weeks /
1 month / 6 weeks) *before* the date picker, a stage selector, a free-text note, and a
"disposed" toggle. One tap of "Commit to diary" moves `nextDate` into `preDate`, sets the
new date, and appends to the procedural history.

### Dropdowns
Every dropdown in the app is the same control (`components/ui/Select.tsx`): a trigger
identical to every other field — 48px, 8px radius, the same hairline that thickens to
primary on focus — and a panel we draw ourselves.

A native `<select>` was the starting point and had to go. Its option list is painted by the
operating system, so none of it takes the app's type or colour, group headings are whatever
the OS decides, and there is no room for a filter or a second line. With 93 courts that
stops being a style preference.

The panel is capped at 340px so a long list still reads as a dropdown rather than a
full-height sheet, group headings stick while you scroll, and a filter box appears
automatically past twelve options. Below that, typeahead covers it.

Behaviour follows the ARIA combobox pattern: focus stays on the trigger throughout and
`aria-activedescendant` points at the highlighted row, so arrow keys, Home/End, Enter,
Escape and type-to-jump all work without re-implementing focus management.

### Date fields
Same trigger, a calendar in the panel (`components/ui/DatePicker.tsx`). The native date
input is a different control in every browser — Chrome's grid, Firefox's, Safari's wheel —
and none of them accept the app's colours. A court diary is mostly dates, so they may as
well look like the rest of it: Monday-first grid, today ringed in ochre, the selection in
navy, and `Today` / `Clear` on the footer. `min`/`max` grey out the days that would put a
next date before a previous one.

### Both, on one popover
`components/ui/Popover.tsx` anchors either panel. It portals to `<body>` and positions
`fixed` against a measured trigger rect, because dropdowns open inside bottom sheets and
scrolling cards where an absolutely-positioned panel would be clipped by the first
`overflow: auto` ancestor. It flips above the trigger when there is no room below, clamps to
the viewport near an edge, and re-measures on scroll and resize through a rAF-throttled
listener.

### Form controls
Every input shares one geometry (`.field`): 48px minimum height, 8px radius, a hairline
border at rest that thickens to `primary` with a 3px tinted ring on focus. An error
recolours *that same border* rather than adding a second one, so a form never gains weight
as it gains problems. The native select chevron and date-picker glyph are restyled to match.

Labels are always visible above the field. A floating label that collapses into the input is
the wrong trade here: an advocate copying a CRN off a docket sheet needs to see what each box
wants while typing into it. Required fields carry a red asterisk plus an `sr-only`
"(required)"; hints and errors occupy the same slot beneath the field, so nothing reflows
when validation fails. Submitting an invalid form scrolls to and focuses the first problem.

### Icons
Inline SVG, drawn with `fill-rule: evenodd` so a disc-plus-glyph icon (clock, check, alert)
cuts its glyph out of the disc instead of painting a solid blob. Glyphs are chosen for
legibility at the size they are actually used: a gavel is a squiggle at 14px, so courts are
marked with a courthouse instead.

### Sign in / Create account
A single component drives both (`components/auth/AuthForm.tsx`) on a two-panel screen: a
pale `primary-fixed-dim` brand panel carrying the mark, the headline and three plain
statements of what the app does, beside a deep navy form panel holding exactly two fields.
Below `lg` the brand panel drops away and the navy panel takes the whole screen with the
mark moved inline above the heading.

**The auth screen does not follow the theme.** Both panels are pinned — the pale side to the
`*-fixed` tokens, the dark side to explicit values — so sign-in looks identical in light and
dark. This is deliberate: when the panels were built from theme tokens, dark mode inverted
the panel and its contents independently and the supporting text came out pale-on-pale.
Fields on the dark panel use `.field-dark`, and `<Field tone="onDark">` re-tones the label,
hint, error and required marker together.

The call to action is the pale blue against the navy, and the cross-link is the gold —
the only two accents on the screen, so there is never a question about where to press.
Validation runs on the same Zod schema the server uses, so the message a user sees is the
message the API would have returned, and failures render inline rather than as a toast that
can be missed.

### Import dialog
Three steps, never more. The first screen states the accepted format **in full** — a table
of every column, whether it is required and a worked example — because the commonest import
failure is a wrong header row, and a help link is read by nobody. The drop zone tints on
drag-over; the review step leads with two tallies (ready / with problems) and then names the
reason for every skipped row against its line number.

### PDF documents
Drawn to match the app rather than to look like a spreadsheet: the navy header band with the
ochre rule under it, the app name and `COURT DIARY` on the left, document title and scope on
the right; zebra-striped tables with a deep navy header row; a hairline footer carrying the
chamber, the generation time and `Page n of m`.

A **month** is never one long table. Each day gets its own heading — a tinted band with a
gold edge, the long-form date and a matter count — followed by its own table. Column widths
are fixed so the free-text column keeps ~35mm and wraps between words instead of hyphenating
mid-word.

### Appearance control
Light / Dark / System, as a three-way segmented track in Chamber settings. The choice is
written to `localStorage` and applied by an inlined pre-paint script, so a dark-mode user
never sees a light flash. `system` follows the OS live. Every token already has a dark
value, so this is a variable swap — no component knows which theme it is in.

### Offline & error states
- **Offline** (`/offline`) — served by the service worker only when a navigation misses the
  cache. States plainly what still works, and returns the user to the board automatically
  the moment connectivity returns.
- **404** (`not-found.tsx`) — "This file is not on the record."
- **Error** (`error.tsx`) — leads with the reassurance that case records are safe, offers a
  retry, and surfaces the digest for support.
- **Connection banner** — a persistent strip under the app bar whenever the device is
  offline or writes are queued, with a live count and a "Sync now" action.

## Motion

Restrained and functional. Sheets rise at `260ms` on `cubic-bezier(.2,0,0,1)`; content
enters with an 8px rise at `240ms`; presses compress to `scale(.97)` in `100ms`. Every one
of these is disabled under `prefers-reduced-motion`.
