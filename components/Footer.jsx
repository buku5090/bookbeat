// components/Footer.jsx
import React from "react"

export default function Footer() {
  return (
    <footer className="bg-black text-white border-t border-gray-800 py-6 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        <div className="text-center md:text-left">
          <p>&copy; {new Date().getFullYear()} BookMix. Toate drepturile rezervate.</p>
        </div>
        <div className="flex gap-4">
          <a href="/despre" className="hover:underline">Despre</a>
          <a href="/contact" className="hover:underline">Contact</a>
          <a href="/termeni" className="hover:underline">Termeni</a>
        </div>
      </div>
    </footer>
  )
}
