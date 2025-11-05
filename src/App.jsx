// App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import MainMenu from "../components/utilities/MainMenu";
import HomePage from "../pages/HomePage";
import DiscoverPage from "../pages/DiscoverPage";
import EventsPage from "../pages/EventsPage";
import SearchPage from "../pages/SearchPage";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ProfilePage from "../pages/ProfilePage";
import RequireAuth from "../components/utilities/RequireAuth";
import NotFoundPage from "../pages/NotFoundPage";
import LoadingPage from "../pages/LoadingPage";
import AdminPage from "../pages/AdminPage";
import Footer from "../components/utilities/Footer";  
import Onboarding from "../components/Onboarding";
import CompleteProfile from "../components/profilepage/CompleteProfile";
import ScrollToTop from "../components/utilities/ScrollToTop";
import NotificationsPage from "../pages/NotificationsPage";
import EventDetailsPage from "../pages/EventDetailsPage";
import AdvancedSettingsPage from "../pages/AdvancedSettingsPage";
import Test from "../pages/Test";

// alias helper: /profile/:id -> /user/:id
function ProfileIdAlias() {
  const { id } = useParams();
  return <Navigate to={`/user/${id}`} replace />;
}

function AppShell() {
  const location = useLocation();

  // folosim location.key (unic la fiecare navigare) pentru a remonta TOT layout-ul
  return (
    <div key={location.key}>
      <MainMenu />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />

        {/* IMPORTANT: param obligatoriu + redirect separat */}
        <Route path="/discover/:page" element={<DiscoverPage />} />
        <Route path="/discover" element={<Navigate to="/discover/1" replace />} />

        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/notificari" element={<NotificationsPage />} />

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
        <Route path="/settings" element={<AdvancedSettingsPage />} />

        {/* Test */}
        <Route path="/test" element={<Test />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Footer />
    </div>
  );
}

function App() {
  const { loading } = useAuth();
  if (loading) return <LoadingPage />;

  return (
    <Router>
      <ScrollToTop />
      <AppShell />
    </Router>
  );
}

export default App;
