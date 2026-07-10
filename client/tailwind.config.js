/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
        accent: 'var(--accent-color)',
        border: 'var(--border-color)',
        msg: {
          user: 'var(--message-user-bg)',
          assistant: 'var(--message-assistant-bg)',
        },
      },
      fontFamily: {
        sans: ['var(--font-family)', 'sans-serif'],
      },
      fontSize: {
        base: 'var(--font-size)',
      },
    },
  },
  plugins: [],
}