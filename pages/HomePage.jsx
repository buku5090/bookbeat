import { useEffect } from "react";
import MainMenu from "../components/MainMenu";
import ProfilesPage from "./ProfilesPage";


export default function HomePage() {

  useEffect(() => {
    document.title = "BookMix | Connect Artists with Venues";
  }, []);

  return (
    <div> {/* ajustează valoarea după înălțimea navbarului */}
        <ProfilesPage />
    </div>
  );
}
