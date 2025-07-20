import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "./UserMenu";

export default function MainMenu() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { label: "Acasă", path: "/" },
    { label: "Descoperă", path: "/discover" },
    { label: "Evenimente", path: "/events" },
    { label: "Artiști", path: "/artists" },
    { label: "Adaugă anunț", path: "/create" },
    { label: "Caută", path: "/search" }
  ];

  const lastItem = menuItems[menuItems.length - 1];
  const leftItems = menuItems.slice(0, -1);

  return (
    <>
      <nav className="w-full fixed top-0 left-0 z-50 bg-black text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between w-full">
          {/* 🔻 Logo */}
          <div className="flex items-center space-x-8">
            <img
              src="../assets/images/logo.png"
              alt="BookBeat Logo"
              className="w-16 h-16 object-contain rounded-full"
            />
          </div>

          {/* 🔹 Desktop Menu */}
          <div className="hidden md:flex items-center w-full ml-8">
            {/* Left menu */}
            <ul className="flex space-x-6 font-medium text-gray-600">
              {leftItems.map(({ label, path }) => (
                <li key={label} className="cursor-pointer">
                  <Link
                    to={path}
                    className={`uppercase !font-bold transition ${
                      location.pathname === path ? "text-white" : "!text-white"
                    } hover:text-violet-600`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Right section: last item + user avatar */}
            <div className="ml-auto flex items-center space-x-4">
              <Link
                to={lastItem.path}
                className={`uppercase !font-bold transition ${
                  location.pathname === lastItem.path
                    ? "text-white"
                    : "!text-white"
                } hover:text-violet-600`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {lastItem.label}
              </Link>
              <UserMenu />
            </div>
          </div>

          {/* ☰ Mobile toggle */}
          <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* 📱 Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-100 px-4 pb-4">
            <ul className="space-y-2 font-medium">
              {menuItems.map(({ label, path }) => (
                <li key={label}>
                  <Link
                    to={path}
                    className={`uppercase font-bold transition ${
                      location.pathname === path
                        ? "text-black"
                        : "text-gray-700"
                    } hover:text-violet-600`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <input
                  type="text"
                  placeholder="Search..."
                  className="mt-2 w-full px-4 py-2 rounded-full text-black border border-violet-500"
                />
              </li>
            </ul>
          </div>
        )}
      </nav>
    </>
  );
}
