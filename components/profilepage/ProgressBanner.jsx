// components/profilepage/ProgressBanner.jsx
export default function ProgressBanner({ isTypeChosen, percent, missing }) {
  const ok = percent >= 100;
  return (
    <div
      className={`mb-4 text-sm font-medium rounded px-4 py-2 ${
        !isTypeChosen
          ? "bg-amber-100 text-amber-800"
          : ok
          ? "bg-green-100 text-green-800"
          : "bg-yellow-100 text-yellow-800"
      }`}
    >
      {!isTypeChosen ? (
        "⚠️ Selectează tipul de cont (Artist sau Locație). Până atunci poți edita câmpurile generale."
      ) : ok ? (
        "✅ Profil complet!"
      ) : (
        <>
          ⚠️ Progres: {percent}% — mai completează{" "}
          <span className="font-semibold">{(missing || []).join(", ")}</span>.
        </>
      )}
    </div>
  );
}
