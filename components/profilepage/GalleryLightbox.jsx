// components/GalleryLightbox.jsx
import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/zoom.css";
import { useTranslation } from "react-i18next";

export default function GalleryLightbox({ images = [], trigger }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const slides = images.map((src) => ({ src }));

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="cursor-pointer"
        title={t("gallery.open")}
      >
        {trigger}
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={slides}
        plugins={[Zoom]}
      />
    </>
  );
}
