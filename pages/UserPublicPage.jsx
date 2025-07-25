import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";

export default function UserPublicPage() {
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndAnnouncements = async () => {
      try {
        // Fetch user info
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        // Fetch announcements by userId
        const q = query(collection(db, "announcements"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() });
        });
        setAnnouncements(results);
      } catch (err) {
        console.error("Eroare la încărcare:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndAnnouncements();
  }, [userId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Se încarcă...</div>;
  if (!userData) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Utilizatorul nu a fost găsit.</div>;

  return (
    <div className="min-h-screen bg-black text-white py-20 px-4">
      <div className="max-w-4xl mx-auto bg-white text-black rounded-xl shadow-xl p-6">
        <h1 className="text-3xl font-bold text-pink-600 mb-2">{userData.fullName}</h1>
        <p className="text-gray-700 mb-4">Email: {userData.email}</p>

        <h2 className="text-2xl font-bold mt-6 mb-2 text-purple-700">Anunțuri postate:</h2>
        {announcements.length === 0 ? (
          <p className="text-gray-600">Niciun anunț publicat.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {announcements.map((a) => (
              <div key={a.id} className="bg-gray-100 p-4 rounded shadow hover:shadow-lg transition-all">
                <img
                  src={a.thumbnail || a.images?.[0] || `https://placehold.co/400x400?text=${a.type}`}
                  alt={a.announcementTitle}
                  className="w-full h-48 object-cover rounded mb-2"
                />
                <h3 className="font-bold text-lg">{a.announcementTitle}</h3>
                <p className="text-sm text-gray-600 capitalize">{a.type}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
