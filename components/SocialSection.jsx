import React, { useMemo, useState } from "react";
import {
  Pencil, Instagram, Youtube, Globe, Music2, Radio, Share2,
} from "lucide-react";

/* -------- utils -------- */
function normalizeInstagramHandle(val = "") {
  let v = (val || "").trim();
  if (!v) return "";
  v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, ""); // scoate URL-ul
  v = v.replace(/^@+/, "");                                    // scoate @
  v = v.split(/[/?#]/)[0];                                     // doar handle-ul
  return v;
}

function normalizeUrl(val = "") {
  const v = (val || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^www\./i.test(v)) return `https://${v}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return `https://${v}`;
  return v;
}

function withHttp(url = "") {
  const v = (url || "").trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/* -------- mini EditableField intern -------- */
function InlineEditableField({
  label,
  value,
  placeholder,
  canEdit,
  isLink = false,
  linkPrefix = "",
  onSave, // (val) => void
}) {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp] = useState(value || "");

  const href = useMemo(() => {
    if (!isLink) return "";
    if (linkPrefix) {
      const handle = (value || "").trim().replace(/^@/, "");
      return handle ? `${linkPrefix}${handle}` : "";
    }
    return withHttp(value || "");
  }, [value, isLink, linkPrefix]);

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-gray-600">{label}</div>

      {!editing ? (
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm break-all">
            {value ? (
              isLink ? (
                <a
                  className="text-blue-600 hover:underline"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label === "Instagram" ? `@${String(value).replace(/^@/, "")}` : String(value)}
                </a>
              ) : (
                String(value)
              )
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => { setTmp(value || ""); setEditing(true); }}
              className="p-2 rounded hover:bg-gray-50 text-gray-500"
              title={`Editează ${label}`}
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={placeholder}
            value={tmp}
            onChange={(e) => setTmp(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setEditing(false); setTmp(value || ""); }
              if (e.key === "Enter")  { onSave?.(tmp); setEditing(false); }
            }}
            autoFocus
          />
          <button
            type="button"
            className="px-3 py-2 rounded bg-black text-white text-xs hover:bg-gray-900"
            onClick={() => { onSave?.(tmp); setEditing(false); }}
          >
            Salvează
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded border text-xs"
            onClick={() => { setEditing(false); setTmp(value || ""); }}
          >
            Anulează
          </button>
        </div>
      )}
    </div>
  );
}

/* -------- rândul de icoane -------- */
function IconsRow({ user = {} }) {
  const items = [
    user.instagram && { key: "instagram", url: `https://instagram.com/${String(user.instagram).replace(/^@/, "")}`, Icon: Instagram },
    user.youtube   && { key: "youtube",   url: user.youtube,    Icon: Youtube },
    user.soundcloud&& { key: "soundcloud",url: user.soundcloud, Icon: Music2 },
    user.spotify   && { key: "spotify",   url: user.spotify,    Icon: Music2 }, // << în loc de Spotify
    user.mixcloud  && { key: "mixcloud",  url: user.mixcloud,   Icon: Radio },
    user.website   && { key: "website",   url: user.website,    Icon: Globe },
    user.tiktok    && { key: "tiktok",    url: user.tiktok,     Icon: Share2 },
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <div className="mt-1 flex items-center gap-3">
      {items.map(({ key, url, Icon }) => (
        <a
          key={key}
          href={withHttp(url)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={key}
          className="inline-flex items-center justify-center rounded-full border text-gray-700 hover:bg-gray-50 p-2"
        >
          <Icon size={16} />
        </a>
      ))}
    </div>
  );
}

/* -------- Componenta publică -------- */
export default function SocialSection({
  user = {},
  canEdit = false,
  onConfirm,                 // ({ field, value }) => void
  title = "SOCIAL",
  hiddenWhenEmpty = true,
}) {
  const links = useMemo(
    () => ({
      instagram: user.instagram || "",
      youtube: user.youtube || "",
      soundcloud: user.soundcloud || "",
      website: user.website || "",
      spotify: user.spotify || "",
      mixcloud: user.mixcloud || "",
      tiktok: user.tiktok || "",
    }),
    [user]
  );

  const hasAny = Object.values(links).some(Boolean);
  if (hiddenWhenEmpty && !hasAny && !canEdit) return null;

  return (
    <section className="relative">
      <h3 className="font-extrabold tracking-tight text-black text-3xl md:text-4xl mb-2">
        {title}
      </h3>

      <IconsRow user={links} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <InlineEditableField
          label="Instagram"
          value={links.instagram}
          placeholder="@instagram"
          canEdit={canEdit}
          isLink
          linkPrefix="https://instagram.com/"
          onSave={(val) =>
            onConfirm?.({ field: "instagram", value: normalizeInstagramHandle(val) })
          }
        />

        <InlineEditableField
          label="YouTube"
          value={links.youtube}
          placeholder="https://youtube.com/..."
          canEdit={canEdit}
          isLink
          onSave={(val) =>
            onConfirm?.({ field: "youtube", value: normalizeUrl(val) })
          }
        />

        <InlineEditableField
          label="SoundCloud"
          value={links.soundcloud}
          placeholder="https://soundcloud.com/..."
          canEdit={canEdit}
          isLink
          onSave={(val) =>
            onConfirm?.({ field: "soundcloud", value: normalizeUrl(val) })
          }
        />

        <InlineEditableField
          label="Website"
          value={links.website}
          placeholder="https://..."
          canEdit={canEdit}
          isLink
          onSave={(val) =>
            onConfirm?.({ field: "website", value: normalizeUrl(val) })
          }
        />
      </div>
    </section>
  );
}
