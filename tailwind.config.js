/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        // Instrument Sans is the UI face. Nothing previously set a
        // font-family at all, so the app had been rendering in the OS
        // system font despite loading a webfont.
        sans: ['"Instrument Sans"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        editorial: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        inter: ['"Instrument Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // The legacy shadcn token names now resolve to the design system,
        // so <Button>, <Card> and <Badge> follow the theme instead of the
        // old blue. Keeping the names means no call sites had to change.
        border: "rgb(var(--ds-hairline-rgb) / <alpha-value>)",
        input: "rgb(var(--ds-hairline-2-rgb) / <alpha-value>)",
        ring: "rgb(var(--ds-accent-rgb) / <alpha-value>)",
        background: "rgb(var(--ds-bg-rgb) / <alpha-value>)",
        foreground: "rgb(var(--ds-ink-rgb) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--ds-accent-rgb) / <alpha-value>)",
          foreground: "rgb(var(--ds-accent-fg-rgb) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--ds-surface-3-rgb) / <alpha-value>)",
          foreground: "rgb(var(--ds-ink-rgb) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--ds-danger-rgb) / <alpha-value>)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "rgb(var(--ds-surface-3-rgb) / <alpha-value>)",
          foreground: "rgb(var(--ds-ink-muted-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--ds-surface-3-rgb) / <alpha-value>)",
          foreground: "rgb(var(--ds-ink-rgb) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--ds-surface-rgb) / <alpha-value>)",
          foreground: "rgb(var(--ds-ink-rgb) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--ds-surface-rgb) / <alpha-value>)",
          foreground: "rgb(var(--ds-ink-rgb) / <alpha-value>)",
        },

        // ══ Design system ══════════════════════════════════════════════
        // Defined in src/index.css and flipped by the `.dark` class, so a
        // single utility covers both themes: `text-ink` replaces
        // `text-[#1d1d1f] dark:text-white`.
        canvas: "rgb(var(--ds-bg-rgb) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--ds-surface-rgb) / <alpha-value>)",
          2: "rgb(var(--ds-surface-2-rgb) / <alpha-value>)",
          3: "rgb(var(--ds-surface-3-rgb) / <alpha-value>)",
        },
        hairline: {
          DEFAULT: "rgb(var(--ds-hairline-rgb) / <alpha-value>)",
          strong: "rgb(var(--ds-hairline-2-rgb) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ds-ink-rgb) / <alpha-value>)",
          muted: "rgb(var(--ds-ink-muted-rgb) / <alpha-value>)",
          subtle: "rgb(var(--ds-ink-subtle-rgb) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "rgb(var(--ds-accent-rgb) / <alpha-value>)",
          hover: "rgb(var(--ds-accent-hover-rgb) / <alpha-value>)",
          soft: "rgb(var(--ds-accent-soft-rgb) / <alpha-value>)",
          fg: "rgb(var(--ds-accent-fg-rgb) / <alpha-value>)",
        },
        positive: {
          DEFAULT: "rgb(var(--ds-positive-rgb) / <alpha-value>)",
          soft: "rgb(var(--ds-positive-soft-rgb) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--ds-warning-rgb) / <alpha-value>)",
          soft: "rgb(var(--ds-warning-soft-rgb) / <alpha-value>)",
          light: "rgb(var(--ds-warning-light-rgb) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--ds-danger-rgb) / <alpha-value>)",
          soft: "rgb(var(--ds-danger-soft-rgb) / <alpha-value>)",
          light: "rgb(var(--ds-danger-light-rgb) / <alpha-value>)",
        },
        info: {
          DEFAULT: "rgb(var(--ds-info-rgb) / <alpha-value>)",
          soft: "rgb(var(--ds-info-soft-rgb) / <alpha-value>)",
        },
      },
      boxShadow: {
        sm: "rgb(var(--ds-shadow-sm-rgb) / <alpha-value>)",
        DEFAULT: "rgb(var(--ds-shadow-sm-rgb) / <alpha-value>)",
        md: "rgb(var(--ds-shadow-md-rgb) / <alpha-value>)",
        lg: "rgb(var(--ds-shadow-lg-rgb) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}

