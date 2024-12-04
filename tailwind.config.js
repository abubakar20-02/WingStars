/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './renderer/pages/**/*.{js,ts,jsx,tsx}',  // Include all files in pages directory
    './renderer/components/**/*.{js,ts,jsx,tsx}',  // Include all files in components directory
    './app/**/*.{js,ts,jsx,tsx}',  // If you have an 'app' directory
    './styles/**/*.css',  // Include global styles in the styles directory
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'), // If you're using the forms plugin
  ],
};
