import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // 🔹 asigură-te că ai creat contextul

import MainMenu from "../components/MainMenu";
import HomePage from "../pages/HomePage";
import DiscoverPage from "../pages/DiscoverPage";
import EventsPage from "../pages/EventsPage";
import SearchPage from "../pages/SearchPage";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ProfilePage from "../pages/ProfilePage";
import RequireAuth from "../components/RequireAuth";
import NotFoundPage from "../pages/NotFoundPage";
import LoadingPage from "../pages/LoadingPage";
import AdminPage from "../pages/AdminPage";
import Footer from "../components/Footer";
import CompleteProfileWizard from "../pages/CompleteProfileWizard";

function App() {
  const { loading } = useAuth();

  if (loading) return <LoadingPage />; // ⏳ loading global

  return (
    <Router>
      <MainMenu />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/complete-profile" element={<CompleteProfileWizard />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/profil"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />

        {/* Test loading page */}
        <Route path="/test" element={<LoadingPage />} />

        {/* Pagina 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      

      {/* Footer */}
      <Footer />  

    </Router>
  );
}

export default App;
