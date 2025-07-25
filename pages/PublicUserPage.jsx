import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";
import { Helmet } from "react-helmet-async";

export default function PublicUserPage() {
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserData(userSnap.data());
      }

      const annRef = collection(db, "announcements");
      const q = query(annRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(list);
    };

    fetchUserData();
  }, [userId]);

  if (!userData) return <div className="text-white p-6">Se încarcă...</div>;

  return (
    <div className="bg-black text-white min-h-screen p-6">
      {/* 🔹 SEO meta info */}
      <Helmet>
        <title>{`Profil ${userData.displayName || "Utilizator"} | BookBeat`}</title>
        <meta
          name="description"
          content={`Vezi profilul public al utilizatorului ${userData.displayName || ""}, inclusiv anunțuri publicate și date de contact.`}
        />
        <link rel="canonical" href={`https://bookbeat.ro/user/${userId}`} />
      </Helmet>

      <div className="max-w-4xl mx-auto bg-white text-black rounded-xl shadow p-6">
        <div className="flex items-center gap-6 mb-6">
          <img
            src={userData.photoURL || `https://ui-avatars.com/api/?name=${userData.displayName}`}
            alt="Avatar"
            className="w-20 h-20 rounded-full object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">{userData.displayName}</h1>
            {userData.phoneNumber && (
              <p className="text-gray-600">📞 {userData.phoneNumber}</p>
            )}
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-2">Anunțuri publicate:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.length === 0 ? (
            <p>Nu există anunțuri.</p>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-bold text-lg">{ann.announcementTitle}</h3>
                <p className="text-sm">{ann.description?.slice(0, 100)}...</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
