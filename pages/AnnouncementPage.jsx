import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../src/firebase";

export default function AnnouncementPage() {
  const { id } = useParams();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const docRef = doc(db, "announcements", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setAnnouncement(docSnap.data());
        } else {
          setAnnouncement(null);
        }
      } catch (err) {
        console.error("Eroare la încărcare anunț:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Se încarcă...</div>;
  }

  if (!announcement) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Anunțul nu a fost găsit.</div>;
  }

  const {
    type,
    announcementTitle,
    realName,
    stageName,
    genre,
    description,
    locationName,
    address,
    capacity,
    budget,
    styleWanted,
    thumbnail,
    images = [],
  } = announcement;

  return (
    <div className="min-h-screen bg-black text-white py-20 px-6">
      <div className="max-w-4xl mx-auto bg-white text-black rounded-xl overflow-hidden shadow-xl">
        <img
          src={thumbnail || images[0] || `https://placehold.co/800x300?text=${type}`}
          alt="Thumbnail"
          className="w-full h-64 object-cover"
        />
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-2 text-pink-600">{announcementTitle}</h1>
          <span className="text-sm uppercase font-bold text-purple-600">{type}</span>

          <div className="mt-4 space-y-2">
            {type === "artist" ? (
              <>
                <p><strong>Nume real:</strong> {realName}</p>
                <p><strong>Nume de scenă:</strong> {stageName}</p>
                <p><strong>Gen muzical:</strong> {genre}</p>
              </>
            ) : (
              <>
                <p><strong>Locație:</strong> {locationName}</p>
                <p><strong>Adresă:</strong> {address}</p>
                <p><strong>Capacitate:</strong> {capacity} persoane</p>
                <p><strong>Buget:</strong> {budget} EUR</p>
                <p><strong>Stil dorit:</strong> {styleWanted}</p>
              </>
            )}
            <p><strong>Descriere:</strong> {description}</p>
          </div>

          {images.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-2">Galerie foto</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`img-${idx}`}
                    className="w-full h-40 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
