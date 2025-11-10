import { useState, useMemo } from "react";
import { Button } from "../uiux";
import { useTranslation } from "react-i18next";

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
    <div className="w-full">
      {canEdit && (
        <div className="mb-3">
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("demos.placeholder")}
              className="flex-1 border rounded px-3 py-2"
            />
            <Button variant="primary" onClick={onAdd} disabled={disabled}>
              {t("demos.add")}
            </Button>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {t("demos.remaining", { count: remaining })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {current.map((d) => (
          <DemoCard key={d.url} demo={d} onDelete={onDeleted} canEdit={canEdit} />
        ))}
      </div>

      {(!current || current.length === 0) && (
        <p className="text-sm text-gray-500">{t("demos.empty")}</p>
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
    <div className="border rounded-2xl overflow-hidden shadow-sm bg-white flex flex-col">
      <a href={demo.url} target="_blank" rel="noreferrer" className="block">
        {thumb ? (
          <img src={thumb} alt="thumbnail" className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-4xl">
            {icon}
          </div>
        )}
      </a>

      <div className="p-3 space-y-2 flex-1">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-gray-100">
          {icon} {p}
        </span>
        <a href={demo.url} target="_blank" rel="noreferrer" className="text-blue-600 block truncate break-all max-w-full">
          {demo.url}
        </a>
        <div className="rounded-xl overflow-hidden border">
          <DemoEmbed url={demo.url} />
        </div>
      </div>

      {canEdit && (
        <div className="p-3 pt-0 flex justify-end">
          <Button variant="secondary" onClick={() => onDelete?.(demo.url)}>
            {t("demos.delete")}
          </Button>
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
      />
    );

  if (p === "soundcloud")
    return <iframe className="w-full" height="120" src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`} />;

  if (p === "mixcloud")
    return <iframe className="w-full" height="120" src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=${encodeURIComponent(url)}`} />;

  if (p === "spotify")
    return <iframe className="w-full" height="100" src={url.replace("open.spotify.com/", "open.spotify.com/embed/")} />;

  return null;
}
