// components/MediaGallery.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Trash2, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../uiux";
import { storage } from "../../src/firebase";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { useTranslation } from "react-i18next";
import { useGlobalDialog } from "../../context/GlobalDialogContext";

/* ---------------- helpers ---------------- */
const isValidUrlish = (s = "") =>
  /^(https?:\/\/|blob:|data:image\/)/i.test(String(s).trim());

function normalizeItems(arr = []) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(arr) ? arr : []) {
    if (!raw) continue;
    if (typeof raw === "string") {
      const url = raw.trim();
      if (!isValidUrlish(url)) continue;
      if (seen.has(url)) continue;
      out.push({ id: url, url });
      seen.add(url);
    } else if (typeof raw === "object") {
      const url = String(raw.url ?? raw.src ?? raw.imgUrl ?? "").trim();
      const id = String(raw.id ?? raw.path ?? url ?? "").trim();
      if (!isValidUrlish(url)) continue;
      const key = id || url;
      if (seen.has(key)) continue;
      out.push({ id: key, url });
      seen.add(key);
    }
  }
  return out;
}

const sig = (list = []) =>
  normalizeItems(list)
    .map((it) => `${it.id}|${it.url}`)
    .join(";");

async function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      URL.revokeObjectURL(url);
      resolve({ width: w, height: h });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/* --------- Lightbox content rendered inside GlobalDialog --------- */
