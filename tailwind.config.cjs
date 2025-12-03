module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        lavender: {
          50: '#f6f5ff',
          100: '#efeefe',
          300: '#cfc7ff',
          500: '#8b5cf6',
          700: '#6d28d9'
        }
      },
      boxShadow: {
        glass: '0 8px 30px rgba(80,60,130,0.12)'
      },
      backdropBlur: {
        xs: '6px'
      }
    }
  },
  plugins: []
}