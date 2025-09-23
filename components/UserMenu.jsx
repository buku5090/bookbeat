import { useState, useEffect, useRef } from "react";
import { auth } from "../src/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from "../src/firebase";
import {
  collection, onSnapshot, query, where
} from "firebase/firestore";

const placeholderAvatar =
  "https://firebasestorage.googleapis.com/v0/b/bookbeat-7cd25.firebasestorage.app/o/avatar%2Fplaceholder-profile-icon-8qmjk1094ijhbem9.jpg.png?alt=media&token=a7ab835d-3e46-4b61-a074-f7a979d5448e";

export default function UserMenu() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubAuth();
  }, []);

  // live badge pentru notificări necitite
  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }
    const q = query(
      collection(db, `users/${user.uid}/notifications`),
      where("read", "==", false)
    );
    const unsub = onSnapshot(q, (snap) => setUnreadCount(snap.size || 0));
    return () => unsub();
  }, [user?.uid]);

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
      <button
        type="button"
        className="relative"
        onClick={() => setOpen(!open)}
        aria-label="Deschide meniul utilizator"
      >
        <img
          src={user?.photoURL || placeholderAvatar}
          alt="User avatar"
          className="w-10 h-10 rounded-full border-2 border-white"
        />
        {user && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white text-black rounded-xl shadow-lg z-50 overflow-hidden">
          {user ? (
            <>
              <div className="px-4 py-3 font-semibold border-b rounded-none">
                Salut, {user.displayName || "Utilizator"}!
              </div>

              {/* Notificări – doar când e logat */}
              <button
                onClick={() => {
                  navigate("/notificari");
                  setOpen(false);
                }}
                className="w-full !bg-gray-100 text-left text-black px-4 py-2 hover:!bg-gray-200 !rounded-none !border-none flex items-center justify-between"
              >
                <span>Notificări</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center text-xs bg-red-500 text-white rounded-full min-w-[18px] h-[18px] px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

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
                onClick={() => {
                  navigate("/login");
                  setOpen(false);
                  handleLogout();
                }}
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
