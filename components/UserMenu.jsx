import { useState, useEffect, useRef } from "react";
import { auth } from "../src/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const placeholderAvatar = 
  "https://firebasestorage.googleapis.com/v0/b/bookbeat-7cd25.firebasestorage.app/o/avatar%2Fplaceholder-profile-icon-8qmjk1094ijhbem9.jpg.png?alt=media&token=a7ab835d-3e46-4b61-a074-f7a979d5448e";

export default function UserMenu() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="relative ml-2" ref={menuRef}>
      <img
        src={user?.photoURL || placeholderAvatar}
        alt="User avatar"
        className="w-10 h-10 rounded-full cursor-pointer border-2 border-white"
        onClick={() => setOpen(!open)}
      />

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white text-black rounded-xl shadow-lg z-50 overflow-hidden">
          {user ? (
            <>
              <div className="px-4 py-3 font-semibold border-b rounded-none">
                Salut, {user.displayName || "Utilizator"}!
              </div>
              <button
                onClick={() => {
                  navigate("/profil");
                  setOpen(false);
                }}
                className="w-full !bg-gray-100 text-left text-black px-4 py-2 hover:!bg-gray-200 !rounded-none !border-none"
              >
                Contul meu
              </button>
              <button
                onClick={handleLogout}
                className="w-full !bg-gray-100 text-left text-black px-4 py-2 hover:!bg-gray-200 !rounded-none !border-none"
              >
                Deconectare
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  navigate("/login");
                  setOpen(false);
                }}
                className="w-full !bg-gray-100 text-left text-black px-4 py-2 hover:!bg-gray-200 !rounded-none !border-none"
              >
                Autentificare
              </button>
              <button
                onClick={() => {
                  navigate("/register");
                  setOpen(false);
                }}
                className="w-full !bg-gray-100 text-left text-black px-4 py-2 hover:!bg-gray-200 !rounded-none !border-none"
              >
                Înregistrare
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
