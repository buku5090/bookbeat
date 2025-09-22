// App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

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
import Onboarding from "../components/Onboarding";
import CompleteProfile from "../components/CompleteProfile";
import Test from "../pages/Test";

// alias helper: /profile/:id -> /user/:id
function ProfileIdAlias() {
  const { id } = useParams();
  return <Navigate to={`/user/${id}`} replace />;
}

function App() {
  const { loading } = useAuth();

  if (loading) return <LoadingPage />;

  return (
    <Router>
      <MainMenu />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />

        {/* Profilul MEU (fără id) – protejat */}
        <Route
          path="/profil"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />

        {/* Profil public cu id */}
        <Route path="/user/:id" element={<ProfilePage />} />

        {/* Aliasuri ca să evităm 404-uri pe linkuri vechi */}
        <Route path="/profile" element={<Navigate to="/profil" replace />} />
        <Route path="/profile/:id" element={<ProfileIdAlias />} />
        <Route path="/user" element={<Navigate to="/profil" replace />} />

        {/* Test */}
        <Route path="/test" element={<Test />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Footer />
    </Router>
  );
}

export default App;
