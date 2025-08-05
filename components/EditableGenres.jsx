import { useState, useEffect } from "react";
import { Pencil, X } from "lucide-react";
import { genres as allGenres } from "../src/data/genres"; // ✅ verifică path-ul

export default function EditableGenres({ value = [], onSave, canEdit = true }) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState(value);
  const [input, setInput] = useState("");

  useEffect(() => {
    setSelectedGenres(value || []);
  }, [value]);

  const addGenre = (genre) => {
    if (
      genre &&
      !selectedGenres.includes(genre) &&
      allGenres.includes(genre) &&
      selectedGenres.length < 5
    ) {
      setSelectedGenres((prev) => [...prev, genre]);
      setInput("");
    }
  };

  const removeGenre = (genre) => {
    setSelectedGenres((prev) => prev.filter((g) => g !== genre));
  };

  const handleSave = () => {
    onSave(selectedGenres);
    setIsEditing(false);
  };

  const filteredSuggestions =
    input.trim().length > 0
      ? allGenres
          .filter(
            (g) =>
              g.toLowerCase().startsWith(input.toLowerCase()) &&
              !selectedGenres.includes(g)
          )
          .slice(0, 3)
      : [];

  if (!canEdit && selectedGenres.length > 0) {
    return (
      <div className="mt-4">
        <h4 className="font-semibold">Genuri muzicale</h4>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedGenres.map((g) => (
            <span
              key={g}
              className="px-2 py-1 bg-pink-200 text-pink-800 rounded-full text-sm"
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 relative">
        <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Genuri muzicale</h4>
                {!isEditing && canEdit && (
                    <button
                    onClick={() => setIsEditing(true)}
                    className="text-gray-400 hover:text-gray-700 transition"
                    aria-label="Edit"
                    >
                    <Pencil size={16} />
                    </button>
                )}
        </div>


        {isEditing ? (
            <>
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedGenres.map((g) => (
                    <span
                        key={g}
                        className="bg-pink-200 text-pink-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                    >
                        {g}
                            <X
                            size={12}
                            onClick={() => removeGenre(g)}
                            className="cursor-pointer"
                            />
                    </span>
            ))}
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border px-2 py-1 rounded text-sm w-full"
            placeholder="Caută genuri..."
          />
          {filteredSuggestions.length > 0 && (
            <ul className="absolute z-50 w-full border rounded bg-white text-black shadow-lg mt-1 max-h-48 overflow-y-auto">
              {filteredSuggestions.map((g) => (
                <li
                  key={g}
                  onClick={() => addGenre(g)}
                  className="px-3 py-1 hover:bg-pink-100 cursor-pointer text-sm"
                >
                  {g}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              className="bg-green-500 text-white px-3 py-1 rounded text-sm"
            >
              💾 Salvează
            </button>
            <button
              onClick={() => {
                setSelectedGenres(value);
                setIsEditing(false);
                setInput("");
              }}
              className="bg-gray-300 text-black px-3 py-1 rounded text-sm"
            >
              ❌ Anulează
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedGenres.map((g) => (
            <span
              key={g}
              className="px-2 py-1 bg-pink-200 text-pink-800 rounded-full text-sm"
            >
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
