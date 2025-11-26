import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { AuthProvider } from "../context/AuthContext.jsx";
import { LoadingProvider } from "../context/LoadingContext.jsx";
import { LanguageProvider } from "../context/LanguageContext.jsx";
import { GlobalDialogProvider } from "../context/GlobalDialogContext";

import { ToastProvider } from "../components/utilities/ToastProvider.jsx"; // ✅ import global toast

import "./i18n/i18n.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>          {/* ✅ Toate mesajele pop-up globale */}
      <LoadingProvider>
        <AuthProvider>
          <LanguageProvider>
            <GlobalDialogProvider>
              <div className="min-h-screen">
                <div className="max-w-7xl mx-auto md:px-4">
                  <App />
                </div>
              </div>
            </GlobalDialogProvider>
          </LanguageProvider>
        </AuthProvider>
      </LoadingProvider>
    </ToastProvider>
  </React.StrictMode>
);
