import { useState, useEffect, useRef } from "react";
import { auth, db } from "../src/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import Button from "./uiux/button"; // ← ajustează path/majuscula dacă e cazul

const placeholderAvatar =
  "https://firebasestorage.googleapis.com/v0/b/bookbeat-7cd25.firebasestorage.app/o/avatar%2Fplaceholder-profile-icon-8qmjk1094ijhbem9.jpg.png?alt=media&token=a7ab835d-3e46-4b61-a074-f7a979d5448e";

const BellIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
    <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm8-6a1 1 0 0 1-1-1v-4a7 7 0 1 0-14 0v4a1 1 0 0 1-1 1H3v2h18v-2h-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const UserIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LogoutIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
    <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function UserMenu() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user?.uid) return setProfile(null);
    const unsub = onSnapshot(doc(db, "users", user.uid), (s) =>
      setProfile(s.exists() ? s.data() : null)
    );
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return setUnreadCount(0);
    const q = query(collection(db, `users/${user.uid}/notifications`), where("read", "==", false));
    const unsub = onSnapshot(q, (snap) => setUnreadCount(snap.size || 0));
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const outside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keyup", esc);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keyup", esc); };
  }, []);

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

  const displayName = profile?.displayName || user?.displayName || "Utilizator";
  const email = user?.email || profile?.email || "";
  const avatarSrc = profile?.photoURL || user?.photoURL || placeholderAvatar;

  return (
    <div className="relative ml-2" ref={menuRef}>
      {/* Trigger avatar (nativ) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group !bg-transparent relative rounded-full outline-none focus:ring-2 focus:ring-white/50"
      >
        <div className="relative">
          <img
            src={avatarSrc}
            alt="User avatar"
            className="w-10 h-10 rounded-full border border-white/20 shadow-sm transition-transform group-active:scale-95 object-cover"
            referrerPolicy="no-referrer"
          />
          {user && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center border border-white/70">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-2xl border border-black/5 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 z-50 overflow-hidden"
        >
          {user ? (
            <>
              <div className="px-4 py-3 bg-white/60 border-b border-black/5 flex items-center gap-3">
                <img
                  src={avatarSrc}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-black/10"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{displayName}</div>
                  {email && <div className="text-xs text-black/60 truncate">{email}</div>}
                </div>
              </div>

              {/* Items pe Button din uiux */}
              <Button
                variant="primary"
                className="w-full justify-start px-4 py-3 rounded-none !bg-white gap-3"
                onClick={() => { navigate("/notificari"); setOpen(false); }}
              >
                <BellIcon className="text-black/70" />
                <span className="flex-1 text-left">Notificări</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center text-xs bg-red-500 text-white rounded-full min-w-[18px] h-[18px] px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-3 rounded-none hover:bg-black/[0.04] gap-3"
                onClick={() => { navigate("/profil"); setOpen(false); }}
              >
                <UserIcon className="text-black/70" />
                <span className="text-left">Contul meu</span>
              </Button>

              <div className="h-px bg-black/5" />

              <Button
                variant="destructive"
                className="w-full justify-start px-4 py-3 rounded-none gap-3 hover:bg-red-50 text-red-600"
                onClick={() => { setOpen(false); handleLogout(); }}
              >
                <LogoutIcon className="text-red-600" />
                <span className="text-left">Deconectare</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                className="w-full justify-start px-4 py-3 rounded-none hover:bg-black/[0.04]"
                onClick={() => { navigate("/login"); setOpen(false); }}
              >
                Autentificare
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start px-4 py-3 rounded-none hover:bg-black/[0.04]"
                onClick={() => { navigate("/register"); setOpen(false); }}
              >
                Înregistrare
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
