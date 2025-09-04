import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import AvatarCropModal from "./AvatarCropModal";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../src/firebase";

export default function ProfileAvatarWithProgress({
  imageSrc,
  progress = 0,
  size = 128,
  strokeWidth = 8,
  avatarPadding = 6,
  handleAvatarChange,
  canEdit = false,
}) {
  const fileInputRef = useRef();
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isGif = file.type === "image/gif";
    if (isGif) {
      const filename = `avatars/${Date.now()}.gif`;
      const imageRef = ref(storage, filename);
      uploadBytes(imageRef, file).then(async () => {
        const downloadURL = await getDownloadURL(imageRef);
        handleAvatarChange(downloadURL);
      });
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedBlob) => {
    const filename = `avatars/${Date.now()}.jpg`;
    const imageRef = ref(storage, filename);
    await uploadBytes(imageRef, croppedBlob);
    const downloadURL = await getDownloadURL(imageRef);
    handleAvatarChange(downloadURL);
    setCropModalOpen(false);
  };

  const p = Math.max(0, Math.min(100, progress));
  const strokeColor = p < 33 ? "#ef4444" : p < 66 ? "#f59e0b" : "#22c55e";
  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = ((100 - p) / 100) * circumference;
  const innerSize = size - strokeWidth * 2;
  const imageSize = innerSize - avatarPadding * 2;

  return (
    <>
      <div className="relative mb-4" style={{ width: size, height: size }}>
        {canEdit && (
          <svg
            width={size}
            height={size}
            className="absolute inset-0 z-0"
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#eee"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: "stroke 200ms, stroke-dashoffset 200ms" }}
            />
          </svg>
        )}

        {/* Imaginea avatar */}
        <div
          className="absolute rounded-full bg-white z-10"
          style={{
            width: innerSize,
            height: innerSize,
            left: strokeWidth,
            top: strokeWidth,
            padding: avatarPadding,
            boxSizing: "border-box",
          }}
        >
          <img
            src={imageSrc}
            alt="avatar"
            className="rounded-full object-cover w-full h-full block"
            style={{ width: imageSize, height: imageSize }}
          />
        </div>

        {/* Buton editare */}
        {canEdit && (
          <>
            <button
              onClick={() => fileInputRef.current.click()}
              className="w-10 h-10 absolute bottom-0 right-0 z-10 !bg-white !rounded-full border border-gray-300 grid place-items-center !p-0"
            >
              <Pencil size={14} className="text-gray-400 align-center" />
            </button>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </>
        )}
      </div>

      {cropModalOpen && selectedImage && (
        <AvatarCropModal
          image={selectedImage}
          onCancel={() => setCropModalOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
}
