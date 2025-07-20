import { useEffect } from "react";
import MainMenu from "../components/MainMenu";
import Announcements from "./AnnouncementsPage";

export default function HomePage() {

  useEffect(() => {
    document.title = "BookBeat | Connect Artists with Venues";
  }, []);

  return (
    <div className="pt-20"> {/* ajustează valoarea după înălțimea navbarului */}
        <Announcements />
    </div>
  );
}
