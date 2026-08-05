---
name: قارنها (Qarinha)
description: Egyptian price-comparison ledger — warm ivory paper, ink-blue graphite, one circled deal-red
colors:
  paper: "#f7f2e7"
  paper-deep: "#ede5d2"
  card: "#fffdf6"
  ink: "#2a241a"
  ink-soft: "#5c5346"
  ink-faint: "#8a7f6e"
  deal: "#c4391f"
  ink-blue: "#35547a"
  success: "#2f7d4f"
  amazon: "#e07a00"
  noon: "#d4a800"
  jumia: "#f68b1e"
  google: "#4285f4"
typography:
  display:
    fontFamily: "Aref Ruqaa, serif"
    fontSize: "clamp(2.25rem, 6vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Cairo, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "0.5rem"
  md: "0.875rem"
  lg: "1rem"
  xl: "1.5rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-blue}"
    rounded: "{rounded.md}"
  pill:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-soft}"
    rounded: "9999px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
---

# Design System: قارنها (Qarinha)

## Overview

**Creative North Star: "دفتر البيت — The Family Ledger"**

Qarinha is the household notebook every Egyptian home keeps to beat the high street: a warm ivory ruled ledger where prices are written in ink, the cheapest is circled in one red pen, and stores are stamped in their true colors. The whole surface is that notebook page. Calm, sunlit, honest measure — the trust of a careful bargain noted by hand, never a dark glass dashboard.

Density is low and breathing; the paper grain and ruled lines carry the atmosphere, not animation or chrome. The deal-red circle is the single loud signature and it appears only where the cheapest price is settled — on the hero sample, on the best offer, on the primary action.

**Key Characteristics:**
- Warm ivory paper ground with faint ruled ledger lines and a red margin rule
- One signal deal-red (circled best-price, primary search action)
- Handwritten Arabic display voice (Aref Ruqaa) beside a crisp humanist UI sans (Cairo)
- Store marks rendered in their true brand colors — never greyed
- Flat paper surfaces with soft lifted shadows on interaction only

## Colors

The palette is ink-and-paper: warm neutrals ground every surface, one deal-red does the signaling, one ink-blue links, and the four store brands carry their own identity.

