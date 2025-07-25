import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../src/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.email !== "test@gmail.com") {
      navigate("/"); // 🚫 Protecție admin
      return;
    }

    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "announcements"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAnnouncements(data);
      setLoading(false);
    };

    fetchData();
  }, [user, navigate]);

  const handleDelete = async (id) => {
    const confirm = window.confirm("Sigur vrei să ștergi acest anunț?");
    if (!confirm) return;

    await deleteDoc(doc(db, "announcements", id));
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24">
      <h1 className="text-3xl font-bold mb-6">Panou Admin</h1>

      {announcements.length === 0 ? (
        <p>Nu există anunțuri.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-700">
            <thead>
              <tr className="bg-violet-700 text-left text-white">
                <th className="p-3">Titlu</th>
                <th className="p-3">Tip</th>
                <th className="p-3">Dată</th>
                <th className="p-3">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.id} className="border-t border-gray-700 hover:bg-gray-900">
                  <td className="p-3">{a.announcementTitle}</td>
                  <td className="p-3 capitalize">{a.type}</td>
                  <td className="p-3">
                    {a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : "—"}
                  </td>
                  <td className="p-3 space-x-2">
                    <button
                      className="!bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                      onClick={() => navigate(`/announcement/${a.id}`)}
                    >
                      Vezi
                    </button>
                    <button
                      className="!bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                      onClick={() => handleDelete(a.id)}
                    >
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
