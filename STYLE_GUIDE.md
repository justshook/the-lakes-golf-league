# STYLE_GUIDE.md — Lakes League Design System

> **Purpose:** This file is the single source of truth for all visual design decisions.
> Claude Code should reference this file before making ANY className changes.
> DO NOT modify JavaScript logic, state, props, hooks, API calls, or routing.
> ONLY modify `className` strings on JSX elements.

---

## Design Concept

Modern classical golf — the heritage and prestige of traditional golf club aesthetics
filtered through clean, contemporary digital design. Think Augusta meets a well-designed SaaS product.

---

## Color System (Tailwind Classes)

### Primary — Forest Greens
| Token           | Hex       | Tailwind Class    | Use For                                |
|-----------------|-----------|-------------------|----------------------------------------|
| Forest 950      | #1E3320   | `forest-950`      | Hero backgrounds, navbar, footer       |
| Forest 900      | #2D4A2E   | `forest-900`      | Primary brand surfaces, dark sections  |
| Forest 800      | #3D6040   | `forest-800`      | Hover states, secondary surfaces       |
| Forest 700      | #4A7A4D   | `forest-700`      | Borders on dark, subtle accents        |

### Neutral — Warm Charcoals
| Token           | Hex       | Tailwind Class    | Use For                                |
|-----------------|-----------|-------------------|----------------------------------------|
| Charcoal 950    | #1C1C1E   | `charcoal-950`    | Primary text, darkest panels           |
| Charcoal 900    | #2A2A2C   | `charcoal-900`    | Dark mode cards, stat blocks           |
| Charcoal 800    | #3A3A3C   | `charcoal-800`    | Borders, dividers on dark backgrounds  |
| Charcoal 600    | #5A5A5C   | `charcoal-600`    | Secondary text                         |
| Charcoal 400    | #8A8A8C   | `charcoal-400`    | Muted text, placeholders               |

### Accent — Muted Gold
| Token           | Hex       | Tailwind Class    | Use For                                |
|-----------------|-----------|-------------------|----------------------------------------|
| Gold 600        | #A68B4B   | `gold-600`        | Dark gold for small text, subtle lines |
| Gold 500        | #C5A96A   | `gold-500`        | Primary gold — accents, badges, labels |
| Gold 400        | #D4BE8A   | `gold-400`        | Hover states on gold elements          |
| Gold 300        | #E0D0A8   | `gold-300`        | Light tint, subtle backgrounds         |

### CTA — Bright Yellow
| Token           | Hex       | Tailwind Class    | Use For                                |
|-----------------|-----------|-------------------|----------------------------------------|
| CTA 500         | #E2C840   | `cta-500`         | Primary buttons, CTA backgrounds       |
| CTA 400         | #F0D94E   | `cta-400`         | Button hover state                     |
| CTA 600         | #C9B038   | `cta-600`         | Button pressed/active state            |

### Surface — Warm Backgrounds
| Token           | Hex       | Tailwind Class    | Use For                                |
|-----------------|-----------|-------------------|----------------------------------------|
| Cream 100       | #FAFAF8   | `cream-100`       | Base page background (warm white)      |
| Cream 200       | #F2EEE7   | `cream-200`       | Section backgrounds, card surfaces     |
| Cream 300       | #EAE4D8   | `cream-300`       | Deeper cream, alternating sections     |

---

## Typography

### Font Families
| Role        | Font                | Tailwind Class  | Weight           | Use For                          |
|-------------|---------------------|-----------------|------------------|----------------------------------|
| Display     | Playfair Display    | `font-display`  | 900, italic 400  | Heroes, page titles, stat values |
| Secondary   | Cormorant Garamond  | `font-serif`    | 600              | Subheadings, pull quotes         |
| Body / UI   | DM Sans             | `font-sans`     | 400-700          | Everything else                  |