### Primary
- **Ledger Paper** (#f7f2e7): the page ground. Body background, section fills.
- **Deep Paper** (#ede5d2): the marginally deeper ruled sheet. Footer and stats strip.
- **Lifted Card** (#fffdf6): the page turned up. Cards, inputs, the ledger panel, the search overlay.
- **Ink** (#2a241a): soft graphite ink. Primary text and the primary button.
- **Deal Red** (#c4391f): the pen that circles the cheapest. Circled price, best-offer badge, primary search action, active nav underline.

### Secondary
- **Ink Blue** (#35547a): the second pen. Outline buttons and link emphasis.

### Tertiary
- **Store Hues** — Amazon Orange (#e07a00), Noon Gold (#d4a800), Jumia Orange (#f68b1e), Google Blue (#4285f4): source badges and stamped store marks, always in true color.

### Neutral
- **Soft Ink** (#5c5346): secondary text.
- **Pencil Residue** (#8a7f6e): muted text, placeholders.
- **Success Green** (#2f7d4f): the "cheapest" price value on result surfaces.

### Named Rules
**The One Red Pen Rule.** Deal-red appears on ≤10% of any given screen. It marks exactly one thing: the cheapest price, or the primary action that finds it. Its rarity is the point.

**The True-Color Store Rule.** Store marks and source badges render in their own brand hues. Never greyscale, desaturate, or dim a store logo.

## Typography

**Display Font:** Aref Ruqaa (with serif fallback)
**Body Font:** Cairo (with sans-serif fallback)

**Character:** A handwritten Arabic journal voice for the moments the ledger speaks — the circled price, the heading word that carries the promise — paired with a clean, humanist Arabic UI face for everything that must be read quickly.

### Hierarchy
- **Display** (Aref Ruqaa 700, clamp(2.25rem, 6vw, 3.75rem), 1.2): the hero headline's deal word — "عشان توفر".
- **Headline** (Cairo 800, 1.875–2.25rem, 1.25): section titles.
- **Title** (Cairo 700, 1.125rem, 1.35): card and entry titles.
- **Body** (Cairo 400, 1rem, 1.6): running copy, max ~70ch.
- **Label** (Cairo 700, 0.75–0.875rem, 1.4): kickers-are-banned; small bold labels above sections use a red pen glyph dot, not an eyebrow.

### Named Rules
**The Hand-Pen Rule.** Aref Ruqaa is reserved for the ledger's own voice. It never styles UI controls, nav, or body copy.

## Layout

One centered ledger column (max-w-5xl) hosts the hero panel; the page sits inside an implied ruled page with a red margin rule on the hero. Sections alternate paper and deep-paper bands to pace the scroll like turning leaves. Spacing is generous above headings, tight below. The grid is a simple centered stack that collapses to two columns on mobile and four on desktop for the stats and features.

## Elevation & Depth

Flat paper, not shadow. Cards read as slightly lifted pages via a soft, offset drop shadow; interaction lifts them a touch more and deepens the shadow. Nothing glows, no glass, no blur-chrome. The WebGL light-ray background of the prior world is removed entirely.

### Shadow Vocabulary
- **rest** (`0 1px 2px rgba(60,45,20,0.12)`): the ledger panel, cards at rest.
- **hover** (`0 18px 44px -18px rgba(60,45,20,0.35)`): card hover lift.
- **deal ring** (`0 0 0 2px rgba(196,57,31,0.35)`): the primary button's halo.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat paper at rest. Shadows appear only as state — hover, focus, or the lifted page.

## Shapes

Gently curved, hand-friendly corners: inputs and buttons 0.875rem, cards 1rem, the hero ledger panel 1rem, pills fully round. No harsh geometry; the one hard shape is the red price ring, drawn as a 2px circle around the cheapest offer.

## Components

### Buttons
- **Shape:** gently curved (0.875rem)
- **Primary:** ink fill, card text, 16px 24px. Hover lifts 1px with a deeper shadow; focus shows the deal ring. This button is the search action and the deal-red halo is its signature.
- **Outline:** transparent, ink-blue 1.5px stroke, ink-blue text. Used for secondary actions.
- **Glow pill:** deal-red fill with the deal ring halo — the CTA's promise.

### Chips
- **Style:** card background, 1px paper border, soft-ink text, fully round.
- **State:** hover stains the chip deal-red at 6% with a red border; selected fills deal-red with white text.

### Cards / Containers
- **Corner Style:** 1rem, ledger panel 1rem
- **Background:** lifted card (#fffdf6)
- **Shadow Strategy:** flat at rest, soft offset shadow on hover (see Elevation)
- **Border:** 1px paper-border (rgba(122,105,72,0.28))
- **Internal Padding:** 1.5–2rem

### Inputs / Fields
- **Style:** card fill, 1.5px paper border, gently curved (0.875rem)
- **Focus:** border shifts to deal-red with a 3px red ring at 16% — the pen comes down on the line you're writing.
- **Placeholder:** pencil residue; the search input places the cursor on the right in RTL.

### Navigation
- **Style:** a card pill behind the links; active link is deal-red with a 2px deal-red underline. Mobile menu is a paper sheet with deal-red active rows.

### Signature Component: The Circled Deal
The cheapest offer is drawn with a 2px deal-red ring around the price row, and a "الأرخص" badge in a deal-red 10% chip. This is the ledger's proof — the circled bargain — and it is the one ornament the world allows itself.

## Do's and Don'ts

### Do:
- **Do** keep the page ivory paper with ruled lines and the red margin rule — the ledger world is the identity.
- **Do** circle the cheapest price in deal-red and stamp stores in their true colors.
- **Do** use Aref Ruqaa for the ledger's own words (headline deal word, circled price) and Cairo for UI.
- **Do** keep deal-red rare — it marks only the cheapest or the primary action.
- **Do** write Arabic-first, RTL, with numerals handled for the region.

### Don't:
- **Don't** use gradient text, glass, blur-chrome, or the WebGL light-ray background of the prior world — the paper replaced it.
- **Don't** grey, desaturate, or dim store logos; their true colors are the Egyptian-shopping identity.
- **Don't** use dark-glass, purple-blue gradients, or any dark-SaaS dashboard furniture.
- **Don't** add kickers or eyebrows above headings; the heading carries its own weight.
