// components/MainMenu.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import UserMenu from "./UserMenu";
import { useAuth } from "../context/AuthContext";

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

// forțează rute ABSOLUTE, previne to="events" -> "/user/:id/events"
const abs = (p = "/") => (String(p).startsWith("/") ? p : `/${p}`);

export default function MainMenu() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.email === "test@gmail.com";

  const hidden = useHideOnScroll({ threshold: 80, disabled: menuVisible });

  // măsurăm înălțimea reală a header-ului pentru spacer
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);
  useLayoutEffect(() => {
    const update = () => setHeaderH(headerRef.current?.offsetHeight || 0);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // calculează originea cercului din poziția butonului ☰
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

  // control mount/unmount pentru overlay cu animație de închidere
  useEffect(() => {
    if (mobileMenuOpen) {
      setMenuVisible(true);
      setClosing(false);
    } else if (menuVisible) {
      setClosing(true);
    }
  }, [mobileMenuOpen, menuVisible]);

  // închide meniul mobil la schimbarea rutei (declanșează close anim)
  useEffect(() => setMobileMenuOpen(false), [location.pathname]);

  const menuItems = [
    { label: "Acasă", path: "/" },
    { label: "Descoperă", path: "/discover" },
    { label: "Evenimente", path: "/events" },
    { label: "Caută", path: "/search" },
  ];
  const lastItem = menuItems[menuItems.length - 1];
  const leftItems = menuItems.slice(0, -1);

  return (
    <>
      {/* header-ul FIXED */}
      <header
        ref={headerRef}
        className={`fixed top-0 inset-x-0 z-50 transition-transform duration-300 will-change-transform bg-black text-white shadow-md ${
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
            />
          </div>

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center w-full ml-8" aria-label="Main">
            <ul className="flex space-x-6 font-medium text-gray-600">
              {leftItems.map(({ label, path }) => (
                <li key={label}>
                  <NavLink
                    to={abs(path)}
                    end={path === "/"} // root se activează doar exact pe "/"
                    className={({ isActive }) =>
                      `uppercase !font-bold transition ${
                        isActive ? "text-white" : "!text-white"
                      } hover:text-violet-600`
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
                      `uppercase font-bold transition ${
                        isActive ? "text-red-500" : "text-red-400"
                      } hover:text-red-600`
                    }
                  >
                    Admin
                  </NavLink>
                </li>
              )}
            </ul>

            <div className="ml-auto flex items-center space-x-4">
              <NavLink
                to={abs(lastItem.path)}
                className={({ isActive }) =>
                  `uppercase !font-bold transition ${
                    isActive ? "text-white" : "!text-white"
                  } hover:text-violet-600`
                }
              >
                {lastItem.label}
              </NavLink>
              <UserMenu />
            </div>
          </nav>

          {/* ☰ Mobile toggle */}
          <div className="md:hidden flex items-center gap-3">
            {/* Avatar / UserMenu pe mobil */}
            <UserMenu />

            <button ref={toggleRef} onClick={() => setMobileMenuOpen((v) => !v)}>
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </header>

      {/* spacer egal cu înălțimea header-ului, ca să nu sară layoutul */}
      <div aria-hidden style={{ height: headerH }} />

      {/* =====================  📱 MOBILE MENU — cerc care se deschide/închide  ===================== */}
      {menuVisible && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          style={{ ["--cx"]: origin.x, ["--cy"]: origin.y }}
        >
          {/* Overlay alb cu clip-path; animăm open/close */}
          <div
            className="absolute inset-0"
            style={{
              background: "#fff",
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

          {/* Conținutul meniului (fade la închidere) */}
          <div
            className={`absolute inset-0 overflow-auto ${
              closing ? "animate-[fadeOut_.18s_ease-out_forwards]" : ""
            }`}
            style={{ pointerEvents: closing ? "none" : "auto" }}
          >
            {/* buton CLOSE în dreapta-sus */}
            <button
              aria-label="Închide meniul"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute !block right-4 top-4 z-10 h-10 w-10 flex items-center justify-center rounded-xl !bg-white !border-none"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
              <X size={25} className="!fill-black" strokeWidth={5} />
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
                        `block !font-bold w-full rounded-xl px-2 py-1 text-[25px] font-extrabold tracking-wide transition ${
                          isActive ? "!text-violet-700" : "!text-black"
                        }`
                      }
                    >
                      {label.toUpperCase()}
                    </NavLink>
                  </li>
                ))}
                {isAdmin && (
                  <li
                    className="opacity-0 will-change-transform"
                    style={{
                      animation: `fadeUp 320ms ease-out forwards`,
                      animationDelay: `${120 + menuItems.length * 60}ms`,
                    }}
                  >
                    <NavLink
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `block w-full rounded-xl px-2 py-2 text-[20px] font-extrabold tracking-wide transition ${
                          isActive ? "text-red-700" : "text-red-600"
                        }`
                      }
                    >
                      ADMIN
                    </NavLink>
                  </li>
                )}
              </ul>
              {/* safe-area bottom */}
              <div style={{ height: "env(safe-area-inset-bottom)" }} />
            </div>
          </div>

          {/* keyframes locale */}
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
      {/* ===================  /MOBILE MENU  =================== */}
    </>
  );
}
