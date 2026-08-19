import React, { forwardRef } from "react";
import { cn } from "../../lib/utils.js";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 select-none whitespace-nowrap cursor-pointer";

    const variantStyles = {
      primary:
        "bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-950/20 active:bg-brand-700",
      secondary:
        "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/60",
      outline:
        "bg-transparent hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700",
      ghost:
        "bg-transparent hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100",
      danger:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-sm active:bg-rose-700",
    };

    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5 h-8",
      md: "text-sm px-3.5 py-2 gap-2 h-9",
      lg: "text-base px-5 py-2.5 gap-2.5 h-11",
      icon: "p-2 h-9 w-9",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
