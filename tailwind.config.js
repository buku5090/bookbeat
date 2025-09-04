// tailwind.config.(js|cjs)
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",   // <— adaugă asta
    "./pages/**/*.{js,jsx,ts,tsx}",        // dacă ai pages în root
  ],
  important: true,
  theme: { extend: {} },
  plugins: [],
  darkMode: "class",
}
