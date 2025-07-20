import React, { useEffect, useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../src/firebase";
import { useNavigate } from "react-router-dom";
import { auth } from "../src/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function CreateAnnouncementAdvanced() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/login");
    });
    return () => unsub();
  });

  const [step, setStep] = useState(1);
  const [type, setType] = useState("");
  const [formData, setFormData] = useState({
    announcementTitle: "",
    realName: "",
    stageName: "",
    genre: "",
    description: "",
    locationName: "",
    address: "",
    capacity: "",
    budget: "",
    styleWanted: "",
    thumbnail: "",
    images: [],
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map((file) => URL.createObjectURL(file));
    setFormData((prev) => ({ ...prev, images: urls }));
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const dataToSave = {
      ...formData,
      type,
      createdAt: new Date(),
    };

    try {
      const docRef = await addDoc(collection(db, "announcements"), dataToSave);
      setSuccessMsg("Anunțul a fost publicat cu succes!");
      navigate(`/announcement/${docRef.id}`);
    } catch (err) {
      console.error("Eroare la salvare:", err);
      setErrorMsg("Eroare la publicarea anunțului.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center mt-10">
      <div className="w-full">
        {step === 1 && (
          <div className="h-screen flex flex-col justify-center items-center px-6">
            <h1 className="text-5xl font-bold text-center mb-12">Anunțul este pentru...</h1>
            <div className="flex flex-col md:flex-row w-full h-2/3 gap-6">
              {/* 🔸 Artist */}
              <button
                onClick={() => {
                  setType("artist");
                  setStep(2);
                }}
                className="flex-1 bg-neutral-900 text-black opacity-60 hover:opacity-100 hover:scale-105 transition duration-300 ease-in-out rounded-2xl shadow-xl p-10 border border-white flex items-center justify-center"
              >
                <span className="text-6xl md:text-7xl font-extrabold tracking-wider drop-shadow-lg">
                  ARTIST
                </span>
              </button>



              {/* 🔹 Location */}
              <button
                onClick={() => {
                  setType("location");
                  setStep(2);
                }}
                className="flex-1 bg-neutral-900 text-black opacity-60 hover:opacity-100 hover:scale-105 transition duration-300 ease-in-out rounded-2xl shadow-xl p-10 border border-white flex items-center justify-center"
              >
                <span className="text-6xl md:text-7xl font-extrabold tracking-wider drop-shadow-lg">
                  LOCAȚIE
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 🔽 Form */}
        {step === 2 && (
          <form
            onSubmit={handleSubmit}
            className={`bg-white text-black p-6 rounded-xl shadow max-w-2xl mx-auto ${
              type === "location" ? "mt-20" : "mt-8"
            }`}
          >
            <h2 className="text-2xl font-bold mb-4">
              Formular pentru {type === "artist" ? "Artist" : "Locație"}
            </h2>

            {successMsg && <p className="text-green-600 mb-4 font-semibold">{successMsg}</p>}
            {errorMsg && <p className="text-red-600 mb-4 font-semibold">{errorMsg}</p>}

            <input
              name="announcementTitle"
              placeholder="Titlu anunț (ex: DJ disponibil pentru weekend)"
              value={formData.announcementTitle}
              onChange={handleChange}
              className="mb-4 w-full p-2 border rounded"
              required
            />

            {type === "artist" ? (
              <>
                <input name="realName" placeholder="Nume real" value={formData.realName} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
                <input name="stageName" placeholder="Nume de scenă" value={formData.stageName} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
                <input name="genre" placeholder="Gen muzical" value={formData.genre} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
                <textarea name="description" placeholder="Descriere artist" value={formData.description} onChange={handleChange} className="mb-4 w-full p-2 border rounded" rows={3} />
              </>
            ) : (
              <>
                <input name="locationName" placeholder="Nume locație" value={formData.locationName} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
                <input name="address" placeholder="Adresă completă" value={formData.address} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
                <input name="capacity" placeholder="Număr maxim de persoane" value={formData.capacity} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
                <input name="budget" placeholder="Buget (EUR)" value={formData.budget} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
                <input name="styleWanted" placeholder="Stiluri dorite" value={formData.styleWanted} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
                <textarea name="description" placeholder="Descriere locație" value={formData.description} onChange={handleChange} className="mb-4 w-full p-2 border rounded" rows={3} />
              </>
            )}

            <input name="thumbnail" placeholder="Thumbnail URL (opțional)" value={formData.thumbnail} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
            <input type="file" multiple onChange={handleImageChange} className="mb-4 w-full" />

            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                {formData.images.map((img, index) => (
                  <img key={index} src={img} alt={`preview-${index}`} className="w-full h-40 object-cover rounded" />
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 rounded"
            >
              {loading ? "Se publică..." : "Publică anunțul"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
