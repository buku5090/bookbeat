import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";

import Button from "./Button";
import { Dialog, DialogContent } from "../src/components/ui/dialog";

import { storage } from "../src/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

/* ---------------- helpers: validare + normalizare ---------------- */

// accept DOAR http(s), blob:, data:image/ — NU rute relative “/…”
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
      const key = url;
      if (seen.has(key)) continue;
      out.push({ id: key, url });
      seen.add(key);
      continue;
    }

    if (typeof raw === "object") {
      const url = String(raw.url ?? raw.src ?? raw.imgUrl ?? "").trim();
      const id  = String(raw.id ?? raw.path ?? url ?? "").trim();
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
  normalizeItems(list).map(it => `${it.id}|${it.url}`).join(";");

/* ---------------- componenta ---------------- */

export default function MediaGallery({
  canEdit,
  authUser,
  items = [],
  max = 5,
  addButtonMode = "hide",         // "hide" | "disable"
  onChange,                       // primești lista curată
  onExceedMax,
}) {
  const [list, setList] = useState(() => normalizeItems(items));

  // re-sync când items din props se schimbă
  useEffect(() => setList(normalizeItems(items)), [items]);

  // auto-heal: dacă apar intrări invalide, curăță + emite
  const signature = useMemo(() => sig(list), [list]);
  useEffect(() => {
    const cleaned = normalizeItems(list);
    if (sig(cleaned) !== signature) {
      setList(cleaned);
      onChange?.(cleaned);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lbLoading, setLbLoading] = useState(false);

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

    const imageFiles = files.filter(f => f.type.startsWith("image/")).slice(0, remaining);
    if (imageFiles.length === 0) { e.target.value = ""; return; }

    setUploading(true);
    const results = [];
    try {
      for (const f of imageFiles) {
        const safeName = f.name.replace(/\s+/g, "-");
        const path = `users/${authUser.uid}/gallery/${Date.now()}-${safeName}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, f);
        const url = await getDownloadURL(ref);
        results.push({ id: path, url });
      }
      emit([...list, ...results]);
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
    } catch { /* ignore */ }
    finally {
      emit(list.filter(x => (x.id || x.url) !== (it.id || it.url)));
    }
  };

  // dacă imaginea nu se încarcă => elimin-o din listă (și din DB prin onChange)
  const handleImgError = (it) => {
    emit(list.filter(x => (x.id || x.url) !== (it.id || it.url)));
  };

  const openLightbox = (idx) => { setLightboxIndex(idx); setLbLoading(true); setLightboxOpen(true); };
  const next = () => { setLbLoading(true); setLightboxIndex(i => (i + 1) % list.length); };
  const prev = () => { setLbLoading(true); setLightboxIndex(i => (i - 1 + list.length) % list.length); };

  // prefetch curent + vecini
  useEffect(() => {
    if (!lightboxOpen || !list.length) return;
    const cur = new Image(); cur.src = list[lightboxIndex]?.url || "";
    const n = new Image();   n.src = list[(lightboxIndex + 1) % list.length]?.url || "";
    const p = new Image();   p.src = list[(lightboxIndex - 1 + list.length) % list.length]?.url || "";
  }, [lightboxOpen, lightboxIndex, list.length]);

  const onAddClick = () => {
    if (atLimit) { onExceedMax?.(max); return; }
    inputRef.current?.click();
  };

  const showAddButton = canEdit && (addButtonMode === "disable" || !atLimit);
  const addDisabled = addButtonMode === "disable" && atLimit;

  const renderList = useMemo(
    () => list.filter(it => it && isValidUrlish(it.url)),
    [list]
  );

  return (
    <section className="relative">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {renderList.map((img, idx) => (
          <div key={img.id || img.url} className="relative group aspect-square overflow-hidden rounded-lg border">
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => openLightbox(idx)}
              onError={() => handleImgError(img)}
              loading="lazy"
              decoding="async"
            />

            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteOne(img)}
                className="absolute top-2 right-2 bg-white/90 transition"
                title="Șterge"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => openLightbox(idx)}
              className="absolute bottom-2 right-2 bg-white/90
                         opacity-100 md:opacity-0 md:group-hover:opacity-100
                         transition"
              title="Mărește"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {/* Add tile */}
        {showAddButton && (
          <button
            type="button"
            onClick={onAddClick}
            disabled={addDisabled || uploading}
            className={[
              "aspect-square rounded-lg border-2 border-dashed flex items-center justify-center",
              "text-3xl text-gray-400 hover:text-gray-600 hover:border-gray-400",
              addDisabled || uploading ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
            title={atLimit ? `Ai atins limita de ${max} imagini` : "Adaugă imagini"}
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
              ? `Poți adăuga până la ${max} imagini. ${Math.max(0, max - renderList.length)} loc${Math.max(0, max - renderList.length) === 1 ? "" : "uri"} rămase.`
              : `Poți adăuga o singură imagine.`}
          </p>
        </>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl">
          <div className="relative">
            {renderList.length > 0 && (
              <>
                {lbLoading && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="h-10 w-10 rounded-full border-4 border-gray-300 border-t-black animate-spin" />
                  </div>
                )}
                <img
                  src={renderList[lightboxIndex]?.url}
                  alt=""
                  className={`w-full h-auto rounded ${lbLoading ? "opacity-0" : "opacity-100"} transition`}
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                  onLoad={() => setLbLoading(false)}
                />
                {renderList.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80"
                      aria-label="Anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={next}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80"
                      aria-label="Următor"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
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
