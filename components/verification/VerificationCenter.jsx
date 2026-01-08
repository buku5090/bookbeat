// components/verificationcenter.jsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export default function VerificationCenter({
  userData,
  verificationStatus = "unverified",
  onClose,
  onMarkRequested,
}) {
  const { t } = useTranslation();

  const isArtist = userData?.type === "artist";
  const isLocation = userData?.type === "location";

  const displayName = useMemo(() => {
    if (isArtist) return userData?.stageName || userData?.name || "Artist";
    if (isLocation) return userData?.locationName || userData?.name || "Location";
    return userData?.name || "User";
  }, [userData, isArtist, isLocation]);

  const statusLabel = {
    unverified: t("verification.status.unverified", "Neconfirmat"),
    pending: t("verification.status.pending", "În curs de verificare"),
    verified: t("verification.status.verified", "Verificat"),
    rejected: t("verification.status.rejected", "Respins"),
  }[verificationStatus || "unverified"];

  const statusClasses = {
    unverified: "bg-zinc-800 border-zinc-600 text-zinc-100",
    pending: "bg-amber-900/40 border-amber-500 text-amber-100",
    verified: "bg-emerald-900/40 border-emerald-500 text-emerald-100",
    rejected: "bg-rose-900/40 border-rose-500 text-rose-100",
  }[verificationStatus || "unverified"];

  const showRequestButton = verificationStatus === "unverified" || verificationStatus === "rejected";

  const instagramHandle = "@bookmix.app"; // schimbă cu contul tău real

  return (
    <div
      className="
        w-full rounded-2xl border border-white/10 bg-black
        shadow-[0_18px_40px_rgba(0,0,0,0.6)] p-5 sm:p-7 md:p-8
      "
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white">
            {t("verification.title", "Centru de verificare")}
          </h2>
          <p className="mt-1 text-sm text-zinc-300">
            {t(
              "verification.subtitle",
              "Luăm foarte în serios siguranța utilizatorilor. Verificăm manual conturile de artiști și locații pentru a preveni profile false, evenimente fantomă și colaborări nesigure."
            )}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-sm px-2 py-1 rounded-full hover:bg-zinc-800/70"
          >
            ✕
          </button>
        )}
      </div>

      {/* Status card */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-400 mb-1">
            {t("verification.for_profile", "Profil verificat pentru")}
          </div>
          <div className="text-lg font-semibold text-white">{displayName}</div>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${statusClasses}`}
        >
          <span className="text-base">
            {verificationStatus === "verified" && "✅"}
            {verificationStatus === "pending" && "⏳"}
            {verificationStatus === "unverified" && "⚪"}
            {verificationStatus === "rejected" && "⚠️"}
          </span>
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Mesaj despre siguranță */}
      <div className="mb-5 rounded-xl border border-indigo-500/40 bg-indigo-950/60 px-4 py-3 text-xs sm:text-sm text-indigo-50">
        <p className="font-medium mb-1">
          {t(
            "verification.safety.title",
            "Siguranța comunității BookMix este prioritatea noastră."
          )}
        </p>
        <p className="text-indigo-100/90">
          {t(
            "verification.safety.body",
            "Verificăm manual conturile de artiști și locații pentru a preveni profile false, evenimente fantomă și colaborări nesigure."
          )}
        </p>
      </div>

      {/* Secțiune: Pașii pentru verificare */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-3">
          {t("verification.steps.title", "Cum funcționează verificarea")}
        </h3>

        <div className="space-y-3 text-xs sm:text-sm text-zinc-100">
          {/* Pas 1 */}
          <div className="rounded-lg border border-white/12 bg-zinc-900 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg font-semibold">①</div>
              <div>
                <p className="font-medium mb-1">
                  {t(
                    "verification.steps.instagram.title",
                    "Trimite-ne un mesaj pe Instagram de pe contul oficial"
                  )}
                </p>
                <p className="text-zinc-200 mb-1.5">
                  {isArtist &&
                    t(
                      "verification.steps.instagram.artist",
                      "Dacă ești artist, scrie-ne de pe contul tău oficial de Instagram, astfel încât să putem confirma că profilul de BookMix îți aparține."
                    )}
                  {isLocation &&
                    t(
                      "verification.steps.instagram.location",
                      "Dacă reprezinți o locație, scrie-ne de pe contul oficial de Instagram al locației pentru a confirma că ai drept de administrare."
                    )}
                  {!isArtist &&
                    !isLocation &&
                    t(
                      "verification.steps.instagram.generic",
                      "Scrie-ne de pe contul tău oficial de Instagram pentru a confirma că acest cont îți aparține."
                    )}
                </p>
                <div className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-100">
                  <span className="text-sm">📩</span>
                  <span className="font-mono">{instagramHandle}</span>
                </div>
                <p className="mt-1.5 text-[0.7rem] text-zinc-400">
                  {t(
                    "verification.steps.instagram.text_format",
                    "Te rugăm să incluzi în mesaj: „Verificare cont BookMix – {{displayName}}” și link-ul către profilul tău din platformă.",
                    { displayName }
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Pas 2 */}
          <div className="rounded-lg border border-white/12 bg-zinc-900 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg font-semibold">②</div>
              <div>
                <p className="font-medium mb-1">
                  {t(
                    "verification.steps.selfie.title",
                    "Trimite un selfie sau un video foarte scurt"
                  )}
                </p>
                <p className="text-zinc-200">
                  {t(
                    "verification.steps.selfie.body",
                    "În același DM de Instagram, poți atașa un selfie sau un video de câteva secunde. Nu folosim aceste materiale în mod public – ne ajută doar să confirmăm că în spatele contului este o persoană reală, nu un profil fals."
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Pas 3 */}
          <div className="rounded-lg border border-white/12 bg-zinc-900 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg font-semibold">③</div>
              <div>
                <p className="font-medium mb-1">
                  {t("verification.steps.phone.title", "Confirmarea numărului de telefon")}
                </p>
                <p className="text-zinc-200">
                  {t(
                    "verification.steps.phone.body",
                    "În anumite situații, îți putem cere și o confirmare rapidă a numărului de telefon, pentru a ne asigura că putem contacta ușor conturile verificate în caz de probleme."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ce NU cerem */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-2">
          {t("verification.we_do_not.title", "Ce NU îți cerem")}
        </h3>
        <ul className="list-disc pl-5 text-xs sm:text-sm text-zinc-200 space-y-1.5">
          <li>
            {t(
              "verification.we_do_not.id_copy",
              "Nu îți cerem să încarci poza cărții de identitate direct în platformă."
            )}
          </li>
          <li>
            {t(
              "verification.we_do_not.sensitive",
              "Nu colectăm date sensibile inutile (CNP, serie și număr, adresă completă), decât dacă va exista un motiv legal foarte clar și ți-l explicăm explicit."
            )}
          </li>
          <li>
            {t(
              "verification.we_do_not.public_use",
              "Nu folosim niciodată materialele trimise în scop publicitar. Ele sunt folosite exclusiv pentru verificare internă."
            )}
          </li>
        </ul>
      </section>

      {/* Footer / acțiune */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
        <p className="text-[0.7rem] sm:text-xs text-zinc-400 max-w-md">
          {t(
            "verification.footer.disclaimer",
            "Trimiterea cererii de verificare nu garantează aprobarea. Ne rezervăm dreptul de a refuza sau retrage badge-ul de „verificat” în caz de abuz sau informații false."
          )}
        </p>

        <div className="flex gap-2 justify-end">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs sm:text-sm rounded-full border border-zinc-600 text-zinc-200 hover:bg-zinc-800 transition"
            >
              {t("verification.actions.close", "Înapoi la profil")}
            </button>
          )}

          {showRequestButton && (
            <button
              type="button"
              onClick={onMarkRequested}
              className="
                px-4 py-1.5 text-xs sm:text-sm rounded-full
                bg-emerald-600 hover:bg-emerald-500
                text-white font-semibold
                shadow-[0_0_0_1px_rgba(16,185,129,0.4)]
                transition
              "
            >
              {t("verification.actions.request", "Am trimis mesajul pe Instagram")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
