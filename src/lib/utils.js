// src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Concat + dedup pentru clase Tailwind */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
