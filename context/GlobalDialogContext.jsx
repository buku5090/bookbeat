/* eslint-disable react-refresh/only-export-components */
// src/context/GlobalDialogContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";

const GlobalDialogContext = createContext(null);

export function GlobalDialogProvider({ children }) {
  const [dialogConfig, setDialogConfig] = useState({
    open: false,
    title: "",
    content: null,
    widthClass: "w-full max-w-sm sm:max-w-xl",
    heightClass: "max-h-[80vh] sm:max-h-[90vh]",
    bgClass: "bg-neutral-950",
    fullscreen: false,
  });

  const scrollYRef = useRef(0);

  // ✅ iOS detection
  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    return /iP(hone|ad|od)/.test(ua);
  }, []);

  // doar pe iOS folosim visualViewport height pentru fullscreen
  const [vvh, setVvh] = useState(null);

  const openDialog = useCallback((config = {}) => {
    setDialogConfig((prev) => ({
      ...prev,
      ...config,
      open: true,
    }));
  }, []);

  const closeDialog = useCallback(() => {
    setDialogConfig((prev) => ({
      ...prev,
      open: false,
    }));
  }, []);

  // 🔒 Scroll lock corect pt. iOS + stable fullscreen height
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const body = document.body;

    if (dialogConfig.open) {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      scrollYRef.current = scrollY;

      body.dataset.prevOverflow = body.style.overflow || "";
      body.dataset.prevPosition = body.style.position || "";
      body.dataset.prevTop = body.style.top || "";
      body.dataset.prevWidth = body.style.width || "";
      body.dataset.prevLeft = body.style.left || "";
      body.dataset.prevRight = body.style.right || "";
      body.dataset.prevTouchAction = body.style.touchAction || "";

      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.touchAction = "none";

      const vv = window.visualViewport;
      const updateVvh = () => {
        if (!isIOS || !dialogConfig.fullscreen) return;
        const h = vv?.height || window.innerHeight;
        setVvh(h);
      };

      updateVvh();
      vv?.addEventListener("resize", updateVvh);
      vv?.addEventListener("scroll", updateVvh);

      const preventScroll = (e) => {
        if (e.target?.closest?.('[data-allow-scroll="true"]')) return;
        e.preventDefault();
      };

      window.addEventListener("touchmove", preventScroll, { passive: false });

      return () => {
        window.removeEventListener("touchmove", preventScroll);

        vv?.removeEventListener("resize", updateVvh);
        vv?.removeEventListener("scroll", updateVvh);
        setVvh(null);

        const prevOverflow = body.dataset.prevOverflow ?? "";
        const prevPosition = body.dataset.prevPosition ?? "";
        const prevTop = body.dataset.prevTop ?? "";
        const prevWidth = body.dataset.prevWidth ?? "";
        const prevLeft = body.dataset.prevLeft ?? "";
        const prevRight = body.dataset.prevRight ?? "";
        const prevTouchAction = body.dataset.prevTouchAction ?? "";

        body.style.overflow = prevOverflow;
        body.style.position = prevPosition;
        body.style.top = prevTop;
        body.style.width = prevWidth;
        body.style.left = prevLeft;
        body.style.right = prevRight;
        body.style.touchAction = prevTouchAction;

        delete body.dataset.prevOverflow;
        delete body.dataset.prevPosition;
        delete body.dataset.prevTop;
        delete body.dataset.prevWidth;
        delete body.dataset.prevLeft;
        delete body.dataset.prevRight;
        delete body.dataset.prevTouchAction;

        const y = scrollYRef.current || 0;
        window.scrollTo(0, y);
      };
    }
  }, [dialogConfig.open, dialogConfig.fullscreen, isIOS]);

  const value = { openDialog, closeDialog };

  // ✅ doar pe iOS + fullscreen aplicăm height inline
  const iosFullHeightStyle =
    isIOS && dialogConfig.fullscreen && vvh
      ? { height: vvh, maxHeight: vvh }
      : undefined;

  return (
    <GlobalDialogContext.Provider value={value}>
      {children}

      {dialogConfig.open && (
        <div
          className="
            fixed inset-0 z-[9999]
            bg-black/70 backdrop-blur-sm
          "
          style={iosFullHeightStyle}
          onClick={closeDialog}
        >
          {/* ✅ DIALOG CONTAINER */}
          {dialogConfig.fullscreen ? (
            // FULLSCREEN = position: fixed, independent of flex/layout
            <div
              className={`
                fixed inset-0
                flex flex-col
                ${dialogConfig.bgClass}
                text-white
              `}
              style={iosFullHeightStyle}
              onClick={(e) => e.stopPropagation()}
            >
              {/* X în colț, peste conținut */}
              <div className="shrink-0 flex justify-end pt-3 pr-6">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="z-50 !bg-transparent !border-none"
                  aria-label="Închide dialogul"
                >
                  <span className="block h-7 w-7 relative">
                    <span className="absolute inset-0 left-1/2 h-full w-[2px] -translate-x-1/2 rotate-45 bg-white" />
                    <span className="absolute inset-0 left-1/2 h-full w-[2px] -translate-x-1/2 -rotate-45 bg-white" />
                  </span>
                </button>
              </div>

              {/* ✅ DOAR CONTENTUL SCROLLEAZĂ */}
              <div
                className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
                data-allow-scroll="true"
              >
                {typeof dialogConfig.content === "function"
                  ? dialogConfig.content({ closeDialog })
                  : dialogConfig.content}
              </div>
            </div>
          ) : (
            // NORMAL (non-fullscreen)
            <div
              className="fixed inset-0 flex items-center justify-center px-0 sm:px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`
                  mx-auto w-full my-4 flex justify-center
                  ${dialogConfig.widthClass}
                  ${dialogConfig.heightClass}
                `}
              >
                <div
                  className={`
                    relative flex w-fit h-full max-h-full flex-col overflow-hidden text-white
                    rounded-2xl border border-white/10 shadow-2xl
                    ${dialogConfig.bgClass}
                  `}
                >
                  {/* Header normal cu titlu + X */}
                  <div className="sticky top-0 z-10 flex items-center justify-between backdrop-blur px-5 pt-5">
                    <h2 className="text-sm font-medium sm:text-base">
                      {dialogConfig.title}
                    </h2>

                    <button
                      type="button"
                      onClick={closeDialog}
                      className="rounded-full !bg-transparent !border-none transition"
                      aria-label="Închide dialogul"
                    >
                      <span className="block h-7 w-7 relative">
                        <span className="absolute inset-0 left-1/2 h-full w-[2px] -translate-x-1/2 rotate-45 bg-white" />
                        <span className="absolute inset-0 left-1/2 h-full w-[2px] -translate-x-1/2 -rotate-45 bg-white" />
                      </span>
                    </button>
                  </div>

                  {/* Conținut scrollabil normal */}
                  <div
                    className="flex-1 min-h-0 overflow-y-auto px-5 pb-5"
                    style={{ WebkitOverflowScrolling: "touch" }}
                    data-allow-scroll="true"
                  >
                    {typeof dialogConfig.content === "function"
                      ? dialogConfig.content({ closeDialog })
                      : dialogConfig.content}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </GlobalDialogContext.Provider>
  );
}

export function useGlobalDialog() {
  const ctx = useContext(GlobalDialogContext);
  if (!ctx) {
    throw new Error(
      "useGlobalDialog trebuie folosit în interiorul GlobalDialogProvider"
    );
  }
  return ctx;
}
