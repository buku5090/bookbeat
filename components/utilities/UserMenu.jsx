import { useState, useEffect, useRef } from "react";
import { auth, db } from "../../src/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import Button from "../uiux/button";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../context/LanguageContext";

const placeholderAvatar =
  "https://firebasestorage.googleapis.com/v0/b/bookbeat-7cd25.firebasestorage.app/o/avatar%2Fplaceholder-profile-icon-8qmjk1094ijhbem9.jpg.png?alt=media&token=a7ab835d-3e46-4b61-a074-f7a979d5448e";

const BellIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
    <path
      d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm8-6a1 1 0 0 1-1-1v-4a7 7 0 1 0-14 0v4a1 1 0 0 1-1 1H3v2h18v-2h-1Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UserIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
    <path
      d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LogoutIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
    <path
      d="M16 17l5-5-5-5M21 12H9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function UserMenu() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useLanguage();

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
    const q = query(
      collection(db, `users/${user.uid}/notifications`),
      where("read", "==", false)
    );
    const unsub = onSnapshot(q, (snap) => setUnreadCount(snap.size || 0));
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const outside = (e) => {
      if (e.target.closest('[data-modal-root="language"]')) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keyup", esc);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keyup", esc);
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const displayName =
    profile?.displayName || user?.displayName || t("user.default_display_name");
  const email = user?.email || profile?.email || "";
  const avatarSrc = profile?.photoURL || user?.photoURL || placeholderAvatar;

  return (
    <div className="relative ml-2" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group relative rounded-full outline-none !bg-transparent !border-none"
      >
        <div className="relative">
          <img
            src={avatarSrc}
            alt="User avatar"
            className="w-10 h-10 rounded-full shadow-sm transition-transform group-active:scale-95 object-cover"
            referrerPolicy="no-referrer"
          />
          {user && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 !bg-[#E50914] !text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center !border-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-2xl !bg-black shadow-[0_18px_40px_rgba(0,0,0,0.4)] z-50 overflow-hidden"
        >
          {/* HEADER CU GRADIENT + NUME */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#111827] to-[#1f2937] !text-white">
            <img
              src={avatarSrc}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight truncate">{displayName}</p>
              {email && <p className="text-xs text-white/70 truncate">{email}</p>}
            </div>
            {Number(unreadCount) > 0 && (
              <span className="!bg-[#E50914] !text-white text-[11px] font-semibold rounded-full px-2 py-0.5">
                {Number(unreadCount) > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>

          {user ? (
            <>
              <button
                onClick={() => {
                  navigate("/notificari");
                  setOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 !bg-black hover:!bg-[#111] transition text-sm !text-white"
              >
                <div className="relative">
                  <BellIcon className="!text-white" />
                  {Number(unreadCount) > 0 && (
                    <span className="absolute -top-1 -right-1 !bg-[#E50914] !text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                      !
                    </span>
                  )}
                </div>
                <span className="flex-1 text-left font-medium">{t("notifications")}</span>
                {Number(unreadCount) > 0 && (
                  <span className="text-[11px] !bg-[#E50914] !text-white rounded-full px-2 py-0.5">
                    {Number(unreadCount) > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <div className="h-px !bg-white/10" />

              <button
                onClick={() => {
                  navigate("/profil");
                  setOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 !bg-black hover:!bg-[#111] transition text-sm !text-white"
              >
                <UserIcon className="!text-white" />
                <span className="flex-1 text-left font-medium">{t("my_account")}</span>
              </button>

              <div className="h-px !bg-white/10" />

              <button
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 w-full px-4 py-3 !bg-black hover:!bg-[#2a0a0a] transition text-sm !text-[#E50914]"
              >
                <LogoutIcon className="!text-[#E50914]" />
                <span className="flex-1 text-left font-semibold">{t("logout")}</span>
              </button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                className="w-full justify-start px-4 py-3 rounded-none !bg-black hover:!bg-[#111] !text-white"
                onClick={() => {
                  navigate("/login");
                  setOpen(false);
                }}
              >
                {t("login")}
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start px-4 py-3 rounded-none !bg-black hover:!bg-[#111] !text-white"
                onClick={() => {
                  navigate("/register");
                  setOpen(false);
                }}
              >
                {t("register")}
              </Button>
            </>
          )}

          {/* LANGUAGE — mereu vizibil, full width */}
          <div className="h-px !bg-white/10" />
            <Link
              to="/settings/language"
              aria-label="Change language"
              title="Change language"
              onClick={() => setOpen(false)}     // <-- închide meniul aici
              className="inline-flex items-center gap-3 px-4 py-3 w-full !text-white !bg-black hover:!bg-[#0b0b0b] transition"
            >
              <span className="text-[20px]">🌐</span>
              <span className="text-[14px] font-medium">Language</span>

              <span className="ml-auto text-xs px-2 py-0.5 rounded-full !bg-[#00CED1] !text-black">
                {t("current_language")}: {language}
              </span>
            </Link>

            <div className="h-2" />
        </div>
      )}
    </div>
  );
}
