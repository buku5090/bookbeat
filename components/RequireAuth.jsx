import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../src/firebase";
import { Navigate } from "react-router-dom";
import LoadingPage from "../pages/LoadingPage";

export default function RequireAuth({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