### Font Import (add to index.html <head>)
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap" rel="stylesheet">
```

### Heading Patterns
- **Hero H1:** `font-display text-5xl md:text-7xl font-black text-cream-200 leading-none`
- **Hero H1 italic accent:** `font-display text-5xl md:text-7xl font-normal italic text-gold-500`
- **Page title:** `font-display text-3xl md:text-4xl font-bold text-charcoal-950`
- **Section label:** `font-sans text-xs font-semibold tracking-[3px] uppercase text-gold-600`
- **Card title:** `font-display text-xl font-bold text-charcoal-950`
- **Body text:** `font-sans text-base text-charcoal-600 leading-relaxed`
- **Muted/meta:** `font-sans text-sm text-charcoal-400`

---

## Component Patterns

### Buttons
```
Primary CTA:     bg-cta-500 hover:bg-cta-400 text-forest-950 font-bold text-sm px-7 py-3.5 rounded-pill transition-all hover:-translate-y-0.5 hover:shadow-cta-glow
Secondary:       bg-forest-900 hover:bg-forest-800 text-cream-200 font-semibold text-sm px-7 py-3.5 rounded-pill transition-all
Outline:         border-1.5 border-forest-900 text-forest-900 hover:bg-forest-900 hover:text-cream-200 font-semibold text-sm px-7 py-3.5 rounded-pill transition-all
Gold Outline:    border-1.5 border-gold-500 text-gold-600 hover:bg-gold-500 hover:text-forest-950 font-semibold text-sm px-7 py-3.5 rounded-pill transition-all
Ghost:           text-charcoal-600 hover:text-forest-900 font-semibold text-sm px-4 py-3.5 transition-colors
```

### Cards
```
Light card:      bg-cream-200 rounded-card shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1
Dark card:       bg-charcoal-900 border border-white/[0.06] rounded-card
White card:      bg-white rounded-card shadow-card
```

### Inputs
```
Dark input:      bg-white/5 border border-white/10 rounded-input px-5 py-3.5 text-cream-200 placeholder:text-charcoal-400 focus:border-gold-500 outline-none transition-colors
Light input:     bg-cream-100 border border-charcoal-800/10 rounded-input px-5 py-3.5 text-charcoal-950 placeholder:text-charcoal-400 focus:border-forest-900 outline-none transition-colors
```

### Badges / Tags
```
Standard:        text-[10px] font-bold tracking-[2px] uppercase text-forest-900 bg-forest-900/[0.08] px-3 py-1 rounded-pill
Gold badge:      text-[10px] font-bold tracking-[2px] uppercase text-gold-500 border border-gold-500 px-4 py-1.5 rounded-pill
```

### Navigation
```
Nav container:   bg-forest-950 border-b border-white/[0.06]
Nav link:        text-sm font-medium text-cream-200/60 hover:text-cream-200 transition-colors
Nav link active: text-sm font-medium text-cream-200 (+ gold underline indicator)
```

### Stat Blocks (scores, rankings, averages)
```
Container:       bg-charcoal-900 border border-white/[0.06] rounded-card p-6
Label:           text-[11px] font-semibold tracking-[1.5px] uppercase text-charcoal-400
Value:           font-display text-4xl font-bold text-cream-200  (or text-gold-500 for highlight)
Sub-text:        text-xs text-charcoal-400
```

---

## Section Patterns

### Hero / Dark Section
```
bg-forest-950 text-cream-200
```
Use for: Top of page, major feature sections, CTAs

### Light Section
```
bg-cream-200
```
Use for: Content sections, forms, settings

### White Section
```
bg-cream-100
```
Use for: Alternating with cream sections for visual rhythm

### Dark Panel
```
bg-charcoal-950
```
Use for: Stats dashboards, data-heavy sections, footers

### Gold Divider
```
h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-30
```

---

## Spacing & Layout

- Section padding: `py-16 md:py-24 px-5 md:px-10`
- Container: `max-w-6xl mx-auto`
- Card gap: `gap-5 md:gap-8`
- Component internal padding: `p-5 md:p-8`

---

## Transition & Motion

- Default: `transition-all duration-300`
- Button lift: `hover:-translate-y-0.5`
- Card lift: `hover:-translate-y-1`
- Color only: `transition-colors duration-300`

---

## DO / DON'T Rules

### DO
- Use `font-display` for any large number, score, or headline
- Use warm cream backgrounds instead of pure white
- Use gold for premium/accent moments sparingly
- Use bright yellow ONLY for primary CTAs
- Keep pill-shaped buttons for all actions
- Add subtle hover lift + shadow transitions to interactive elements

### DON'T
- Use pure white (#FFFFFF) as a page background — use `cream-100` instead
- Use generic Tailwind green-950/900/800 — use `forest-*` custom tokens
- Use generic Tailwind gray-* — use `charcoal-*` tokens
- Put gold on large surface areas — it's an accent, not a background
- Use more than one yellow CTA per visible viewport
- Add emojis to UI text
- Use Inter, Roboto, or system fonts — always DM Sans for body
