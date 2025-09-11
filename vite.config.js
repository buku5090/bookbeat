/* eslint-disable no-undef */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    historyApiFallback: false,  // 👈 pentru a evita 404 pe refresh/link direct
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
