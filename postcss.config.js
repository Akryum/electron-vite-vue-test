module.exports = {
  plugins: [
    require('tailwindcss/nesting'),
    require('tailwindcss')('./tailwind.config.js'),
    require('autoprefixer'),
  ],
}
