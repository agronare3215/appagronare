/**** Tailwind config ****/
import { defineConfig } from 'tailwindcss'

export default defineConfig({
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534'
        }
      }
    },
  },
  plugins: [],
})
