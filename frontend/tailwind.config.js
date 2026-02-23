// Tailwind CSS v3 configuration for VitalAI.
// Scans all JSX/JS files in src/ for class names to include in the build.

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