function GalleryLightbox({ images, startIndex = 0 }) {
  const { closeDialog } = useGlobalDialog();
  const [index, setIndex] = useState(startIndex);
  const [isFading, setIsFading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // 👈 pt. border după load
  const fadeTimeoutRef = useRef(null);

  const hasMultiple = images.length > 1;
  const current = images[index] || images[0];

  const changeImage = useCallback(
    (delta) => {
      if (!hasMultiple || isFading || images.length <= 1) return;

      setIsFading(true);
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }

      fadeTimeoutRef.current = window.setTimeout(() => {
        setIndex((prev) => {
          const len = images.length || 1;
          return (prev + delta + len) % len;
        });
        setIsLoaded(false); // 👈 resetăm încărcarea la schimbarea pozei
        setIsFading(false);
      }, 160);
    },
    [hasMultiple, isFading, images.length]
  );

  const goNext = useCallback(() => changeImage(+1), [changeImage]);
  const goPrev = useCallback(() => changeImage(-1), [changeImage]);

  // SWIPE HANDLERS (mobil)
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const onTouchEnd = () => {
    const delta = touchEndX.current - touchStartX.current;
    if (Math.abs(delta) < 50) return;
    if (delta < 0) goNext();
    if (delta > 0) goPrev();
  };

  // ESC + săgeți desktop
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDialog, goNext, goPrev]);

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  if (!current) return null;

  return (
    <div
      className="
        relative w-full h-full    // 👈 nu mai e fixed inset-0
        bg-black
        select-none
        flex flex-col items-center justify-center
      "
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* CADRUL IMAGINII */}
      <div
        className="
          w-fit max-w-3xl mx-auto
          h-[60vh] sm:h-[70vh]
          flex items-center justify-center
        "
      >
        <img
          src={current.url}
          alt=""
          onClick={goNext}               // 👈 tap/click pe poză = next
          onLoad={() => setIsLoaded(true)} // 👈 când s-a încărcat, afișăm border
          className={`
            h-full max-w-[90%]
            object-cover object-center
            rounded-xl shadow-xl
            ${isLoaded ? "border-4 border-pink-400" : "border-0"} 
            transition-all duration-200 ease-out
            ${isFading ? "opacity-0" : "opacity-100"}
          `}
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* NAVIGAȚIE – desktop */}
      {hasMultiple && (
        <>
          <button
            onClick={goPrev}
            className="
              hidden sm:flex
              absolute left-4 sm:left-8
              top-1/2 -translate-y-1/2 z-40 p-3
              !bg-transparent border !border-[#FF4FB0] rounded-full
              hover:bg-white/20 transition
            "
          >
            <ChevronLeft className="w-7 h-7 text-white" />
          </button>

          <button
            onClick={goNext}
            className="
              hidden sm:flex
              absolute right-4 sm:right-8
              top-1/2 -translate-y-1/2 z-40 p-3
              !bg-transparent border !border-[#FF4FB0] rounded-full
              hover:!border-transition
            "
          >
            <ChevronRight className="w-7 h-7 text-white" />
          </button>
        </>
      )}

      {/* INDICATOARE */}
      {hasMultiple && (
        <div className="mt-4 mb-10 flex justify-center gap-2">
          {images.map((img, i) => (
            <span
              key={img.id || img.url}
              className={`
                h-2 rounded-full transition-all
                ${i === index ? "w-7 bg-pink-400" : "w-3 bg-white/60"}
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}



/* ---------------- component principal ---------------- */
export default function MediaGallery({
  canEdit,
  authUser,
  items = [],
  max = 5,
  addButtonMode = "hide",
  onChange,
  onExceedMax,
  maxFileSizeMB = 8,
  minWidth = 400,
  minHeight = 400,
  maxWidth = 6000,
  maxHeight = 6000,
  onValidationError,
}) {
  const { t } = useTranslation();
  const { openDialog } = useGlobalDialog();

  const [list, setList] = useState(() => normalizeItems(items));
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => setList(normalizeItems(items)), [items]);

  const signature = useMemo(() => sig(list), [list]);

  useEffect(() => {
    const cleaned = normalizeItems(list);
    if (sig(cleaned) !== signature) {
      setList(cleaned);
      onChange?.(cleaned);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const atLimit = list.length >= max;
  const remaining = Math.max(0, max - list.length);

  const emit = (next) => {
    const cleaned = normalizeItems(next);
    setList(cleaned);
    onChange?.(cleaned);
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!authUser || files.length === 0) return;

    if (remaining <= 0) {
      onExceedMax?.(max);
      e.target.value = "";
      return;
    }

    const imageFiles = files
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining);
    if (imageFiles.length === 0) {
      e.target.value = "";
      return;
    }

    setUploadError("");
    setUploading(true);
    const results = [];
    const skipped = {
      tooLargeBytes: 0,
      tooSmallRes: 0,
      tooBigRes: 0,
      other: 0,
    };

    try {
      for (const f of imageFiles) {
        const maxBytes = maxFileSizeMB * 1024 * 1024;
        if (f.size > maxBytes) {
          skipped.tooLargeBytes++;
          continue;
        }

        try {
          const { width, height } = await getImageDimensions(f);
          if (width < minWidth || height < minHeight) {
            skipped.tooSmallRes++;
            continue;
          }
          if (width > maxWidth || height > maxHeight) {
            skipped.tooBigRes++;
            continue;
          }
        } catch {
          skipped.other++;
          continue;
        }

        const safeName = f.name.replace(/\s+/g, "-");
        const path = `users/${authUser.uid}/gallery/${Date.now()}-${safeName}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, f);
        const url = await getDownloadURL(ref);
        results.push({ id: path, url });
      }

      if (results.length) emit([...list, ...results]);

      if (
        skipped.tooLargeBytes ||
        skipped.tooSmallRes ||
        skipped.tooBigRes ||
        skipped.other
      ) {
        const msg = t("mediaGallery.some_ignored", {
          bytes: skipped.tooLargeBytes,
          small: skipped.tooSmallRes,
          big: skipped.tooBigRes,
          other: skipped.other,
          sizeMB: maxFileSizeMB,
          minW: minWidth,
          minH: minHeight,
          maxW: maxWidth,
          maxH: maxHeight,
        });
        setUploadError(msg);
        onValidationError?.(msg, {
          ...skipped,
          maxFileSizeMB,
          minWidth,
          minHeight,
          maxWidth,
          maxHeight,
        });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteOne = async (it) => {
    if (!it) return;
    try {
      const canDeleteFromStorage = it.id && !/^https?:\/\//i.test(it.id);
      if (canDeleteFromStorage) {
        await deleteObject(storageRef(storage, it.id));
      }
    } catch {
      /* ignore */
    } finally {
      emit(list.filter((x) => (x.id || x.url) !== (it.id || it.url)));
    }
  };

  const handleImgError = (it) => {
    emit(list.filter((x) => (x.id || x.url) !== (it.id || it.url)));
  };

  const renderList = useMemo(
    () => list.filter((it) => it && isValidUrlish(it.url)),
    [list]
  );

  const openLightbox = (idx) => {
    if (!renderList.length) return;

    openDialog({
      title: "",
      widthClass: "w-screen max-w-none",
      heightClass: "h-screen",
      bgClass: "bg-black",
      fullscreen: true, // 👈 nou
      content: <GalleryLightbox images={renderList} startIndex={idx} />,
    });
  };

  const onAddClick = () => {
    if (atLimit) {
      onExceedMax?.(max);
      return;
    }
    inputRef.current?.click();
  };

  const showAddButton = canEdit && (addButtonMode === "disable" || !atLimit);
  const addDisabled = addButtonMode === "disable" && atLimit;

  return (
    <section className="relative">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {renderList.map((img, idx) => (
          <div
            key={img.id || img.url}
            className="relative group aspect-square overflow-hidden rounded-lg border border-neutral-800 bg-black"
          > {/* thumbnail */}
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-cover cursor-zoom-in will-change-transform group-hover:scale-[1.02] transition-transform"
              onClick={() => openLightbox(idx)}
              onError={() => handleImgError(img)}
              loading="lazy"
              decoding="async"
            />

            {canEdit && (
              <Button
                onClick={() => deleteOne(img)}
                className="group !bg-black/80 hover:!bg-black !border-[#8A2BE2] group-hover:!border-[#E50914] absolute top-2 right-2 transition !px-3"
                title={t("common.delete")}
                aria-label={t("common.delete")}
              >
                <Trash2 className="w-4 h-4 text-white group-hover:text-[#E50914] transition" />
              </Button>
            )}

          </div>
        ))}

        {showAddButton && (
          <button
            type="button"
            onClick={onAddClick}
            disabled={addDisabled || uploading}
            className={[
              "aspect-square rounded-lg border-2 border-dashed flex items-center justify-center",
              "bg-neutral-900 border-neutral-700 text-3xl text-neutral-500",
              "hover:text-white hover:border-pink-500 hover:bg-neutral-800",
              addDisabled || uploading ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
            title={
              atLimit
                ? t("mediaGallery.reached_limit", { max })
                : t("mediaGallery.add_images")
            }
            aria-label={
              atLimit
                ? t("mediaGallery.reached_limit", { max })
                : t("mediaGallery.add_images")
            }
          >
            {uploading ? "…" : "+"}
          </button>
        )}
      </div>

      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFiles}
            disabled={addDisabled}
          />
          <p className="text-xs text-neutral-400 mt-1">
            {max > 1
              ? t("mediaGallery.hint_multi", {
                  max,
                  remaining: Math.max(0, max - renderList.length),
                })
              : t("mediaGallery.hint_single")}
          </p>
          {uploadError && (
            <p className="text-xs text-red-500 mt-1">{uploadError}</p>
          )}
        </>
      )}
    </section>
  );
}
