// src/lib/utils.ts
// Utility function to join classNames conditionally

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}