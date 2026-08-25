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
        border: "var(--ds-hairline)",
        input: "var(--ds-hairline-2)",
        ring: "var(--ds-accent)",
        background: "var(--ds-bg)",
        foreground: "var(--ds-ink)",
        primary: {
          DEFAULT: "var(--ds-accent)",
          foreground: "var(--ds-accent-fg)",
        },
        secondary: {
          DEFAULT: "var(--ds-surface-3)",
          foreground: "var(--ds-ink)",
        },
        destructive: {
          DEFAULT: "var(--ds-danger)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--ds-surface-3)",
          foreground: "var(--ds-ink-muted)",
        },
        accent: {
          DEFAULT: "var(--ds-surface-3)",
          foreground: "var(--ds-ink)",
        },
        popover: {
          DEFAULT: "var(--ds-surface)",
          foreground: "var(--ds-ink)",
        },
        card: {
          DEFAULT: "var(--ds-surface)",
          foreground: "var(--ds-ink)",
        },

        // ══ Design system ══════════════════════════════════════════════
        // Defined in src/index.css and flipped by the `.dark` class, so a
        // single utility covers both themes: `text-ink` replaces
        // `text-[#1d1d1f] dark:text-white`.
        canvas: "var(--ds-bg)",
        surface: {
          DEFAULT: "var(--ds-surface)",
          2: "var(--ds-surface-2)",
          3: "var(--ds-surface-3)",
        },
        hairline: {
          DEFAULT: "var(--ds-hairline)",
          strong: "var(--ds-hairline-2)",
        },
        ink: {
          DEFAULT: "var(--ds-ink)",
          muted: "var(--ds-ink-muted)",
          subtle: "var(--ds-ink-subtle)",
        },
        brand: {
          DEFAULT: "var(--ds-accent)",
          hover: "var(--ds-accent-hover)",
          soft: "var(--ds-accent-soft)",
          fg: "var(--ds-accent-fg)",
        },
        positive: {
          DEFAULT: "var(--ds-positive)",
          soft: "var(--ds-positive-soft)",
        },
        warning: {
          DEFAULT: "var(--ds-warning)",
          soft: "var(--ds-warning-soft)",
        },
        danger: {
          DEFAULT: "var(--ds-danger)",
          soft: "var(--ds-danger-soft)",
        },
        info: {
          DEFAULT: "var(--ds-info)",
          soft: "var(--ds-info-soft)",
        },
      },
      boxShadow: {
        sm: "var(--ds-shadow-sm)",
        DEFAULT: "var(--ds-shadow-sm)",
        md: "var(--ds-shadow-md)",
        lg: "var(--ds-shadow-lg)",
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

