import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from '../context/AuthContext.jsx'
import { LoadingProvider } from '../context/LoadingContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LoadingProvider>
      <AuthProvider>
        {/* 📦 Container global pentru toată aplicația */}
        <div className="min-h-screen bg-red">
          <div className="max-w-7xl mx-auto md:px-4"> 
            <App />
          </div>
        </div>
      </AuthProvider>
    </LoadingProvider>
  </React.StrictMode>
)
