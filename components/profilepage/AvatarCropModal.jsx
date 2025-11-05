// components/AvatarCropModal.jsx
// PENTRU AVATAR! NU ARE ALT SCOP!
import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "./cropImageHelper";

export default function AvatarCropModal({ image, onCancel, onCropComplete }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropAreaComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleDone = async () => {
    const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
    onCropComplete(croppedBlob);
  };

  const handleZoom = (direction) => {
    setZoom((z) => Math.min(3, Math.max(1, z + direction * 0.2)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
      <div className="bg-white rounded-xl overflow-hidden shadow-xl max-w-lg w-full">
        <div className="relative w-full h-[400px] bg-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropAreaComplete}
          />
        </div>

        <div className="!flex !items-center !justify-center gap-4 py-4">
          <button
            onClick={() => handleZoom(-1)}
            className="!w-10 !h-10 !bg-gray-100 hover:!bg-gray-200 !rounded-full !text-xl !font-bold"
          >
            −
          </button>
          <span className="text-sm text-gray-600">Zoom: {zoom.toFixed(1)}x</span>
          <button
            onClick={() => handleZoom(1)}
            className="w-10 h-10 !bg-gray-100 hover:bg-gray-200 rounded-full text-xl font-bold"
          >
            +
          </button>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-100"
          >
            Anulează
          </button>
          <button
            onClick={handleDone}
            className="px-4 py-2 text-sm rounded bg-black text-white hover:bg-gray-900"
          >
            Salvează
          </button>
        </div>
      </div>
    </div>
  );
}

