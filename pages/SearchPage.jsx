import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const snapshot = await getDocs(collection(db, "announcements"));
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAnnouncements(data);
        setFiltered(data);
        setLoading(false);
      } catch (err) {
        console.error("Eroare la încărcarea anunțurilor:", err);
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const results = announcements.filter((item) =>
      item.announcementTitle?.toLowerCase().includes(q)
    );

    setFiltered(results);
  }, [searchQuery, announcements]);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 mt-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Caută în anunțuri</h1>

        {/* Căutare */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="ex: tineretului, club, etc."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-12 py-3 rounded-full border border-violet-600 text-white placeholder-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-600"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-violet-600 w-5 h-5" />
        </div>

        {/* Rezultate */}
        {loading ? (
          <div className="flex justify-center items-center w-full col-span-2 h-48">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filtered.map(({ id, announcementTitle, description, thumbnail, type }) => (
              <li
                key={id}
                className="bg-white text-black rounded-xl overflow-hidden shadow-lg transition hover:shadow-pink-400 hover:scale-[1.02]"
              >
                <img
                  src={thumbnail || `https://placehold.co/400x200?text=${type}`}
                  alt={announcementTitle}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://placehold.co/400x200?text=${type}`;
                  }}
                />
                <div className="p-4">
                  <span className="text-sm uppercase font-bold text-pink-500">{type}</span>
                  <h2 className="text-xl font-bold mt-1">{announcementTitle}</h2>
                  <p className="text-gray-700 mt-1">{description}</p>
                </div>
              </li>
            ))}

          </ul>
        ) : (
          <p className="text-center text-gray-300">Niciun rezultat găsit.</p>
        )}
      </div>
    </div>
  );
}
