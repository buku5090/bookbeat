// components/KYCDialog.jsx
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button } from "./uiux";
import { db, storage } from "../src/firebase";

export default function KYCDialog({ open, onOpenChange, authUser, userData, setUserData }) {
  const [kycFront, setKycFront] = useState(null);
  const [kycBack, setKycBack] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState("");

  const verificationStatus = userData?.verificationStatus || "unverified";

  return (
    <Dialog open={open} onOpenChange={(o) => !kycLoading && onOpenChange(o)}>
      <DialogContent
        className="sm:max-w-lg !bg-white !text-black !p-6 !rounded-2xl !shadow-2xl !border !border-violet-200"
        onInteractOutside={(e) => kycLoading && e.preventDefault()}
        onEscapeKeyDown={(e) => kycLoading && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="!text-2xl !font-extrabold !tracking-tight">
            Verificare identitate
          </DialogTitle>
          <DialogDescription className="!mt-1 !text-base !text-gray-600">
            Încarcă fața și verso-ul buletinului. Datele sunt folosite doar pentru verificare.
          </DialogDescription>
        </DialogHeader>

        {kycError && (
          <p className="mt-3 text-sm !text-red-600 !font-medium !bg-red-50 !border !border-red-200 !rounded-lg !px-3 !py-2">
            {kycError}
          </p>
        )}

        <div className="mt-4 space-y-4">
          {/* Față */}
          <div>
            <label className="text-sm font-semibold !text-gray-900 uppercase tracking-wide">
              Buletin – Față
            </label>

            <label
              className="mt-2 block w-full cursor-pointer rounded-xl border-2 border-dashed !border-violet-300 bg-violet-50/40 hover:bg-violet-50 transition p-4"
              title="Click pentru a selecta imaginea (față)"
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setKycFront(e.target.files?.[0] || null)}
                disabled={kycLoading}
              />
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-white border !border-violet-200 grid place-items-center">
                  <span className="text-violet-600 text-xs font-bold">FAȚĂ</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {kycFront?.name || "Alege fișierul..."}
                  </p>
                  <p className="text-xs text-gray-500">JPG, PNG sau HEIC • max 10MB</p>
                </div>
              </div>
            </label>

            {kycFront && (
              <div className="mt-2">
                <img
                  src={URL.createObjectURL(kycFront)}
                  alt="Preview față"
                  className="w-full max-h-40 object-contain rounded-lg border !border-gray-200 bg-gray-50"
                />
              </div>
            )}
          </div>

          {/* Verso */}
          <div>
            <label className="text-sm font-semibold !text-gray-900 uppercase tracking-wide">
              Buletin – Verso
            </label>

            <label
              className="mt-2 block w-full cursor-pointer rounded-xl border-2 border-dashed !border-violet-300 bg-violet-50/40 hover:bg-violet-50 transition p-4"
              title="Click pentru a selecta imaginea (verso)"
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setKycBack(e.target.files?.[0] || null)}
                disabled={kycLoading}
              />
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-white border !border-violet-200 grid place-items-center">
                  <span className="text-violet-600 text-xs font-bold">VERSO</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {kycBack?.name || "Alege fișierul..."}
                  </p>
                  <p className="text-xs text-gray-500">JPG, PNG sau HEIC • max 10MB</p>
                </div>
              </div>
            </label>

            {kycBack && (
              <div className="mt-2">
                <img
                  src={URL.createObjectURL(kycBack)}
                  alt="Preview verso"
                  className="w-full max-h-40 object-contain rounded-lg border !border-gray-200 bg-gray-50"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-gray-500">* Asigură-te că datele sunt clare și complet vizibile.</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={kycLoading}
              className="!border !border-gray-300 !text-gray-800 hover:!bg-gray-100"
            >
              Renunță
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!authUser) return;
                if (!kycFront || !kycBack) {
                  setKycError("Te rog încarcă ambele imagini (față și verso).");
                  return;
                }
                setKycLoading(true);
                setKycError("");
                try {
                  const up = async (file, name) => {
                    const path = `users/${authUser.uid}/kyc/${name}`;
                    const ref = storageRef(storage, path);
                    await uploadBytes(ref, file);
                    return await getDownloadURL(ref);
                  };
                  const frontURL = await up(kycFront, "front.jpg");
                  const backURL = await up(kycBack, "back.jpg");

                  const userRef = doc(db, "users", authUser.uid);
                  await updateDoc(userRef, {
                    verificationStatus: "pending",
                    kyc: {
                      frontURL,
                      backURL,
                      submittedAt: new Date().toISOString(),
                    },
                  });
                  setUserData?.((p) => ({
                    ...p,
                    verificationStatus: "pending",
                    kyc: { frontURL, backURL, submittedAt: new Date().toISOString() },
                  }));
                  onOpenChange(false);
                } catch (e) {
                  console.error(e);
                  setKycError("A apărut o eroare la trimitere. Încearcă din nou.");
                } finally {
                  setKycLoading(false);
                }
              }}
              isLoading={kycLoading}
              disabled={kycLoading}
              className="!bg-black !text-white hover:!bg-neutral-900"
            >
              Trimite pentru verificare
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
