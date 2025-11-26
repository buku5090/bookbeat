// App.jsx
import React, { Suspense, lazy } from "react";
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
import RequireAuth from "../components/utilities/RequireAuth";
import Footer from "../components/utilities/Footer";
import ScrollToTop from "../components/utilities/ScrollToTop";
import LoadingPage from "../pages/LoadingPage";

// ── Route components lazy-loaded ──────────────────────────────────────────────
const HomePage = lazy(() => import("../pages/HomePage"));
const DiscoverPage = lazy(() => import("../pages/DiscoverPage"));
const EventsPage = lazy(() => import("../pages/EventsPage"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const AdminPage = lazy(() => import("../pages/AdminPage"));
const CompleteProfile = lazy(() => import("../components/profilepage/CompleteProfile"));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));
const EventDetailsPage = lazy(() => import("../pages/EventDetailsPage"));
const AdvancedSettingsPage = lazy(() => import("../pages/AdvancedSettingsPage"));
const LanguageSettingsPage = lazy(() => import("../pages/LanguageSettingsPage"));
const Test = lazy(() => import("../pages/Test"));
const MessagesPage = lazy(() => import("../pages/MessagesPage"));

// alias helper: /profile/:id -> /user/:id
function ProfileIdAlias() {
  const { id } = useParams();
  return <Navigate to={`/user/${id}`} replace />;
}

function AppShell() {
  // IMPORTANT: am eliminat cheia bazată pe location.key ca să NU se mai remonteze layout-ul.
  // Astfel, MainMenu (și logo-ul din el) rămâne montat și nu "clipește" la navigare.
  const location = useLocation();

  return (
    <div>
      {/* Logo-ul trăiește aici, în afara Suspense: nu se demontează la schimbarea rutei */}
      <MainMenu />

      {/* Orice pagină care se încarcă (lazy) va afișa LoadingPage ca fallback */}
      <Suspense fallback={<LoadingPage />}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />

          {/* IMPORTANT: param obligatoriu + redirect separat */}
          <Route path="/discover/:page" element={<DiscoverPage />} />
          <Route path="/discover" element={<Navigate to="/discover/1" replace />} />

          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/notificari" element={<NotificationsPage />} />
          <Route path="/settings/language" element={<LanguageSettingsPage />} />
          {/* Inbox + chat integrat */}
          <Route
            path="/messages"
            element={
              <RequireAuth>
                <MessagesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/messages/:peerId"
            element={
              <RequireAuth>
                <MessagesPage />
              </RequireAuth>
            }
          />


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
      </Suspense>

      <Footer />
    </div>
  );
}

function App() {
  const { loading } = useAuth();

  // În loc să returnăm direct LoadingPage (care ar ascunde logo-ul),
  // ținem layout-ul montat și, dacă vrei, poți afișa un overlay în plus când Auth se încarcă.
  return (
    <Router>
      <ScrollToTop />
      <AppShell />

      {/* Overlay global opțional în timpul încărcării Auth (nu obligă, dar util). */}
      {loading && (
        <div className="fixed inset-0 z-[9999]">
          <LoadingPage />
        </div>
      )}
    </Router>
  );
}

export default App;
