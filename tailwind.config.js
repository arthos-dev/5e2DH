/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dagger: {
                    gold: '#C5A059',
                    'gold-light': '#E5C07A',
                    'gold-dark': '#8A6D3B',
                    dark: '#1A1D23',
                    panel: '#252932',
                    surface: '#2F343F',
                    light: '#EAE5D5',
                    'light-dim': '#D3CDB4',
                    accent: '#7C3AED', // Mystical purple
                }
            },
            fontFamily: {
                serif: ['"Cinzel"', 'serif'],
                sans: ['"Inter"', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 0 15px rgba(197, 160, 89, 0.3)',
                'glow-strong': '0 0 25px rgba(197, 160, 89, 0.5)',
            },
            keyframes: {
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                'fade-in-zoom': {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                }
            },
            animation: {
                shimmer: 'shimmer 2s infinite',
                'fade-in-zoom': 'fade-in-zoom 0.2s ease-out',
            }
        },
    },
    plugins: [],
}
