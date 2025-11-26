/* eslint-disable react-hooks/exhaustive-deps */
// components/profilepage/AvailabilityCalendar.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ro } from "date-fns/locale";
import {
  eachDayOfInterval,
  startOfDay,
  isBefore,
  format,
  isSameDay,
} from "date-fns";

import { Button } from "../uiux/button";
import { Label } from "../uiux/label";
import { Input } from "../uiux/input";
import { useGlobalDialog } from "../../context/GlobalDialogContext";
import { useTranslation } from "react-i18next";
import { useToast } from "../utilities/ToastProvider"; // 👈 toast hook

// ✅ respectă regula ta de import Firebase
import { db } from "../../src/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

export default function AvailabilityCalendar({
  userId,
  currentUser,
  type,
  editable = false,
}) {
  const { t } = useTranslation();
  const { openDialog } = useGlobalDialog();
  const { showToast } = useToast(); // 👈

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [displayMonth, setDisplayMonth] = useState(startOfDay(new Date()));
  const [range, setRange] = useState({ from: undefined, to: undefined });
  const [selectedDay, setSelectedDay] = useState(null);

  // inline edit ONLY title
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const keyOf = useCallback(
    (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
    []
  );

  const fetchAvailability = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "availability"),
        where("userId", "==", userId),
        orderBy("from", "asc")
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setItems(rows);
    } catch (e) {
      console.error("Availability fetch error:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const toDateSafe = (ts) => {
    if (!ts) return null;
    if (ts instanceof Date) return ts;
    if (typeof ts?.toDate === "function") return ts.toDate();
    return new Date(ts);
  };

  const expandedDays = useMemo(() => {
    const available = new Set();
    const busy = new Set();
    const meta = new Map();

    for (const it of items) {
      const f = toDateSafe(it.from);
      const tt = toDateSafe(it.to);
      if (!f || !tt) continue;

      const days = eachDayOfInterval({
        start: startOfDay(f),
        end: startOfDay(tt),
      });

      for (const d of days) {
        const k = keyOf(d);
        busy.add(k);

        const label =
          it.title ||
          (it.status === "busy"
            ? t("availability.busy")
            : t("availability.free"));
        const prev = meta.get(k) || [];
        meta.set(k, [...prev, label]);
      }
    }

    return { available, busy, meta };
  }, [items, keyOf, t]);

  const isBusy = useCallback(
    (d) => expandedDays.busy.has(keyOf(d)),
    [expandedDays.busy, keyOf]
  );

  const disabledDay = useCallback(
    (date) => isBefore(date, todayStart),
    [todayStart]
  );

  const resetSelection = useCallback(() => {
    setRange({ from: undefined, to: undefined });
  }, []);

  const handleRangeSelect = useCallback(
    (next) => {
      if (!next?.from) {
        setRange({ from: undefined, to: undefined });
        return;
      }
      if (!next.to) {
        setRange({ from: next.from, to: undefined });
        return;
      }

      if (isBefore(next.from, todayStart)) {
        setRange({ from: todayStart, to: next.to });
        return;
      }

      setRange(next);
    },
    [todayStart]
  );

  const handleCreate = useCallback(
    async ({ range: customRange, closeDialog } = {}) => {
      if (!editable) return;
      const ownerId = userId || currentUser?.uid;
      const selectedRange = customRange ?? range;

      if (!ownerId || !selectedRange?.from || !selectedRange?.to) {
        console.error("Missing data for availability create", {
          ownerId,
          selectedRange,
        });
        return;
      }

      try {
        await addDoc(collection(db, "availability"), {
          userId: ownerId,
          from: selectedRange.from,
          to: selectedRange.to,
          title: "",
          notes: "",
          status: "available",
          eventId: null,
          createdAt: serverTimestamp(),
        });

        resetSelection();
        fetchAvailability();
        closeDialog?.();

        // toast succes
        showToast(
          t("availability.toast_created") || "Blocarea a fost salvată.",
          { variant: "success" }
        );
      } catch (e) {
        console.error("Availability create error:", e);
        showToast(
          t("availability.toast_created_error") ||
            "Nu am putut salva blocarea. Încearcă din nou.",
          { variant: "error" }
        );
      }
    },
    [
      editable,
      range,
      userId,
      currentUser?.uid,
      resetSelection,
      fetchAvailability,
      showToast,
      t,
    ]
  );

  const handleDeleteItem = useCallback(
    async (id) => {
      if (!editable || !id) return;
      try {
        await deleteDoc(doc(db, "availability", id));
        fetchAvailability();
        showToast(
          t("availability.toast_deleted") ||
            "Blocarea a fost ștearsă din calendar.",
          { variant: "success" }
        );
      } catch (e) {
        console.error("Availability delete error:", e);
        showToast(
          t("availability.toast_deleted_error") ||
            "Nu am putut șterge blocarea.",
          { variant: "error" }
        );
      }
    },
    [editable, fetchAvailability, showToast, t]
  );

  // Inline edit title helpers
  const startEditTitle = useCallback((it) => {
    setEditingId(it.id);
    setEditTitle(it.title || "");
  }, []);

  const cancelEditTitle = useCallback(() => {
    setEditingId(null);
    setEditTitle("");
    setEditSaving(false);
  }, []);

  const saveEditTitle = useCallback(
    async (it) => {
      if (!editable || !it?.id) return;

      setEditSaving(true);
      try {
        await updateDoc(doc(db, "availability", it.id), {
          title: editTitle.trim(),
          updatedAt: serverTimestamp(),
        });
        await fetchAvailability();
        cancelEditTitle();

        showToast(
          t("availability.toast_updated") ||
            "Titlul blocării a fost modificat.",
          { variant: "success" }
        );
      } catch (e) {
        console.error("Availability title update error:", e);
        setEditSaving(false);
        showToast(
          t("availability.toast_updated_error") ||
            "Nu am putut modifica titlul. Încearcă din nou.",
          { variant: "error" }
        );
      }
    },
    [editable, editTitle, fetchAvailability, cancelEditTitle, showToast, t]
  );

  const dayContent = useCallback(
    (date) => {
      const k = keyOf(date);
      const labels = expandedDays.meta.get(k);
      if (!labels?.length) return null;

      return (
        <div className="text-[10px] mt-1 text-white/70 leading-tight">
          {labels.slice(0, 2).map((l, i) => (
            <div key={i} className="truncate max-w-[68px]">
              {l}
            </div>
          ))}
          {labels.length > 2 && <div>+{labels.length - 2}</div>}
        </div>
      );
    },
    [expandedDays.meta, keyOf]
  );

  const safeMonth =
    displayMonth instanceof Date && !Number.isNaN(displayMonth.getTime())
      ? displayMonth
      : todayStart;

  // -----------------------------
  // Dialog ADD (fără input)
  // -----------------------------
  const AddAvailabilityContent = ({
    closeDialog,
    busyDates = [],
    todayStart: todayStartProp,
    onCreate,
    editable: editableProp,
  }) => {
    const [dialogMonth, setDialogMonth] = useState(todayStartProp);
    const [rangeLocal, setRangeLocal] = useState({
      from: undefined,
      to: undefined,
    });

    const keyOfLocal = useCallback(
      (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      []
    );

    const busySet = useMemo(() => {
      const mapped = (busyDates || []).map((d) => {
        const val = toDateSafe(d);
        return val ? keyOfLocal(val) : null;
      });
      return new Set(mapped.filter((v) => typeof v === "number"));
    }, [busyDates, keyOfLocal]);

    const isFree = useCallback(
      (date) => date >= todayStartProp && !busySet.has(keyOfLocal(date)),
      [busySet, keyOfLocal, todayStartProp]
    );

    const handleRangeSelectLocal = useCallback(
      (next) => {
        if (!next?.from)
          return setRangeLocal({ from: undefined, to: undefined });
        if (!next.to) return setRangeLocal({ from: next.from, to: undefined });

        let ok = true;
        for (const d of eachDayOfInterval({ start: next.from, end: next.to })) {
          if (!isFree(d)) {
            ok = false;
            break;
          }
        }

        if (ok) return setRangeLocal(next);

        let lastFree = next.from;
        for (const d of eachDayOfInterval({ start: next.from, end: next.to })) {
          if (!isFree(d)) break;
          lastFree = d;
        }
        setRangeLocal({ from: next.from, to: lastFree });
      },
      [isFree]
    );

    const handleSaveLocal = useCallback(async () => {
      await onCreate?.({
        range: rangeLocal,
        closeDialog,
      });
    }, [onCreate, rangeLocal, closeDialog]);

    return (
      <div
        className="
          w-full h-full min-h-0
          overflow-y-auto overscroll-contain
          px-2 sm:px-3
          text-white bg-black
        "
        style={{ WebkitOverflowScrolling: "touch" }}
        data-allow-scroll="true"
      >
        <div
          className="block h-full w-full sm:gap-6 pr-1"
          data-allow-scroll="true"
        >
          <div className="flex flex-col justify-between items-center h-full w-full">
            <div className="rounded-2xl border border-neutral-800 bg-black p-3 sm:p-4 flex flex-col items-center gap-2 relative">
              <style>{dayPickerOverrideCss}</style>
              <div className="w-full max-w-[340px] sm:max-w-[520px] mx-auto flex justify-start flex-col">
                <DayPicker
                  locale={ro}
                  mode="range"
                  weekStartsOn={1}
                  showOutsideDays
                  fixedWeeks
                  defaultMonth={todayStartProp}
                  fromMonth={todayStartProp}
                  month={dialogMonth}
                  onMonthChange={(m) => setDialogMonth(m || todayStartProp)}
                  disabled={(date) =>
                    date < todayStartProp || busySet.has(keyOfLocal(date))
                  }
                  selected={rangeLocal}
                  onSelect={handleRangeSelectLocal}
                  className="!bg-black !text-white !p-0 !m-0 w-full"
                  modifiers={{
                    busy: (d) => busySet.has(keyOfLocal(d)),
                    free: (d) => isFree(d),
                  }}
                  modifiersClassNames={{
                    busy: "rdp-busy",
                    free: "rdp-available",
                    selected: "rdp-selected-custom",
                  }}
                />
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 w-full">
              <div
                className="
                  sticky bottom-0 left-0 right-0
                  bg-black/90 backdrop-blur
                  pt-3 pb-4 flex justify-end gap-2
                "
              >
                <Button
                  variant="outline"
                  className="!border-neutral-500 !text-white hover:!bg-white/10"
                  onClick={() => closeDialog?.()}
                >
                  {t("availability.cancel")}
                </Button>
                <Button
                  onClick={handleSaveLocal}
                  className="!bg-gradient-to-r !from-purple-500 !to-pink-500 !text-white hover:!opacity-90"
                  disabled={
                    !editableProp ||
                    !rangeLocal?.from ||
                    !rangeLocal?.to ||
                    rangeLocal.from < todayStartProp
                  }
                >
                  {t("availability.save")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const busyDatesArray = useMemo(
    () => Array.from(expandedDays.busy).map((ts) => new Date(ts)),
    [expandedDays.busy]
  );

  const dayPickerOverrideCss = `
  .rdp { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; margin: 0 auto !important; --rdp-cell-size: 40px; }
  .rdp-month, .rdp-table { width: 100% !important; max-width: 100% !important; }
  .rdp-head_cell, .rdp-day { padding: 0 !important; }
  @media (max-width: 380px) { .rdp { --rdp-cell-size: 34px; } }
  .rdp-range_start, .rdp-range_middle, .rdp-range_end { background: transparent !important; box-shadow: none !important; }
  .rdp-day_button { background: transparent !important; border: none !important; outline: none !important; box-shadow: none !important; }
  .rdp-day:not(.rdp-day_selected):not(.rdp-disabled) .rdp-day_button:hover { background: rgba(255,255,255,0.06) !important; }
  .rdp-day.rdp-available .rdp-day_button { color: #22c55e !important; font-weight: 700 !important; text-shadow: 0 0 8px rgba(34,197,94,0.45) !important; }
  .rdp-day.rdp-busy .rdp-day_button { color: #ef4444 !important; font-weight: 700 !important; text-shadow: 0 0 8px rgba(239,68,68,0.5) !important; }
  .rdp-day_range_middle .rdp-day_button { background: rgba(34,197,94,0.15) !important; color: #22c55e !important; box-shadow: inset 0 0 0 1px rgba(34,197,94,0.25) !important; }
  .rdp-range_start, .rdp-range_middle, .rdp-range_end { background-color: #E50914 !important; }
  .rdp-day_range_start .rdp-day_button, .rdp-day_range_end .rdp-day_button { background: rgba(168,85,247,0.2) !important; color: #ffffff !important; box-shadow: 0 0 0 1px rgba(168,85,247,0.45) !important; }
  .rdp-day_selected .rdp-day_button, .rdp-day.rdp-selected-custom .rdp-day_button { background: transparent !important; color: inherit !important; box-shadow: none !important; }
  .rdp-day_button:active, .rdp-day_button:focus, .rdp-day_button:focus-visible { background: transparent !important; outline: none !important; box-shadow: none !important; }
  .rdp-chevron { fill: #ffffff !important; }
  .rdp-nav_button, .rdp-button[aria-label*="month"] { color: #ffffff !important; border: 1px solid rgba(255,255,255,0.4) !important; background: transparent !important; }
  .rdp-nav_button svg, .rdp-button[aria-label*="month"] svg { fill: currentColor !important; }
  .rdp-nav_button:disabled, .rdp-button[aria-label*="month"]:disabled { color: #6b7280 !important; border: 1px solid #4b5563 !important; opacity: 0.65 !important; }
  .rdp-nav_button:disabled svg, .rdp-button[aria-label*="month"]:disabled svg { fill: currentColor !important; }
`;

  const openAddDialog = () => {
    const isMobile =
      typeof window !== "undefined" && window.innerWidth < 640;

    openDialog({
      title: t("availability.title"),
      fullscreen: isMobile,
      widthClass: isMobile ? "w-full" : "w-full max-w-sm sm:max-w-4xl",
      heightClass: isMobile ? "h-[100dvh]" : "max-h-[90vh]",
      bgClass: "bg-neutral-950",
      content: ({ closeDialog }) => (
        <AddAvailabilityContent
          closeDialog={closeDialog}
          busyDates={busyDatesArray}
          todayStart={todayStart}
          onCreate={handleCreate}
          editable={editable}
        />
      ),
    });
  };

  const handleDaySelect = useCallback(
    (day) => {
      if (!day || disabledDay(day)) {
        setSelectedDay(null);
        return;
      }
      const normalized = startOfDay(day);
      if (selectedDay && isSameDay(selectedDay, normalized)) {
        setSelectedDay(null);
      } else {
        setSelectedDay(normalized);
      }
    },
    [disabledDay, selectedDay]
  );

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return [];
    const key = keyOf(selectedDay);
    return items.filter((it) => {
      const f = startOfDay(toDateSafe(it.from) || new Date(0));
      const tt = startOfDay(toDateSafe(it.to) || new Date(0));
      const interval = eachDayOfInterval({ start: f, end: tt });
      return interval.some((d) => keyOf(d) === key);
    });
  }, [items, keyOf, selectedDay]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-white/60">
          {loading
            ? t("common.loading")
            : `${items.length} ${t("availability.intervals")}`}
        </div>

        {editable && currentUser?.uid === userId && (
          <Button variant="primary" onClick={openAddDialog}>
            {t("availability.add_btn")}
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-black p-3 !overflow-visible flex justify-center">
        <style>{dayPickerOverrideCss}</style>
        <DayPicker
          locale={ro}
          mode="single"
          weekStartsOn={1}
          showOutsideDays
          fixedWeeks
          defaultMonth={todayStart}
          fromMonth={todayStart}
          month={safeMonth}
          onMonthChange={(m) => setDisplayMonth(m || todayStart)}
          disabled={disabledDay}
          selected={selectedDay}
          onSelect={handleDaySelect}
          modifiers={{
            busy: (d) => isBusy(d),
            available: (d) => !disabledDay(d) && !isBusy(d),
          }}
          modifiersClassNames={{
            busy: "rdp-busy",
            available: "rdp-available",
            selected: "rdp-selected-custom",
          }}
          className="!bg-black !text-white !p-0 !m-0"
          components={{
            DayContent: ({ date }) => (
              <div className="flex flex-col items-center">
                <div>{date.getDate()}</div>
                {dayContent(date)}
              </div>
            ),
          }}
        />
      </div>

      {selectedDay && (
        <div className="mt-4 space-y-2">
          <div className="text-sm font-semibold text-white">
            {format(selectedDay, "dd MMM yyyy")}
          </div>

          {selectedDayItems.length === 0 && (
            <div className="text-xs text-white/60">
              {t("availability.no_events")}
            </div>
          )}

          {selectedDayItems.map((it) => {
            const f = toDateSafe(it.from);
            const tt = toDateSafe(it.to);
            const isEditing = editingId === it.id;

            return (
              <div
                key={it.id}
                className="rounded-xl border border-white/10 bg-black px-3 py-2 space-y-2"
              >
                {!isEditing ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <div className="text-sm font-semibold text-white">
                        {it.title || t("availability.default_title")}
                      </div>
                      <div className="text-xs text-white/60">
                        {f ? format(f, "dd MMM yyyy") : "—"} →{" "}
                        {tt ? format(tt, "dd MMM yyyy") : "—"}
                      </div>
                    </div>

                    {editable && currentUser?.uid === userId && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditTitle(it)}
                        >
                          {t("common.edit") || "Editează"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteItem(it.id)}
                        >
                          {t("common.delete")}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-1.5">
                      <Label className="text-xs font-semibold text-white">
                        {t("availability.title_label")}
                      </Label>
                      <Input
                        maxLength={50}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder={t("availability.placeholder_title")}
                        className="bg-white border border-neutral-300 text-black placeholder:text-neutral-500 focus:ring-2 focus:ring-violet-500 h-10 text-base sm:text-sm !text-[16px] !leading-5"
                      />
                      <div className="flex justify-end text-[11px] text-white/70">
                        {(editTitle || "").length}/50
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditTitle}
                        disabled={editSaving}
                      >
                        {t("common.cancel") || "Anulează"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEditTitle(it)}
                        disabled={editSaving}
                      >
                        {editSaving
                          ? t("common.saving") || "Salvez..."
                          : t("common.save") || "Salvează"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
