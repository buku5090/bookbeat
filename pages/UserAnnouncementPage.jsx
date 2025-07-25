import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../src/firebase";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function UserAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserAnnouncements = async () => {
      try {
        const q = query(
          collection(db, "announcements"),
          where("userId", "==", user.uid)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAnnouncements(data);
        setLoading(false);
      } catch (err) {
        console.error("Eroare la încărcarea anunțurilor utilizatorului:", err);
        setLoading(false);
      }
    };

    fetchUserAnnouncements();
  }, [user]);

  if (!user) return <p className="text-white text-center mt-20">Trebuie să fii logat pentru a vedea anunțurile tale.</p>;

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      <h1 className="text-3xl font-bold mb-8">Anunțurile tale</h1>

      {loading ? (
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
      ) : announcements.length === 0 ? (
        <p>Nu ai publicat încă niciun anunț.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {announcements.map(({ id, announcementTitle, description, thumbnail, type }) => (
            <Link
              key={id}
              to={`/announcement/${id}`}
              className="bg-white text-black rounded-xl overflow-hidden shadow-lg hover:shadow-pink-400 hover:scale-[1.02] transition-transform"
            >
              <img
                src={thumbnail || `https://placehold.co/400x200?text=${type}`}
                alt={announcementTitle}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <span className="text-sm uppercase font-bold text-pink-500">{type}</span>
                <h2 className="text-xl font-bold mt-1">{announcementTitle}</h2>
                <p className="text-gray-700 mt-1">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
