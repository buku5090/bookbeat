import React, { useEffect, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../src/firebase";
import { useNavigate } from "react-router-dom";
import { auth } from "../src/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../src/firebase";
import { v4 as uuidv4 } from "uuid";
import { genres } from "../src/data/genres";

export default function CreateAnnouncementAdvanced() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/login");
    });
    return () => unsub();
  }, [navigate]);

  const [step, setStep] = useState(1);
  const [type, setType] = useState("");
  const [formData, setFormData] = useState({
    announcementTitle: "",
    realName: "",
    stageName: "",
    genres: [],
    description: "",
    locationName: "",
    address: "",
    capacity: "",
    budget: "",
    styleWanted: [],
    thumbnail: "",
    images: [],
  });
  const [genreInput, setGenreInput] = useState("");
  const [genreSuggestions, setGenreSuggestions] = useState([]);
  const [styleInput, setStyleInput] = useState("");
  const [styleSuggestions, setStyleSuggestions] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [descriptionCharCount, setDescriptionCharCount] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if ((name === "capacity" || name === "budget") && !/^[0-9]*$/.test(value)) return;
    const maxLengths = {
      announcementTitle: 35,
      realName: 35,
      stageName: 35,
      locationName: 35,
      address: 50,
      description: 500,
    };
    if (maxLengths[name] && value.length > maxLengths[name]) return;
    if (name === "description") setDescriptionCharCount(value.length);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenreInput = (e) => {
    const value = e.target.value;
    setGenreInput(value);
    if (value.length > 0) {
      const filtered = genres.filter((g) =>
        g.toLowerCase().startsWith(value.toLowerCase())
      );
      setGenreSuggestions(filtered.slice(0, 6));
    } else {
      setGenreSuggestions([]);
    }
  };

  const addGenre = (genre) => {
    if (!formData.genres.includes(genre) && formData.genres.length < 5) {
      setFormData((prev) => ({ ...prev, genres: [...prev.genres, genre] }));
    }
    setGenreInput("");
    setGenreSuggestions([]);
  };

  const removeGenre = (genre) => {
    setFormData((prev) => ({
      ...prev,
      genres: prev.genres.filter((g) => g !== genre),
    }));
  };

  const handleStyleInput = (e) => {
    const value = e.target.value;
    setStyleInput(value);
    if (value.length > 0) {
      const filtered = genres.filter((g) =>
        g.toLowerCase().startsWith(value.toLowerCase())
      );
      setStyleSuggestions(filtered.slice(0, 6));
    } else {
      setStyleSuggestions([]);
    }
  };

  const addStyle = (style) => {
    if (!formData.styleWanted.includes(style) && formData.styleWanted.length < 5) {
      setFormData((prev) => ({ ...prev, styleWanted: [...prev.styleWanted, style] }));
    }
    setStyleInput("");
    setStyleSuggestions([]);
  };

  const removeStyle = (style) => {
    setFormData((prev) => ({
      ...prev,
      styleWanted: prev.styleWanted.filter((s) => s !== style),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const allGenresValid = formData.genres.every((g) => genres.includes(g));
    const allStylesValid = formData.styleWanted.every((s) => genres.includes(s));

    if (!allGenresValid || !allStylesValid) {
      setErrorMsg("Unul sau mai multe genuri sau stiluri nu sunt valide.");
      setLoading(false);
      return;
    }

    const files = document.querySelector('input[type="file"]').files;
    if (files.length > 6) {
      setErrorMsg("Poți încărca maximum 6 imagini.");
      setLoading(false);
      return;
    }

    const uploadedUrls = [];

    for (const file of files) {
      if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
        alert("Doar imagini PNG, JPG și JPEG sunt permise.");
        continue;
      }

      const uniqueName = `${uuidv4()}_${file.name}`;
      const folderPath = `announcements/${auth.currentUser?.uid || "anonymous"}/${uuidv4()}`;
      const storageRef = ref(storage, `${folderPath}/${uniqueName}`);

      try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        uploadedUrls.push(downloadURL);
      } catch (error) {
        console.error("Eroare la upload:", error);
      }
    }

    const dataToSave = {
      ...formData,
      type,
      createdAt: new Date(),
      userEmail: auth.currentUser?.email || "anonim",
      userId: auth.currentUser?.uid || null,
      images: uploadedUrls,
      thumbnail: uploadedUrls[0] || "",
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
              <button
                onClick={() => {
                  setType("artist");
                  setStep(2);
                }}
                className="flex-1 !bg-neutral-900 opacity-60 hover:opacity-100 hover:scale-105 transition duration-300 ease-in-out rounded-2xl shadow-xl p-10 border border-white flex items-center justify-center"
              >
                <span className="text-6xl text-white md:text-7xl font-extrabold tracking-wider drop-shadow-lg">
                  ARTIST
                </span>
              </button>

              <button
                onClick={() => {
                  setType("location");
                  setStep(2);
                }}
                className="flex-1 !bg-neutral-900 opacity-60 hover:opacity-100 hover:scale-105 transition duration-300 ease-in-out rounded-2xl shadow-xl p-10 border border-white flex items-center justify-center"
              >
                <span className="text-6xl text-white md:text-7xl font-extrabold tracking-wider drop-shadow-lg">
                  LOCAȚIE
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form
            onSubmit={handleSubmit}
            className="bg-white text-black p-6 rounded-xl shadow max-w-2xl mx-auto mt-10"
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

                {/* GENRE SELECTOR */}
                <div className="relative mb-4">
                  <input
                    name="genreInput"
                    placeholder="Gen muzical"
                    value={genreInput}
                    onChange={handleGenreInput}
                    className="w-full p-2 border rounded"
                    autoComplete="off"
                  />
                  {genreSuggestions.length > 0 && (
                    <ul className="absolute z-50 bg-white text-black border w-full rounded mt-1 shadow">
                      {genreSuggestions.map((g, i) => (
                        <li
                          key={i}
                          className="px-3 py-2 hover:bg-pink-100 cursor-pointer"
                          onClick={() => addGenre(g)}
                        >
                          {g}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.genres.map((g, i) => (
                    <span key={i} className="bg-pink-200 text-pink-800 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-pink-300" onClick={() => removeGenre(g)}>
                      {g} ✕
                    </span>
                  ))}
                </div>
                <div className="text-right text-xs text-gray-400 pr-4">
                  {descriptionCharCount}/500 caractere
                </div>

                <textarea name="description" placeholder="Descriere artist" value={formData.description} onChange={handleChange} className="mb-4 w-full p-2 border rounded" rows={3} />
              </>
            ) : (
              <>
                <input name="locationName" placeholder="Nume locație" value={formData.locationName} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
                <input name="address" placeholder="Adresă completă" value={formData.address} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
                <input name="capacity" placeholder="Număr maxim de persoane" value={formData.capacity} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />
                <input name="budget" placeholder="Buget (EUR)" value={formData.budget} onChange={handleChange} className="mb-4 w-full p-2 border rounded" />

                {/* STYLE SELECTOR */}
                <div className="relative mb-4">
                  <input
                    name="styleInput"
                    placeholder="Stiluri dorite"
                    value={styleInput}
                    onChange={handleStyleInput}
                    className="w-full p-2 border rounded"
                    autoComplete="off"
                  />
                  {styleSuggestions.length > 0 && (
                    <ul className="absolute z-50 bg-white text-black border w-full rounded mt-1 shadow">
                      {styleSuggestions.map((s, i) => (
                        <li
                          key={i}
                          className="px-3 py-2 hover:bg-pink-100 cursor-pointer"
                          onClick={() => addStyle(s)}
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.styleWanted.map((s, i) => (
                    <span key={i} className="bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-purple-300" onClick={() => removeStyle(s)}>
                      {s} ✕
                    </span>
                  ))}
                </div>

                <textarea name="description" placeholder="Descriere locație" value={formData.description} onChange={handleChange} className="mb-4 w-full p-2 border rounded" rows={3} />
              </>
            )}

            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              multiple
              className="mb-4 w-full"
            />

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