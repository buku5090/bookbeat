// components/ProfilePhotoWithAvatar.jsx
import React, { useRef, useState, useMemo } from "react";
import { Pencil } from "lucide-react";
import AvatarCropModal from "./AvatarCropModal";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../src/firebase";
import { useTranslation } from "react-i18next";

export default function ProfileAvatarWithProgress({
  imageSrc,
  // acceptă fie number 0..100, fie { percent, missing }
  progress = 0,
  size = 160,
  strokeWidth = 8,
  avatarPadding = 6,
  handleAvatarChange,
  canEdit = false,
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef();
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const percent = useMemo(() => {
    const p =
      typeof progress === "number"
        ? progress
        : typeof progress === "object" && progress
        ? progress.percent ?? 0
        : 0;
    return Math.max(0, Math.min(100, Number(p) || 0));
  }, [progress]);

  const strokeColor = percent < 33 ? "#ef4444" : percent < 66 ? "#f59e0b" : "#22c55e";
  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = ((100 - percent) / 100) * circumference;
  const innerSize = size - strokeWidth * 2;
  const imageSize = innerSize - avatarPadding * 2;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isGif = file.type === "image/gif";
      if (isGif) {
        const filename = `avatars/${Date.now()}.gif`;
        const imageRef = ref(storage, filename);
        await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(imageRef);
        handleAvatarChange?.(downloadURL);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImage(reader.result);
          setCropModalOpen(true);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
    } finally {
      e.target.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob) => {
    try {
      const filename = `avatars/${Date.now()}.jpg`;
      const imageRef = ref(storage, filename);
      await uploadBytes(imageRef, croppedBlob);
      const downloadURL = await getDownloadURL(imageRef);
      handleAvatarChange?.(downloadURL);
    } catch (err) {
      console.error("Avatar crop upload error:", err);
    } finally {
      setCropModalOpen(false);
      setSelectedImage(null);
    }
  };

  return (
    <>
      <div className="relative" style={{ width: size, height: size }}>
        {canEdit && (
          <svg
            width={size}
            height={size}
            className="absolute inset-0 z-0"
            style={{ transform: "rotate(-90deg)" }}
            aria-hidden="true"
          >
            <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#eee" strokeWidth={strokeWidth} />
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
            alt={t("avatar.alt")}
            className="rounded-full object-cover w-full h-full block"
            style={{ width: imageSize, height: imageSize }}
            draggable={false}
          />
        </div>

        {/* Buton editare */}
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 z-1000 right-0 !py-2 !px-4 border !border-white rounded !bg-black !text-white hover:!text-gray-200 hover:!bg-gray-800 transition"
              aria-label={t("avatar.change")}
              title={t("avatar.change")}
            >
              <Pencil size={14} />
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
          onCancel={() => {
            setCropModalOpen(false);
            setSelectedImage(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
}
