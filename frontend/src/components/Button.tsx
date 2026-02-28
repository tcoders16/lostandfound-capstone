// src/components/Button.tsx
import React from "react";
import { cn } from "../lib/utils";



type Variant = "primary" | "secondary" | "danger";
type Size = "sm" | "md" | "lg";



type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};




export default function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  disabled,
  ...props
}: Props) {
  const base =
    "rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClasses: Record<Size, string> = {
    sm: "px-2.5 py-1 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  const variants: Record<Variant, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  return (
    <button
      {...props}                 // includes onClick, type, title, aria-*, etc.
      disabled={disabled}
      className={cn(base, sizeClasses[size], variants[variant], className)}
    >
      {children}
    </button>
  );
}