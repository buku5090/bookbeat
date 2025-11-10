import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import UserMenu from "./UserMenu";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

function useHideOnScroll({ threshold = 80, disabled = false } = {}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (disabled) return;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > last;
      setHidden(goingDown && y > threshold);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, disabled]);
  useEffect(() => {
    if (disabled) setHidden(false);
  }, [disabled]);
  return hidden;
}

const abs = (p = "/") => (String(p).startsWith("/") ? p : `/${p}`);

export default function MainMenu() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.email === "adminbookmix@gmail.com";

  const hidden = useHideOnScroll({ threshold: 80, disabled: menuVisible });

  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);
  useLayoutEffect(() => {
    const update = () => setHeaderH(headerRef.current?.offsetHeight || 0);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const toggleRef = useRef(null);
  const [origin, setOrigin] = useState({ x: "100%", y: "0px" });
  useLayoutEffect(() => {
    const update = () => {
      const r = toggleRef.current?.getBoundingClientRect();
      if (r) setOrigin({ x: `${r.left + r.width / 2}px`, y: `${r.top + r.height / 2}px` });
    };
    if (menuVisible) update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [menuVisible]);

  useEffect(() => {
    if (mobileMenuOpen) {
      setMenuVisible(true);
      setClosing(false);
    } else if (menuVisible) {
      setClosing(true);
    }
  }, [mobileMenuOpen, menuVisible]);

  useEffect(() => setMobileMenuOpen(false), [location.pathname]);

  const menuItems = [
    { label: t("menu.home"), path: "/" },
    { label: t("menu.discover"), path: "/discover" },
    { label: t("menu.events"), path: "/events" },
  ];

  return (
    <>
      {/* HEADER */}
      <header
        ref={headerRef}
        className={`fixed top-0 inset-x-0 z-50 transition-transform duration-300 will-change-transform !bg-black !text-white shadow-md ${
          hidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between w-full rounded-b-2xl">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <img
              src="https://firebasestorage.googleapis.com/v0/b/bookbeat-7cd25.firebasestorage.app/o/logo.png?alt=media&token=eeb7c5f9-55bf-44a3-bbc3-edfab19af216"
              alt="BookBeat Logo"
              className="w-16 h-16 object-contain rounded-full"
              onError={(e) => {
                e.currentTarget.src = "/logo-fallback.png";
              }}
            />
          </div>

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center w-full ml-8" aria-label="Main">
            <ul className="flex space-x-6 font-medium">
              {menuItems.map(({ label, path }) => (
                <li key={label}>
                  <NavLink
                    to={abs(path)}
                    end={path === "/"}
                    className={({ isActive }) =>
                      `uppercase !font-bold transition ${
                        isActive ? "!text-[#8A2BE2]" : "!text-white"
                      } hover:!text-[#8A2BE2]`
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}

              {isAdmin && (
                <li>
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `uppercase !font-bold transition ${
                        isActive ? "!text-[#E50914]" : "!text-[#E50914]"
                      } hover:!text-[#E50914]`
                    }
                  >
                    Admin
                  </NavLink>
                </li>
              )}
            </ul>

            <div className="ml-auto flex items-center space-x-4">
              <UserMenu />
            </div>
          </nav>

          {/* Mobile: ☰ toggle + UserMenu (UserMenu DUPĂ iconiță) */}
          <div className="md:hidden flex items-center gap-3">
            <button
              ref={toggleRef}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="h-10 w-10 rounded-2xl flex items-center justify-center !bg-red !border-none"
            >
              {mobileMenuOpen
                ? <X size={24} className="!fill-white" />
                : <Menu size={24} className="!text-white" />
              }
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div aria-hidden style={{ height: headerH }} />

      {/* ================= MOBILE MENU ================= */}
      {menuVisible && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          style={{ ["--cx"]: origin.x, ["--cy"]: origin.y }}
        >
          {/* Overlay — culoare din paletă */}
          <div
            className="absolute inset-0 !bg-black"
            style={{
              clipPath: closing
                ? "circle(150vmax at var(--cx) var(--cy))"
                : "circle(0 at var(--cx) var(--cy))",
              animation: `${
                closing ? "circleClose" : "circleOpen"
              } 1000ms cubic-bezier(0.22,1,0.36,1) forwards`,
            }}
            onAnimationEnd={() => {
              if (closing) {
                setMenuVisible(false);
                setClosing(false);
              }
            }}
          />

          {/* Conținut */}
          <div
            className={`absolute inset-0 overflow-auto ${
              closing ? "animate-[fadeOut_.18s_ease-out_forwards]" : ""
            }`}
            style={{ pointerEvents: closing ? "none" : "auto" }}
          >
            {/* Close */}
            <button
              aria-label={t("menu.close_menu")}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-4 top-4 z-10 h-10 w-10 flex items-center justify-center rounded-xl !bg-black !text-white !border !border-white/10"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
              <X size={25} />
            </button>

            <div
              className="px-6 pt-6 pb-5"
              style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
            >
              <ul className="space-y-4 font-medium pt-15">
                {menuItems.map(({ label, path }, i) => (
                  <li
                    key={label}
                    className="opacity-0 will-change-transform"
                    style={{
                      animation: `fadeUp 320ms ease-out forwards`,
                      animationDelay: `${300 + i * 150}ms`,
                    }}
                  >
                    <NavLink
                      to={abs(path)}
                      end={path === "/"}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `block !font-bold w-full rounded-xl px-2 py-1 text-[25px] tracking-wide transition ${
                          isActive ? "!text-[#8A2BE2]" : "!text-white"
                        } hover:!text-[#8A2BE2]`
                      }
                    >
                      {label.toUpperCase()}
                    </NavLink>
                  </li>
                ))}

                {isAdmin && (
                  <li
                    className="opacity-0 will-change-transform"
                    style={{ animation: `fadeUp 320ms ease-out forwards`, animationDelay: `900ms` }}
                  >
                    <NavLink to="/admin" className="block !text-[#E50914] !font-bold">
                      {t("menu.admin")}
                    </NavLink>
                  </li>
                )}
              </ul>

              {/* safe-area bottom */}
              <div style={{ height: "env(safe-area-inset-bottom)" }} />
            </div>
          </div>

          {/* keyframes */}
          <style>{`
            @keyframes circleOpen { to { clip-path: circle(150vmax at var(--cx) var(--cy)); } }
            @keyframes circleClose { from { clip-path: circle(150vmax at var(--cx) var(--cy)); } to { clip-path: circle(0 at var(--cx) var(--cy)); } }
            @keyframes fadeUp { from { transform: translateY(6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @media (prefers-reduced-motion: reduce) {
              * { animation: none !important; transition: none !important; }
            }
          `}</style>
        </div>
      )}
      {/* =============== /MOBILE MENU =============== */}
    </>
  );
}
