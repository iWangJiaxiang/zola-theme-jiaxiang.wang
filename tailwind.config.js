/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html",
    "./static/**/*.js",
    "./src/**/*.css"
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        'wjx-theme': 'var(--wjx-theme)',
        'wjx-theme-op': 'var(--wjx-theme-op)',
        'wjx-theme-op-deep': 'var(--wjx-theme-op-deep)',
        'wjx-background': 'var(--wjx-background)',
        'wjx-card-bg': 'var(--wjx-card-bg)',
        'wjx-card-btn-bg': 'var(--wjx-card-btn-bg)',
        'wjx-ahoverbg': 'var(--wjx-ahoverbg)',
        'wjx-fontcolor': 'var(--wjx-fontcolor)',
        'wjx-secondtext': 'var(--wjx-secondtext)',
        'wjx-hovertext': 'var(--wjx-hovertext)',
        'wjx-border': 'var(--wjx-border)',
        'wjx-gray': 'var(--wjx-gray)',
        'wjx-gray-op': 'var(--wjx-gray-op)',
        'wjx-green': 'var(--wjx-green)',
        'wjx-yellow': 'var(--wjx-yellow)',
        'wjx-red': 'var(--wjx-red)',
      },
      boxShadow: {
        'wjx-border': 'var(--wjx-shadow-border)',
        'wjx-theme': 'var(--wjx-shadow-theme)',
      },
      backgroundImage: {
        'wjx-gradient': 'linear-gradient(135deg, var(--wjx-theme) 0%, var(--wjx-theme-op-deep) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'barrage-in': 'barrageIn 0.5s ease-out',
        'barrage-out': 'barrageOut 0.5s ease-in forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        barrageIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        barrageOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-100%)', opacity: '0' },
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  corePlugins: {
    preflight: false, // 禁用 preflight 以避免与现有样式冲突
  },
}