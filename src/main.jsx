import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from '../context/AuthContext.jsx'
import { LoadingProvider } from '../context/LoadingContext.jsx'
import { LanguageProvider } from '../context/LanguageContext.jsx' // ✅ imporți Provider-ul, nu Context-ul
import "./i18n/i18n.js";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LoadingProvider>
      <AuthProvider>
        <LanguageProvider>   {/* 🌍 Global language container */}
          <div className="min-h-screen bg-red">
            <div className="max-w-7xl mx-auto md:px-4"> 
              <App />
            </div>
          </div>
        </LanguageProvider>
      </AuthProvider>
    </LoadingProvider>
  </React.StrictMode>
)
