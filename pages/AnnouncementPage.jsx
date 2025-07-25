import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../src/firebase";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export default function AnnouncementPage() {
  const { id } = useParams();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

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

  const slides = images.map((src) => ({ src }));

  return (
    <div className="min-h-screen bg-black text-white py-20 px-4">
      <div className="max-w-6xl mx-auto bg-white text-black rounded-xl shadow-xl p-4 flex flex-col md:flex-row gap-6">
        {/* 🔺 Poza mare și thumbnails în stânga */}
        <div className="w-full md:w-1/2">
          <div className="relative aspect-square overflow-hidden rounded-xl mb-4">
            <img
              src={images[photoIndex] || thumbnail || `https://placehold.co/800x800?text=${type}`}
              alt="Main"
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => images.length > 0 && setIsOpen(true)}
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setPhotoIndex((photoIndex - 1 + images.length) % images.length)
                  }
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2"
                >
                  &#8592;
                </button>
                <button
                  onClick={() =>
                    setPhotoIndex((photoIndex + 1) % images.length)
                  }
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2"
                >
                  &#8594;
                </button>
              </>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`thumb-${idx}`}
                className={`h-20 w-full object-cover rounded cursor-pointer border-2 ${idx === photoIndex ? "border-pink-500" : "border-transparent"}`}
                onClick={() => setPhotoIndex(idx)}
              />
            ))}
          </div>
        </div>

        {/* 🔹 Detalii în dreapta */}
        <div className="w-full md:w-1/2">
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
        </div>
      </div>

      {/* 🖼️ Lightbox modern */}
      {isOpen && (
        <Lightbox
          open={isOpen}
          close={() => setIsOpen(false)}
          slides={slides}
          index={photoIndex}
          carousel={{ finite: false }}
          on={{
            view: ({ index }) => setPhotoIndex(index),
          }}
        />
      )}
    </div>
  );
}
