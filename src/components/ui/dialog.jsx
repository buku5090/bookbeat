import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ children }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
      <DialogPrimitive.Content
        className="fixed z-50 bg-white p-6 rounded-lg shadow-lg w-full max-w-md left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        {children}
        <DialogClose className="absolute top-4 right-4 text-gray-500 hover:text-black">
          <X size={20} />
        </DialogClose>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ children }) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function DialogDescription({ children }) {
  return <p className="text-sm text-gray-600 mt-1">{children}</p>;
}

export function DialogFooter({ children }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}
