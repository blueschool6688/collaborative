import React from "react";
import { cn } from "../../lib/utils.js";

export interface BadgeProps {
  variant?: "success" | "warning" | "neutral" | "brand" | "danger";
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  size = "sm",
  children,
  className,
  dot = false,
}) => {
  const variantStyles = {
    neutral:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    brand:
      "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20",
    success:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    danger:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  };

  const dotColors = {
    neutral: "bg-zinc-400",
    brand: "bg-brand-500",
    success: "bg-emerald-500 animate-pulse-dot",
    warning: "bg-amber-500 animate-pulse-dot",
    danger: "bg-rose-500",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 gap-1.5",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border leading-none select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])} />}
      {children}
    </span>
  );
};
