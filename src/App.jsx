import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import MainMenu from "../components/MainMenu";
import HomePage from "../pages/HomePage";
import CreateAnnouncement from "../pages/CreateAnnouncement";
import DiscoverPage from "../pages/DiscoverPage";
import EventsPage from "../pages/EventsPage";
import ArtistsPage from "../pages/ArtistsPage";
import SearchPage from "../pages/SearchPage";
import AnnouncementPage from "../pages/AnnouncementPage";
import Login from "../pages/Login";
import Register from "../pages/Register";
import UserPage from "../pages/UserPage";
import RequireAuth from "../components/RequireAuth";
import NotFoundPage from "../pages/NotFoundPage";
import LoadingPage from "../pages/LoadingPage";

import { useAuth } from "../context/AuthContext"; // 🔹 asigură-te că ai creat contextul

function App() {
  const { loading } = useAuth();

  if (loading) return <LoadingPage />; // ⏳ loading global

  return (
    <Router>
      <MainMenu />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/create"
          element={
            <RequireAuth>
              <CreateAnnouncement />
            </RequireAuth>
          }
        />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/artists" element={<ArtistsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/announcement/:id" element={<AnnouncementPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/profil"
          element={
            <RequireAuth>
              <UserPage />
            </RequireAuth>
          }
        />

        {/* Test loading page */}
        <Route path="/test" element={<LoadingPage />} />

        {/* Pagina 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
