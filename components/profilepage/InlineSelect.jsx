// components/profilepage/InlineSelect.jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function InlineSelect({
  value,
  onChange,
  options = [],
  placeholder, // fallback to t('common.select') if not provided
}) {
  const { t } = useTranslation();
  const ph = placeholder ?? t("common.select");

  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);

  return (
    <select
      value={v}
      onChange={(e) => {
        setV(e.target.value);
        onChange?.(e.target.value);
      }}
      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
      aria-label={ph}
    >
      <option value="">{ph}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
