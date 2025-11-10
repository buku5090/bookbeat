import React, { useMemo, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../uiux/dialog";
import { Label } from "../uiux/label";
import { Input } from "../uiux/input";
import { Textarea } from "../uiux/textarea";
import { Button } from "../uiux/button";
import { DayPicker } from "react-day-picker";
import { ro } from "date-fns/locale";
import { eachDayOfInterval } from "date-fns";
import { useTranslation } from "react-i18next";

export default function AddAvailabilityDialog({
  open,
  setOpen,
  form,
  setForm,
  range,
  setRange,
  todayStart,
  handleCreate,
  isOwner,
  busyDates = [],
  displayMonth,
  onMonthChange,
  onDayClick,
}) {
  const { t } = useTranslation();
  const noop = () => {};

  const resetSelection = useCallback(() => setRange?.(undefined), [setRange]);
  const resetFormLight = useCallback(() => {
    setForm?.((s) => ({ ...s, title: "", notes: "" }));
  }, [setForm]);

  const handleClose = useCallback(() => {
    resetSelection();
    resetFormLight();
    setOpen?.(false);
  }, [resetSelection, resetFormLight, setOpen]);

  const handleSave = useCallback(async () => {
    await Promise.resolve(handleCreate?.());
    handleClose();
  }, [handleCreate, handleClose]);

  const keyOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const busySet = useMemo(() => new Set((busyDates || []).map(keyOf)), [busyDates]);
  const isFree = (date) => date >= todayStart && !busySet.has(keyOf(date));

  const handleRangeSelect = (next) => {
    if (!next?.from) return setRange({ from: undefined, to: undefined });
    if (!next.to) return setRange({ from: next.from, to: undefined });

    let ok = true;
    for (const d of eachDayOfInterval({ start: next.from, end: next.to })) {
      if (!isFree(d)) {
        ok = false;
        break;
      }
    }
    if (ok) return setRange(next);

    let lastFree = next.from;
    for (const d of eachDayOfInterval({ start: next.from, end: next.to })) {
      if (!isFree(d)) break;
      lastFree = d;
    }
    setRange({ from: next.from, to: lastFree });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resetSelection();
          resetFormLight();
        }
        setOpen(next);
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("availability.title")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Calendar */}
          <div className="rounded-xl border p-3">
            <DayPicker
              locale={ro}
              mode="range"
              weekStartsOn={1}
              showOutsideDays
              fixedWeeks
              startMonth={todayStart}
              month={displayMonth}
              onMonthChange={onMonthChange || noop}
              disabled={(date) => date < todayStart || busySet.has(keyOf(date))}
              selected={range}
              onSelect={handleRangeSelect}
              onDayClick={onDayClick || noop}
              modifiers={{
                busy: (d) => busySet.has(keyOf(d)),
                free: (d) => isFree(d),
              }}
              className="!bg-white !text-neutral-900 !p-0 !m-0"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t("availability.note_end")}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="title">{t("availability.title_label")}</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                placeholder={t("availability.placeholder_title")}
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="notes">{t("availability.notes_label")}</Label>
              <Textarea
                id="notes"
                rows={8}
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                placeholder={t("availability.placeholder_notes")}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("availability.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isOwner || !range?.from || !range?.to || range.from < todayStart}
          >
            {t("availability.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
