// ArtistDemos.jsx — standalone JSX
import { useState, useMemo } from "react";

// Schimbă după proiectul tău (sau folosește un <button>)
import { Button } from "../uiux";

/* Helpers */
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
    const parts = u.pathname.split("/");
    const i = parts.indexOf("embed");
    if (i >= 0 && parts[i + 1]) return parts[i + 1];
  } catch {}
  return null;
};
const ytThumb = (url) => {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

/* Main component */
export default function ArtistDemos({ canEdit, current = [], onAdded, onDeleted }) {
  const [url, setUrl] = useState("");
  const remaining = useMemo(() => Math.max(0, 3 - (current?.length || 0)), [current?.length]);
  const disabled = !url || !isSupported(url) || current.length >= 3;

  const onAdd = () => {
    const clean = String(url).trim();
    if (!clean) return;
    if (!isSupported(clean)) return alert("Accept doar linkuri de pe YouTube / SoundCloud / Spotify / Mixcloud.");
    if (current.some((x) => x.url === clean)) return alert("Acest link există deja.");
    if (current.length >= 3) return alert("Poți adăuga maximum 3 link-uri de demo.");
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
              placeholder="Link YouTube / SoundCloud / Spotify / Mixcloud"
              className="flex-1 border rounded px-3 py-2"
            />
            <Button variant="primary" onClick={onAdd} disabled={disabled}>
              Adaugă
            </Button>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {remaining} loc(uri) rămase. Accept: YouTube, SoundCloud, Spotify, Mixcloud.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {current.map((d) => (
          <DemoCard key={d.url} demo={d} onDelete={onDeleted} canEdit={canEdit} />
        ))}
      </div>

      {(!current || current.length === 0) && (
        <p className="text-sm text-gray-500">Adaugă până la 3 link-uri către mixuri sau live-uri.</p>
      )}
    </div>
  );
}

/* Card + Embed */
function DemoCard({ demo, onDelete, canEdit }) {
  const p = platformFromUrl(demo.url);
  const thumb = demo.thumb || (p === "youtube" ? ytThumb(demo.url) : null);
  const badgeCls =
    "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-gray-100";
  const icon =
    { youtube: "▶", soundcloud: "🎧", mixcloud: "☁️", spotify: "🟢" }[p] || "🔗";

  return (
    <div className="border rounded-2xl overflow-hidden shadow-sm bg-white flex flex-col">
      {thumb ? (
        <a href={demo.url} target="_blank" rel="noreferrer" className="block">
          <img src={thumb} alt="thumbnail" className="w-full h-40 object-cover" />
        </a>
      ) : (
        <a href={demo.url} target="_blank" rel="noreferrer" className="block">
          <div className="w-full h-40 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-4xl">
            {icon}
          </div>
        </a>
      )}

      <div className="p-3 space-y-2 flex-1">
        <span className={badgeCls}>
          {icon} {p}
        </span>
        {/* un singur rând + … */}
        <a
          href={demo.url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 block truncate break-all max-w-full"
          title={demo.url}
        >
          {demo.url}
        </a>

        <div className="rounded-xl overflow-hidden border">
          <DemoEmbed url={demo.url} />
        </div>
      </div>

      {canEdit && (
        <div className="p-3 pt-0 flex justify-end">
          <Button variant="secondary" onClick={() => onDelete?.(demo.url)}>
            Șterge
          </Button>
        </div>
      )}
    </div>
  );
}

function DemoEmbed({ url }) {
  const p = platformFromUrl(url);

  if (p === "youtube") {
    const id = youtubeId(url);
    if (!id) return null;
    return (
      <div className="aspect-video w-full">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${id}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="YouTube player"
        />
      </div>
    );
  }

  if (p === "soundcloud") {
    const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`;
    return (
      <iframe
        title="SoundCloud player"
        className="w-full"
        height="120"
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        src={src}
      />
    );
  }

  if (p === "mixcloud") {
    const src = `https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=${encodeURIComponent(
      url
    )}`;
    return <iframe title="Mixcloud player" className="w-full" height="120" frameBorder="0" src={src} />;
  }

  if (p === "spotify") {
    const embed = url.replace("open.spotify.com/", "open.spotify.com/embed/");
    return (
      <iframe
        title="Spotify player"
        className="w-full"
        height="100"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        src={embed}
      />
    );
  }

  return null;
}
