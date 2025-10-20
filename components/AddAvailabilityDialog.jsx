import React, { useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "./uiux/dialog";
import { Label } from "./uiux/label";
import { Input } from "./uiux/input";
import { Textarea } from "./uiux/textarea";
import { Button } from "./uiux/button";
import { DayPicker } from "react-day-picker";
import { ro } from "date-fns/locale";
import { eachDayOfInterval } from "date-fns";

/**
 * Props opționale în plus:
 * - busyDates?: Date[]             -> zile ocupate (vin din părinte)
 * - displayMonth?, onMonthChange?  -> control extern al lunii (opțional)
 * - onDayClick?                    -> callback extern (opțional)
 */
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
  const noop = () => {};

  // normalizare la miezul nopții pentru comparații rapide
  const keyOf = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  // set pentru lookup O(1) al zilelor ocupate
  const busySet = useMemo(
    () => new Set((busyDates || []).map(keyOf)),
    [busyDates]
  );

  // zile libere = viitor && nu e busy
  const isFree = (date) => date >= todayStart && !busySet.has(keyOf(date));

  // validare selecție: intervalul nu poate conține zile busy
  const handleRangeSelect = (next) => {
    if (!next?.from) return setRange({ from: undefined, to: undefined });
    if (!next.to) return setRange({ from: next.from, to: undefined });

    // dacă tot intervalul e liber -> acceptă
    let ok = true;
    for (const d of eachDayOfInterval({ start: next.from, end: next.to })) {
      if (!isFree(d)) {
        ok = false;
        break;
      }
    }
    if (ok) return setRange(next);

    // altfel, taie la ultima zi liberă înainte de prima zi ocupată
    let lastFree = next.from;
    for (const d of eachDayOfInterval({ start: next.from, end: next.to })) {
      if (!isFree(d)) break;
      lastFree = d;
    }
    setRange({ from: next.from, to: lastFree });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Adaugă blocare de disponibilitate</DialogTitle>
        </DialogHeader>

        {/* GRID: stânga calendar, dreapta detalii; pe mobil devine o coloană */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* STÂNGA: Calendar */}
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

              // dezactivează trecutul și zilele ocupate
              disabled={(date) =>
                date < todayStart || busySet.has(keyOf(date))
              }

              selected={range}
              onSelect={handleRangeSelect}
              onDayClick={onDayClick || noop}

              // marcaje: ocupat (busy), liber (free)
              modifiers={{
                busy: (d) => busySet.has(keyOf(d)),
                free: (d) => isFree(d),
              }}

              className="!bg-white !text-neutral-900 !p-0 !m-0"
              classNames={{
                // caption & nav
                caption: "relative flex items-center justify-center mb-1",
                caption_label: "text-base font-bold tracking-tight",
                month_caption: "text-center mb-2",
                nav: "flex justify-between",

                // header zile (thead)
                weekdays: "w-full",
                weekday:
                  "text-center py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500",

                // „tabelul” lunii (v9)
                month_grid: "w-full table-fixed",

                // celula & buton zi – fără margini orizontale -> bandă continuă la range
                day: "!text-center !p-0 !m-0",
                day_button:
                  "!m-0 !w-9 !h-9 !p-0 " +
                  "flex items-center justify-center " +
                  "!text-base !font-semibold " +
                  "!bg-transparent !border-0 !appearance-none " +
                  "hover:!bg-transparent focus:!outline-none !transition-none !shadow-none !cursor-pointer " +
                  "!disabled:text-gray-300 !disabled:cursor-default !disabled:hover:!bg-transparent",

                // zile din alte luni invizibile (păstrează 6 rânduri fixe)
                outside: "invisible",

                // de siguranță pentru disabled
                disabled: "!text-gray-300",
                button_next: "!bg-transparent",
                button_previous: "!bg-transparent",
              }}

              // culori: busy/free + range conectat
              modifiersClassNames={{
                busy: "!text-red-500",
                free: "!text-emerald-500",
                selected: "!text-white !bg-indigo-600",
                range_start: "!text-white !bg-indigo-600 rounded-l-full",
                range_end: "!text-white !bg-indigo-600 rounded-r-full",
                range_middle: "!bg-indigo-100 !text-indigo-700",
              }}
            />

            <p className="mt-2 text-xs text-muted-foreground">
              Sfârșitul este exclusiv (se salvează +1 zi automat).
            </p>
          </div>

          {/* DREAPTA: Detalii */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="title">Titlu</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((s) => ({ ...s, title: e.target.value }))
                }
                placeholder="Ex: Eveniment privat"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="notes">Notițe</Label>
              <Textarea
                id="notes"
                rows={8}
                value={form.notes}
                onChange={(e) =>
                  setForm((s) => ({ ...s, notes: e.target.value }))
                }
                placeholder="Detalii (opțional)"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Renunță
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              !isOwner || !range?.from || !range?.to || range.from < todayStart
            }
          >
            Salvează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
