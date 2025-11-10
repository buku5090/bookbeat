// components/DemosUploader.jsx
import { useRef, useState } from "react";
import { storage } from "../../src/firebase";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import Button from "../Button";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function DemosUploader({
  canEdit,
  authUser,
  current = [],
  onAdded,
  onDeleted
}) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const inputRef = useRef(null);

  const list = Array.isArray(current) ? current : [];
  const remaining = Math.max(0, 3 - list.length);

  const openPicker = () =>
    canEdit && remaining > 0 && inputRef.current?.click();

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!authUser || files.length === 0) return;

    const take = files.slice(0, remaining);
    setUploading(true);

    const results = [];
    for (const f of take) {
      if (!f.type.startsWith("audio/")) continue;
      const safeName = f.name.replace(/\s+/g, "-");
      const path = `users/${authUser.uid}/demos/${Date.now()}-${safeName}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, f);
      const url = await getDownloadURL(ref);
      results.push({ id: path, url, title: f.name });
    }

    setUploading(false);
    onAdded?.(results);
    e.target.value = "";
  };

  const deleteOne = async (item) => {
    try {
      setDeleting(item.id || item.url);
      if (item.id) await deleteObject(storageRef(storage, item.id));
      onDeleted?.(item.id || item.url);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="space-y-2">
        {list.map((d) => (
          <div
            key={d.id || d.url}
            className="bg-gray-50 rounded-lg p-3 border flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1 truncate">
                {d.title || d.url}
              </p>
              <audio controls className="w-full">
                <source src={d.url} />
              </audio>
            </div>

            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteOne(d)}
                disabled={deleting === (d.id || d.url)}
                title={t("demos.delete")}
              >
                <Trash2 className="w-5 h-5 text-gray-700" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            multiple
            hidden
            onChange={handleFiles}
          />
          <Button
            onClick={openPicker}
            disabled={uploading || remaining === 0}
            variant="primary"
          >
            {uploading
              ? t("demos.uploading")
              : remaining === 0
              ? t("demos.limit_reached")
              : t("demos.add")}
          </Button>

          <p className="text-xs text-gray-500 mt-1">
            {t("demos.note")}
          </p>
        </div>
      )}
    </div>
  );
}
