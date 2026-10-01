/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // explicit config path so Tailwind NEVER resolves the legacy root
    // tailwind.config.js (which scans templates/, not src/)
    tailwindcss: { config: './tailwind.config.ts' },
    autoprefixer: {}
  }
};

export default config;
