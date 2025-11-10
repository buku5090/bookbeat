// components/MediaGallery.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Trash2, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Dialog, DialogContent } from "../uiux";
import { storage } from "../../src/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useTranslation } from "react-i18next";

/* ---------------- helpers ---------------- */
const isValidUrlish = (s = "") => /^(https?:\/\/|blob:|data:image\/)/i.test(String(s).trim());

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

const sig = (list = []) => normalizeItems(list).map((it) => `${it.id}|${it.url}`).join(";");

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

/* ---------------- component ---------------- */
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

  const [list, setList] = useState(() => normalizeItems(items));
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lbLoading, setLbLoading] = useState(false);
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

    const imageFiles = files.filter((f) => f.type.startsWith("image/")).slice(0, remaining);
    if (imageFiles.length === 0) {
      e.target.value = "";
      return;
    }

    setUploadError("");
    setUploading(true);
    const results = [];
    const skipped = { tooLargeBytes: 0, tooSmallRes: 0, tooBigRes: 0, other: 0 };

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

      if (skipped.tooLargeBytes || skipped.tooSmallRes || skipped.tooBigRes || skipped.other) {
        const msg = t("mediaGallery.some_ignored", {
          bytes: skipped.tooLargeBytes,
          small: skipped.tooSmallRes,
          big: skipped.tooBigRes,
          other: skipped.other,
          sizeMB: maxFileSizeMB,
          minW: minWidth,
          minH: minHeight,
          maxW: maxWidth,
          maxH: maxHeight
        });
        setUploadError(msg);
        onValidationError?.(msg, { ...skipped, maxFileSizeMB, minWidth, minHeight, maxWidth, maxHeight });
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

  const openLightbox = (idx) => {
    setLightboxIndex(idx);
    setLbLoading(true);
    setLightboxOpen(true);
  };

  const next = useCallback(() => {
    if (!list.length) return;
    setLbLoading(true);
    setLightboxIndex((i) => (i + 1) % list.length);
  }, [list.length]);

  const prev = useCallback(() => {
    if (!list.length) return;
    setLbLoading(true);
    setLightboxIndex((i) => (i - 1 + list.length) % list.length);
  }, [list.length]);

  useEffect(() => {
    if (!lightboxOpen || !list.length) return;
    const cur = new Image();
    cur.src = list[lightboxIndex]?.url || "";
    const n = new Image();
    n.src = list[(lightboxIndex + 1) % list.length]?.url || "";
    const p = new Image();
    p.src = list[(lightboxIndex - 1 + list.length) % list.length]?.url || "";
  }, [lightboxOpen, lightboxIndex, list.length]);

  useEffect(() => {
    if (!lightboxOpen || typeof window === "undefined") return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (renderList.length > 1) next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (renderList.length > 1) prev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, next, prev]);

  useEffect(() => {
    if (!lightboxOpen) return;
    setLbLoading(true);
  }, [lightboxIndex, lightboxOpen]);

  const onAddClick = () => {
    if (atLimit) {
      onExceedMax?.(max);
      return;
    }
    inputRef.current?.click();
  };

  const showAddButton = canEdit && (addButtonMode === "disable" || !atLimit);
  const addDisabled = addButtonMode === "disable" && atLimit;

  const renderList = useMemo(() => list.filter((it) => it && isValidUrlish(it.url)), [list]);

  return (
    <section className="relative">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {renderList.map((img, idx) => (
          <div key={img.id || img.url} className="relative group aspect-square overflow-hidden rounded-lg border">
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-cover cursor-zoom-in will-change-transform"
              onClick={() => openLightbox(idx)}
              onError={() => handleImgError(img)}
              loading="lazy"
              decoding="async"
            />

            {canEdit && (
              <Button
                variant="outline"
                onClick={() => deleteOne(img)}
                className="!bg-white hover:!bg-gray-200 !border-gray-200 absolute top-2 right-2 transition !px-3"
                title={t("common.delete")}
                aria-label={t("common.delete")}
              >
                <Trash2 className="w-4 h-4 text-black" />
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => openLightbox(idx)}
              className="absolute bottom-2 right-2 !bg-white hover:!bg-gray-200 !border-gray-200 hidden md:flex transition !px-3"
              title={t("mediaGallery.enlarge")}
              aria-label={t("mediaGallery.enlarge")}
            >
              <Maximize2 className="w-4 h-4 text-black" />
            </Button>
          </div>
        ))}

        {showAddButton && (
          <button
            type="button"
            onClick={onAddClick}
            disabled={addDisabled || uploading}
            className={[
              "!bg-gray-300 aspect-square rounded-lg border-2 border-dashed flex items-center justify-center",
              "text-3xl text-gray-400 hover:text-white hover:!border-white",
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
          <p className="text-xs text-gray-500 mt-1">
            {max > 1
              ? t("mediaGallery.hint_multi", {
                  max,
                  remaining: Math.max(0, max - renderList.length),
                })
              : t("mediaGallery.hint_single")}
          </p>
          {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
        </>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl p-0 bg-black/95">
          <div
            className="relative w-full h-[80vh] sm:h-[82vh] flex items-center justify-center"
            onTouchStart={(e) => {
              const t0 = e.touches?.[0];
              e.currentTarget.dataset.tsx = String(t0?.clientX ?? 0);
              e.currentTarget.dataset.tsy = String(t0?.clientY ?? 0);
            }}
            onTouchEnd={(e) => {
              const sx = Number(e.currentTarget.dataset.tsx || 0);
              const sy = Number(e.currentTarget.dataset.tsy || 0);
              const t1 = e.changedTouches?.[0];
              if (!t1) return;
              const dx = t1.clientX - sx,
                dy = t1.clientY - sy;
              if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
                dx < 0 ? next() : prev();
              }
            }}
          >
            {renderList.length > 0 && (
              <>
                {lbLoading && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                  </div>
                )}
                <img
                  src={renderList[lightboxIndex]?.url}
                  alt=""
                  className={[
                    "max-h-full max-w-full object-contain select-none transition-opacity duration-200",
                    lbLoading ? "opacity-0" : "opacity-100",
                  ].join(" ")}
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                  onLoad={() => setLbLoading(false)}
                  draggable={false}
                />
                {renderList.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prev}
                      aria-label={t("common.prev")}
                      className="absolute left-0 !bg-white"
                    >
                      <ChevronLeft className="w-15 h-15 sm:w-10 sm:h-10 !text-gray-800" strokeWidth={2.5} />
                    </button>

                    <button
                      type="button"
                      onClick={next}
                      aria-label={t("common.next")}
                      className="absolute right-0 !bg-white"
                    >
                      <ChevronRight className="w-15 h-15 sm:w-10 sm:h-10 !text-gray-800" strokeWidth={2.5} />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
