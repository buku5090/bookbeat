import { useState, useMemo } from "react";
import { Button } from "../uiux";
import { useTranslation } from "react-i18next";

// ——— BookMix palette
const BM = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#E50914",
  purple: "#8A2BE2",
  teal: "#00CED1",
};

// ——— helpers
const SUPPORTED = ["youtube", "soundcloud", "mixcloud", "spotify"];
const platformFromUrl = (url = "") => {
  const u = url.toLowerCase();
  if (u.includes("soundcloud.com")) return "soundcloud";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("mixcloud.com")) return "mixcloud";
  if (u.includes("spotify.com")) return "spotify";
  return "link";
};
const isSupported = (url) => SUPPORTED.includes(platformFromUrl(url));
const youtubeId = (url = "") => {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.split("/")[1];
    if (u.searchParams.get("v")) return u.searchParams.get("v");
  } catch {}
  return null;
};
const ytThumb = (url) => {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

export default function ArtistDemos({ canEdit, current = [], onAdded, onDeleted }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const remaining = useMemo(() => Math.max(0, 3 - (current?.length || 0)), [current?.length]);
  const disabled = !url || !isSupported(url) || current.length >= 3;

  const onAdd = () => {
    const clean = String(url).trim();
    if (!clean) return;
    if (!isSupported(clean)) return alert(t("demos.unsupported"));
    if (current.some((x) => x.url === clean)) return alert(t("demos.duplicate"));
    if (current.length >= 3) return alert(t("demos.max_reached"));
    onAdded?.([{ url: clean }]);
    setUrl("");
  };

  return (
    <div
      className="w-full rounded-2xl p-4 md:p-5"
      style={{ backgroundColor: BM.black }}
    >
      {canEdit && (
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("demos.placeholder")}
              className="flex-1 rounded-xl px-4 py-2 outline-none border !border-neutral-800 bg-neutral-900 text-neutral-100 placeholder-neutral-500 focus:!border-teal-400 focus:!ring-2 focus:!ring-teal-500/40 transition"
              style={{ '--tw-ring-color': BM.teal }}
            />
            <Button
              variant="primary"
              onClick={onAdd}
              disabled={disabled}
              className="!bg-[var(--bm-teal)] !text-black !font-semibold !px-4 !py-2 !rounded-xl hover:!opacity-90 disabled:!opacity-40"
              style={{ ['--bm-teal']: BM.teal }}
            >
              {t("demos.add")}
            </Button>
          </div>
          <div className="mt-2 text-xs" style={{ color: "#bfbfbf" }}>
            {t("demos.remaining", { count: remaining })}{" "}
            <span className="ml-2 px-2 py-[2px] rounded-full"
              style={{ background: BM.purple, color: BM.white }}>
              3 max
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {current.map((d) => (
          <DemoCard key={d.url} demo={d} onDelete={onDeleted} canEdit={canEdit} />
        ))}
      </div>

      {(!current || current.length === 0) && (
        <p className="text-sm mt-2" style={{ color: "#9CA3AF" }}>
          {t("demos.empty")}
        </p>
      )}
    </div>
  );
}

function DemoCard({ demo, onDelete, canEdit }) {
  const { t } = useTranslation();
  const p = platformFromUrl(demo.url);
  const thumb = demo.thumb || (p === "youtube" ? ytThumb(demo.url) : null);
  const icon = { youtube: "▶", soundcloud: "🎧", mixcloud: "☁️", spotify: "🟢" }[p] || "🔗";

  return (
    <div
      className="rounded-2xl overflow-hidden border shadow-sm flex flex-col"
      style={{ backgroundColor: "#0b0b0b", borderColor: "#1f1f1f" }}
    >
      <a href={demo.url} target="_blank" rel="noreferrer" className="block">
        {thumb ? (
          <img src={thumb} alt="thumbnail" className="w-full h-40 object-cover" />
        ) : (
          <div
            className="w-full h-40 flex items-center justify-center text-4xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(138,43,226,0.15), rgba(0,206,209,0.15))",
              color: BM.white,
            }}
          >
            {icon}
          </div>
        )}
      </a>

      <div className="p-3 space-y-2 flex-1">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
          style={{ background: "rgba(138,43,226,0.18)", color: BM.white, border: "1px solid rgba(138,43,226,0.35)" }}
        >
          {icon} {p}
        </span>

        <a
          href={demo.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate break-all max-w-full"
          style={{ color: BM.teal }}
        >
          {demo.url}
        </a>

        <div
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: "#2a2a2a", backgroundColor: "#0e0e0e" }}
        >
          <DemoEmbed url={demo.url} />
        </div>
      </div>

      {canEdit && (
        <div className="p-3 pt-0 flex justify-end">
          <button
            onClick={() => onDelete?.(demo.url)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
            style={{
              backgroundColor: BM.red,
              color: BM.white,
              boxShadow: "0 0 0 1px rgba(229,9,20,0.4) inset",
            }}
          >
            {t("demos.delete")}
          </button>
        </div>
      )}
    </div>
  );
}

function DemoEmbed({ url }) {
  const p = platformFromUrl(url);
  const id = youtubeId(url);

  if (p === "youtube" && id)
    return (
      <iframe
        className="w-full aspect-video"
        src={`https://www.youtube.com/embed/${id}`}
        frameBorder="0"
        allowFullScreen
        style={{ backgroundColor: "#0e0e0e" }}
      />
    );

  if (p === "soundcloud")
    return (
      <iframe
        className="w-full"
        height="120"
        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%2300CED1`}
        style={{ backgroundColor: "#0e0e0e" }}
      />
    );

  if (p === "mixcloud")
    return (
      <iframe
        className="w-full"
        height="120"
        src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=${encodeURIComponent(
          url
        )}`}
        style={{ backgroundColor: "#0e0e0e" }}
      />
    );

  if (p === "spotify")
    return (
      <iframe
        className="w-full"
        height="100"
        src={url.replace("open.spotify.com/", "open.spotify.com/embed/")}
        style={{ backgroundColor: "#0e0e0e" }}
      />
    );

  return null;
}
