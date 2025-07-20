import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";
import { Link } from "react-router-dom";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "announcements"));
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAnnouncements(data);
        setLoading(false);
      } catch (err) {
        console.error("Eroare la încărcarea anunțurilor:", err);
      }
    };

    fetchAnnouncements();
  }, []);

  const filtered = announcements.filter((item) =>
    filter === "all" ? true : item.type === filter
  );

  return (
    <div className="flex flex-col md:flex-row p-6 gap-6 pt-10 bg-black min-h-screen text-white">
      {/* 🔻 Sidebar - Filtre */}
      <div className="w-full md:w-1/4 bg-black p-4 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">Filtre</h2>
        <div className="space-y-3">
          {[
            { label: "Toate", value: "all" },
            { label: "Artiști", value: "artist" },
            { label: "Locații", value: "location" },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`w-full text-left px-5 py-3 rounded-xl font-semibold transition-colors duration-200
                ${
                  filter === value
                    ? "!bg-black text-white border hover:!border-transparent"
                    : "!bg-white !text-black border !border-violet-600 hover:!bg-violet-600 hover:!text-white"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 🔻 Lista anunțuri */}
      <div className="w-full md:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {loading ? (
          <div className="flex justify-center items-center w-full col-span-2 h-48">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <p>Nu există anunțuri pentru filtrul selectat.</p>
        ) : (
          filtered.map(({ id, announcementTitle, description, thumbnail, type }) => {
            const placeholder = `https://placehold.co/400x200?text=${type === "artist" ? "Artist" : "Locație"}`;
            const imageSrc = thumbnail || placeholder;

            return (
              <Link
                key={id}
                to={`/announcement/${id}`}
                className="bg-white text-black rounded-xl overflow-hidden shadow-lg hover:shadow-pink-300 hover:scale-[1.02] transition-transform duration-200"
              >
                <img
                  src={imageSrc}
                  alt={announcementTitle}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = placeholder;
                  }}
                />

                <div className="p-4">
                  <span className="text-sm uppercase font-bold text-pink-500">
                    {type}
                  </span>
                  <h3 className="text-xl font-semibold mt-2">{announcementTitle}</h3>
                  <p className="mt-1 text-gray-700">{description?.substring(0, 120)}...</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
