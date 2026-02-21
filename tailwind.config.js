// LAKES LEAGUE — Design System Theme Extension
// Drop this into your existing tailwind.config.js under theme.extend
// This adds custom colors, fonts, and tokens WITHOUT breaking existing Tailwind classes

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PRIMARY — Muted forest greens (replaces generic green-950/900/800 usage)
        forest: {
          950: '#1E3320',  // deepest — hero backgrounds, navbars
          900: '#2D4A2E',  // primary brand green
          800: '#3D6040',  // lighter green for hover states, secondary surfaces
          700: '#4A7A4D',  // borders, subtle accents on dark
        },
        // NEUTRAL — Warm charcoals (replaces gray-* for dark UI)
        charcoal: {
          950: '#1C1C1E',  // near-black text, dark panels
          900: '#2A2A2C',  // card backgrounds on dark mode
          800: '#3A3A3C',  // borders, dividers on dark
          600: '#5A5A5C',  // secondary text
          400: '#8A8A8C',  // muted/placeholder text
        },
        // ACCENT — Muted gold for premium touches
        gold: {
          600: '#A68B4B',  // dark gold — small text, subtle borders
          500: '#C5A96A',  // primary gold — accents, highlights, badges
          400: '#D4BE8A',  // light gold — hover states
          300: '#E0D0A8',  // very light — backgrounds, tints
        },
        // CTA — Bright yellow for action
        cta: {
          500: '#E2C840',  // primary CTA color
          400: '#F0D94E',  // hover state
          600: '#C9B038',  // pressed/active state
        },
        // SURFACE — Warm backgrounds
        cream: {
          100: '#FAFAF8',  // base white (slightly warm)
          200: '#F2EEE7',  // primary cream background
          300: '#EAE4D8',  // darker cream for cards, alternating sections
        },
      },
      fontFamily: {
        // USAGE:
        // font-display  → headlines, hero text, stat numbers
        // font-serif    → subheadings, secondary headlines, quotes
        // font-sans     → body, UI, buttons, labels (keep as default)
        'display': ['"Playfair Display"', 'Georgia', 'serif'],
        'serif': ['"Cormorant Garamond"', 'Georgia', 'serif'],
        'sans': ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'pill': '100px',   // buttons, badges, tags
        'card': '16px',    // content cards
        'panel': '20px',   // large panels, modals
        'input': '12px',   // form inputs
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.1)',
        'cta-glow': '0 8px 32px rgba(226,200,64,0.3)',
        'subtle': '0 2px 8px rgba(0,0,0,0.03)',
      },
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '30': '7.5rem',   // 120px
      },
    },
  },
  plugins: [],
}
