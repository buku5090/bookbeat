// src/components/ui/dialog.jsx
import { useState } from "react";

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children }) {
  return <div>{children}</div>;
}

export function DialogTrigger({ children }) {
  // Nu este folosit în varianta actuală, dar îl lăsăm pentru compatibilitate
  return children;
}
