/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './templates/**/*.html',
    './static/scripts/**/*.js',
    './build.js'
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        soft: 'var(--surface-soft)',
        line: 'var(--border)',
        linetrong: 'var(--border-strong)',
        ink: 'var(--text)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        pink: 'var(--pink-deep)',
        pinksoft: 'var(--pink)',
        lavender: 'var(--purple-deep)',
        lavendersoft: 'var(--purple)',
        blue: 'var(--blue-deep)',
        bluesoft: 'var(--blue)'
      },
      fontFamily: {
        retro: ['Georgia', "'Times New Roman'", 'serif'],
        sans: ['system-ui', '-apple-system', "'Segoe UI'", 'Roboto', "'Helvetica Neue'", 'sans-serif'],
        mono: ["'Courier New'", 'monospace']
      },
      maxWidth: {
        read: '760px',
        content: '1100px'
      },
      boxShadow: {
        card: 'var(--shadow-sm)',
        lift: 'var(--shadow-md)'
      },
      borderRadius: {
        card: 'var(--radius)'
      }
    }
  },
  plugins: []
}
