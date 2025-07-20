import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <h1 className="text-6xl font-extrabold mb-4">404</h1>
      <p className="text-xl mb-6 text-center">Pagina căutată nu a fost găsită.</p>
      <Link
        to="/"
        className="bg-violet-600 hover:bg-violet-700 transition text-white font-semibold px-6 py-3 rounded-xl"
      >
        Înapoi la pagină principală
      </Link>
    </div>
  );
}
