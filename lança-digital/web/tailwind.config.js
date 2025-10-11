/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      container: { center: true, padding: '1.5rem' },
      colors: {
        brand: {
          DEFAULT: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        soft: '0 2px 12px rgba(15, 23, 42, 0.04)',
      },
      borderColor: {
        subtle: 'rgba(2,6,23,0.06)',
      },
    },
  },
  plugins: [],
}