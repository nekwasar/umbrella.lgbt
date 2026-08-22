import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f5f2',
        surface: '#ffffff',
        line: '#e5e2dd',
        'line-strong': '#d4cfc7',
        ink: '#201d1a',
        muted: '#6b6359',
        faint: '#9a9186',
        brand: '#d1678f',
        'brand-soft': '#f3dce5',
        accent: '#8f7bb8',
        good: '#2f8f5b',
        warn: '#b9801f'
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(32,29,26,0.06), 0 4px 12px rgba(32,29,26,0.05)',
        pop: '0 6px 24px rgba(32,29,26,0.12)'
      },
      borderRadius: {
        card: '12px'
      }
    }
  },
  plugins: []
};

export default config;
