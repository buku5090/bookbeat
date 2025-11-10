// components/Dialog.jsx
// PENTRU AVATAR! NU ARE ALT SCOP
import { useTranslation } from "react-i18next";

export default function Dialog({ open, onClose, onConfirm }) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-lg font-semibold">{t("dialog.confirm_title")}</h2>
        <p className="text-sm text-gray-600 mt-2">
          {t("dialog.confirm_text")}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-100"
          >
            {t("dialog.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded bg-black text-white hover:bg-gray-900"
          >
            {t("dialog.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
