import type { Config } from 'tailwindcss';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tokens = require('../../libs/design-tokens/tokens.json');

/**
 * Reads the shared design tokens (docs/ui-ux.md §6) so Tailwind and the
 * Flutter design system (Phase 1 mobile work) stay derived from one file.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: tokens.color.light.primary,
        secondary: tokens.color.light.secondary,
        accent: tokens.color.light.accent,
        warn: tokens.color.light.warn,
        danger: tokens.color.light.danger,
      },
      borderRadius: {
        card: `${tokens.radius.card}px`,
        sheet: `${tokens.radius.sheet}px`,
        btn: `${tokens.radius.button}px`,
      },
      backdropBlur: {
        raised: `${tokens.glass.raised.blur}px`,
        overlay: `${tokens.glass.overlay.blur}px`,
        modal: `${tokens.glass.modal.blur}px`,
      },
      transitionDuration: {
        sheet: `${tokens.motion.sheetMs}ms`,
        morph: `${tokens.motion.morphMs}ms`,
        press: `${tokens.motion.pressMs}ms`,
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.03)' },
        },
      },
      animation: {
        'pulse-soft': `pulseSoft ${tokens.motion.pulseMs}ms ease-in-out infinite`,
      },
    },
  },
  plugins: [],
};
export default config;
