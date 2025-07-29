import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";
import { Link } from "react-router-dom";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userSnap = await getDocs(collection(db, "users"));
        const userData = userSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((u) => u.type === "artist" || u.type === "location");

        setUsers(userData);
        setFiltered(userData);
      } catch (err) {
        console.error("Eroare la încărcare:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();

    let matches = [];
    if (q.startsWith("@")) {
      const nameQuery = q.slice(1);
      matches = users.filter(
        (u) => u.name?.toLowerCase().includes(nameQuery)
      );
    } else if (q.startsWith("#")) {
      const genreQuery = q.slice(1);
      matches = users.filter((u) =>
        u.genres?.some((g) => g.toLowerCase().includes(genreQuery))
      );
    } else {
      matches = users.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.description?.toLowerCase().includes(q)
      );
    }

    setFiltered(matches);
    setSuggestions(matches.slice(0, 5));
  }, [searchQuery, users]);

  const handleSuggestionClick = (text) => {
    setSearchQuery(text);
    setSuggestions([]);
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 mt-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Caută profiluri</h1>

        {/* 🔍 Căutare + Autocomplete */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="ex: @mihai, #techno, club, etc."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-12 py-3 rounded-full border border-violet-600 text-white placeholder-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-600"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-violet-600 w-5 h-5" />

          {searchQuery.trim().length > 0 && suggestions.length > 0 && (
            <ul className="absolute top-full mt-2 left-0 right-0 bg-white text-black rounded-xl shadow z-50 overflow-hidden">
              {suggestions.map((item) => (
                <li
                  key={item.id}
                  onClick={() =>
                    handleSuggestionClick(
                      searchQuery.startsWith("#")
                        ? `#${item.genres?.[0] || ""}`
                        : `@${item.name}`
                    )
                  }
                  className="px-4 py-2 hover:bg-pink-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                >
                  {searchQuery.startsWith("#")
                    ? `#${item.genres?.[0] || ""}`
                    : `@${item.name}`}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 🗂️ Rezultate */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filtered.map(({ id, name, type, photoURL, description }) => (
              <li key={id}>
                <Link
                  to={`/user/${id}`}
                  className="block bg-white text-black rounded-xl overflow-hidden shadow-lg transition hover:shadow-pink-400 hover:scale-[1.02]"
                >
                  <img
                    src={photoURL || `https://placehold.co/400x200?text=${type}`}
                    alt={name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <span className="text-sm uppercase font-bold text-pink-500">{type}</span>
                    <h2 className="text-xl font-bold mt-1">{name}</h2>
                    <p className="text-gray-700 mt-1">{description?.substring(0, 80)}...</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-300">Niciun profil găsit.</p>
        )}
      </div>
    </div>
  );
}
