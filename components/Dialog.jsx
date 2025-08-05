// components/Dialog.jsx

export default function Dialog({ open, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-lg font-semibold">Confirmă modificarea</h2>
        <p className="text-sm text-gray-600 mt-2">
          Ești sigur că vrei să salvezi această modificare?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-100"
          >
            Anulează
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded bg-black text-white hover:bg-gray-900"
          >
            Salvează
          </button>
        </div>
      </div>
    </div>
  );
}
