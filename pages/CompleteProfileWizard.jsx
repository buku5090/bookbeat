import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../src/firebase";
import { genres as genresList } from "../src/data/genres"; // ✅ corect



export default function CompleteProfileWizard() {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: "artist",
    stageName: "",
    realName: "",
    showRealName: true,
    myWork: "",
    wherePlayed: "",
    genres: [],
    rate: "",
    bio: "",
    instagram: "",
    availability: "",
    locationName: "",
    address: "",
    locationType: "",
    capacity: "",
    equipment: "",
    googleMaps: "",
    acceptedGenres: "",
    schedule: "",
  });
  const [genreInput, setGenreInput] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenreInput = (e) => {
    setGenreInput(e.target.value);
  };

  const addGenre = (genre) => {
    if (!formData.genres.includes(genre) && formData.genres.length < 5) {
      setFormData((prev) => ({ ...prev, genres: [...prev.genres, genre] }));
    }
    setGenreInput("");
  };

  const removeGenre = (genre) => {
    setFormData((prev) => ({ ...prev, genres: prev.genres.filter((g) => g !== genre) }));
  };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!currentUser) return;

    const profileData = {
      ...formData,
      uid: currentUser.uid,
      email: currentUser.email,
      photoURL: currentUser.photoURL || "",
      createdAt: serverTimestamp(),
      verified: false,
      visible: true,
      progress: 100,
    };

    try {
      await setDoc(doc(db, "users", currentUser.uid), profileData);
      navigate("/profil");
    } catch (err) {
      console.error("Eroare la salvarea profilului:", err);
    }
  };

    useEffect(() => {
    if (!currentUser) {
        navigate("/login");
    }
    }, [currentUser, navigate]);

    useEffect(() => {
    const fetchUserData = async () => {
        if (!currentUser) return;

        try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();

            // dacă ai deja genuri în Firebase dar sunt string, convertim la array
            const parsedGenres = Array.isArray(data.genres)
            ? data.genres
            : typeof data.genres === "string"
            ? data.genres.split(",").map((g) => g.trim())
            : [];

            setFormData((prev) => ({
            ...prev,
            ...data,
            genres: parsedGenres,
            }));
        }
        } catch (err) {
        console.error("Eroare la încărcarea datelor utilizatorului:", err);
        }
    };

    fetchUserData();
    }, [currentUser]);


    const genreSuggestions = genreInput.trim().length > 0
        ? genresList
            .filter(
                (g) =>
                g.toLowerCase().startsWith(genreInput.toLowerCase()) &&
                !formData.genres.includes(g)
            )
            .slice(0, 3)
        : [];


  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center px-4 py-20">
      <div className="bg-white text-black w-full max-w-2xl rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-4">
          Completare profil ({step}/4)
        </h1>

        {/* Pasul 1 - Tip și nume */}
        {step === 1 && (
          <div className="space-y-4">
            <label className="block">
              Tip cont
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="mt-1 block w-full border rounded px-3 py-2"
              >
                <option value="artist">Artist</option>
                <option value="location">Locație</option>
              </select>
            </label>

            {formData.type === "artist" ? (
              <label className="block">
                Nume de scenă
                <input
                  name="stageName"
                  value={formData.stageName}
                  onChange={handleChange}
                  className="mt-1 block w-full border rounded px-3 py-2"
                />
              </label>
            ) : (
              <label className="block">
                Nume locație
                <input
                  name="locationName"
                  value={formData.locationName}
                  onChange={handleChange}
                  className="mt-1 block w-full border rounded px-3 py-2"
                />
              </label>
            )}

            <div className="flex justify-end">
              <button onClick={handleNext} className="bg-black text-white px-4 py-2 rounded">
                Continuă
              </button>
            </div>
          </div>
        )}

        {/* Pasul 2 - Info specifice */}
        {step === 2 && (
          <div className="space-y-4">
            {formData.type === "artist" ? (
              <>
                <label className="block">
                  Nume real
                  <input
                    name="realName"
                    value={formData.realName}
                    onChange={handleChange}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                    <label className="flex items-center gap-2 mt-2">
                        <input
                            type="checkbox"
                            name="showRealName"
                            checked={formData.showRealName}
                            onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            showRealName: e.target.checked,
                            }))}
                        />
                        <span>Afișează numele real public</span>
                    </label>
                </label>
                <label className="block">
                  Unde ai pus muzică
                  <input
                    name="wherePlayed"
                    value={formData.wherePlayed}
                    onChange={handleChange}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  My work (linkuri)
                  <input
                    name="myWork"
                    value={formData.myWork}
                    onChange={handleChange}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  Genuri muzicale
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.genres.map((g) => (
                      <span
                        key={g}
                        className="bg-pink-200 text-pink-800 px-2 py-1 rounded-full text-sm cursor-pointer"
                        onClick={() => removeGenre(g)}
                      >
                        {g} ✕
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={genreInput}
                    onChange={handleGenreInput}
                    className="mt-1 block w-full border rounded px-3 py-2"
                    placeholder="Caută genuri..."
                  />
                    {genreInput.trim().length > 0 && genreSuggestions.slice(0, 3).length > 0 && (
                        <ul className="absolute z-50 w-100 border rounded bg-white text-black shadow-lg max-h-48 overflow-y-auto">
                            {genreSuggestions.slice(0, 3).map((g) => (
                            <li
                                key={g}
                                onClick={() => addGenre(g)}
                                className="px-3 py-1 hover:bg-pink-100 cursor-pointer"
                            >
                                {g}
                            </li>
                            ))}
                        </ul>
                    )}

                </label>
              </>
            ) : (
              <>
                <label className="block">
                  Adresă
                  <input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  Tip locație
                  <input
                    name="locationType"
                    value={formData.locationType}
                    onChange={handleChange}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  Capacitate maximă
                  <input
                    name="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={handleChange}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
              </>
            )}
            <div className="flex justify-between">
              <button onClick={handleBack} className="text-gray-600">Înapoi</button>
              <button onClick={handleNext} className="bg-black text-white px-4 py-2 rounded">
                Continuă
              </button>
            </div>
          </div>
        )}

        {/* Pasul 3 - Restul de câmpuri */}
        {step === 3 && (
          <div className="space-y-4">
            {formData.type === "artist" ? (
              <>
                <label className="block">
                  Tarif (pe oră / set)
                  <input
                    name="rate"
                    value={formData.rate}
                    onChange={handleChange}
                    placeholder="ex: 100€/set"
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  Descriere personală
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  Disponibilitate
                  <input
                    name="availability"
                    value={formData.availability}
                    onChange={handleChange}
                    placeholder="ex: weekend-uri"
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  Echipament disponibil
                  <input
                    name="equipment"
                    value={formData.equipment}
                    onChange={handleChange}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  Genuri acceptate
                  <input
                    name="acceptedGenres"
                    value={formData.acceptedGenres}
                    onChange={handleChange}
                    placeholder="ex: techno, house"
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  Link Google Maps
                  <input
                    name="googleMaps"
                    value={formData.googleMaps}
                    onChange={handleChange}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
                <label className="block">
                  Program
                  <input
                    name="schedule"
                    value={formData.schedule}
                    onChange={handleChange}
                    className="mt-1 block w-full border rounded px-3 py-2"
                  />
                </label>
              </>
            )}
            <div className="flex justify-between">
              <button onClick={handleBack} className="text-gray-600">Înapoi</button>
              <button onClick={handleNext} className="bg-black text-white px-4 py-2 rounded">
                Continuă
              </button>
            </div>
          </div>
        )}

        {/* Pasul 4 - Instagram și salvare */}
        {step === 4 && (
          <div className="space-y-4">
            <label className="block">
              Link Instagram (opțional)
              <input
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                className="mt-1 block w-full border rounded px-3 py-2"
              />
            </label>
            <div className="flex justify-between">
              <button onClick={handleBack} className="text-gray-600">Înapoi</button>
              <button onClick={handleSubmit} className="bg-pink-600 text-white px-4 py-2 rounded">
                Salvează profilul
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
