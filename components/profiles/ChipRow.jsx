import React from "react";

export function ChipRow({ items = [], className = "" }) {
  const rowRef = React.useRef(null);
  const measureRef = React.useRef(null);
  const [visibleCount, setVisibleCount] = React.useState(items.length);
  const [overflowing, setOverflowing] = React.useState(false);

  const recompute = React.useCallback(() => {
    const row = rowRef.current;
    const meas = measureRef.current;
    if (!row || !meas) return;

    const available = row.clientWidth;
    const chips = Array.from(meas.querySelectorAll('[data-kind="chip"]'));
    const ell = meas.querySelector('[data-kind="ellipsis"]');
    if (!chips.length) {
      setVisibleCount(0);
      setOverflowing(false);
      return;
    }

    const gapPx = (() => {
      const s = getComputedStyle(meas);
      const g = parseFloat(s.columnGap || s.gap || "6");
      return Number.isFinite(g) ? g : 6;
    })();
    const ellWidth = ell ? ell.offsetWidth : 0;

    let sum = 0;
    let count = 0;
    for (let i = 0; i < chips.length; i++) {
      const w = chips[i].offsetWidth;
      const extra = i === 0 ? 0 : gapPx;
      sum += w + extra;
      if (sum <= available) count = i + 1;
      else break;
    }

    if (count === chips.length && sum <= available) {
      setVisibleCount(chips.length);
      setOverflowing(false);
      return;
    }

    // Recalcul cu spațiu pentru „…”
    sum = 0;
    count = 0;
    for (let i = 0; i < chips.length; i++) {
      const w = chips[i].offsetWidth;
      const extra = i === 0 ? 0 : gapPx;
      const reserved = ellWidth + gapPx;
      if (sum + w + extra + reserved <= available) {
        sum += w + extra;
        count = i + 1;
      } else break;
    }

    setVisibleCount(count);
    setOverflowing(count < chips.length);
  }, []);

  React.useLayoutEffect(() => {
    recompute();
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recompute, items]);

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={rowRef}
        className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap overflow-hidden pl-1 min-w-0"
      >
        {items.slice(0, visibleCount).map((text, i) => (
          <span
            key={i}
            className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] bg-white/5 border border-white/10 text-white/85"
            title={text}
          >
            {text}
          </span>
        ))}
        {overflowing && (
          <span className="shrink-0 ml-0.5 px-2 py-0.5 rounded-md text-[11px] bg-white/8 border border-white/15 text-white/80 shadow-sm">
            …
          </span>
        )}
      </div>

      {/* invizibil pentru măsurare */}
      <div
        ref={measureRef}
        className="absolute -z-10 invisible pointer-events-none top-0 left-0 flex flex-nowrap items-center gap-1.5 whitespace-nowrap"
        aria-hidden="true"
      >
        {items.map((text, i) => (
          <span
            key={`m${i}`}
            data-kind="chip"
            className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] border"
          >
            {text}
          </span>
        ))}
        <span
          data-kind="ellipsis"
          className="px-2 py-0.5 rounded-md text-[11px] border"
        >
          …
        </span>
      </div>
    </div>
  );
}
