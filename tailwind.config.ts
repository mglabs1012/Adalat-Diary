import type { Config } from 'tailwindcss';

/* Comma-style rgba keeps custom-property colours usable in Android 7-era
   Chrome/WebView. The newer `rgb(var(--token) / alpha)` syntax is ignored
   entirely by those browsers. */
const COLOR_TOKEN_NAMES = [
  'background', 'on-background', 'surface', 'surface-dim', 'surface-bright',
  'surface-container-lowest', 'surface-container-low', 'surface-container',
  'surface-container-high', 'surface-container-highest', 'surface-variant',
  'on-surface', 'on-surface-variant', 'inverse-surface', 'inverse-on-surface',
  'outline', 'outline-variant', 'primary', 'on-primary', 'primary-container',
  'on-primary-container', 'primary-fixed', 'primary-fixed-dim', 'on-primary-fixed',
  'on-primary-fixed-variant', 'inverse-primary', 'secondary', 'on-secondary',
  'secondary-container', 'on-secondary-container', 'secondary-fixed',
  'secondary-fixed-dim', 'on-secondary-fixed', 'on-secondary-fixed-variant',
  'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
  'error', 'on-error', 'error-container', 'on-error-container', 'success',
  'success-container', 'on-success-container',
] as const;

const LEGACY_COLOR_TOKENS = Object.fromEntries(
  COLOR_TOKEN_NAMES.map((name) => [name, `rgba(var(--${name}), <alpha-value>)`]),
);

/**
 * Adalat Diary design tokens — Material 3 Expressive token names,
 * legal-chamber palette. Single source of truth: DESIGN.md.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...LEGACY_COLOR_TOKENS,
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      spacing: {
        'space-xxs': '0.125rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.75rem',
        'space-base': '1rem',
        'space-lg': '1.25rem',
        'space-xl': '1.5rem',
        'space-2xl': '2rem',
        'space-3xl': '2.5rem',
        gutter: '1rem',
        'screen-margin': '1rem',
        'app-bar': '3.5rem',
        'nav-height': '4.25rem',
        'fab-size': '3.25rem',
        'side-nav': '15rem',
        'side-rail': '4.5rem',
      },
      fontFamily: {
        // Inter carries the dense UI; Poppins carries headings and the board.
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-poppins)', 'Poppins', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-mobile': ['28px', { lineHeight: '36px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'headline-lg': ['26px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['20px', { lineHeight: '26px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-sm': ['18px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '18px', letterSpacing: '0.01em', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '18px', letterSpacing: '0.01em', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '600' }],
        'label-sm': ['10px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '700' }],
        'legal-code': ['13px', { lineHeight: '18px', letterSpacing: '0.05em', fontWeight: '500' }],
      },
      maxWidth: {
        // Reading measures: a form should never stretch to a 27" monitor.
        form: '46rem',
        page: '78rem',
        prose: '38rem',
      },
      boxShadow: {
        e1: '0 2px 8px rgba(15, 23, 42, 0.04)',
        e2: '0 4px 16px rgba(15, 23, 42, 0.06)',
        e3: '0 8px 32px rgba(26, 43, 73, 0.12)',
        e4: '0 6px 20px rgba(26, 43, 73, 0.22)',
        'nav-up': '0 -4px 16px rgba(11, 31, 51, 0.06)',
      },
      keyframes: {
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'sheet-up': 'sheet-up 260ms cubic-bezier(0.2, 0, 0, 1)',
        'fade-in': 'fade-in 180ms ease-out',
        rise: 'rise 240ms cubic-bezier(0.2, 0, 0, 1) both',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
