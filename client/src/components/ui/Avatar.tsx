import React from "react";
import { cn } from "../../lib/utils.js";

interface AvatarProps {
  name: string;
  avatar?: string | null;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatar,
  color = "#6366f1",
  size = "md",
  className,
}) => {
  const getInitials = (n: string) => {
    return n
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const sizeMap = {
    xs: "w-5 h-5 text-[10px]",
    sm: "w-7 h-7 text-xs",
    md: "w-8 h-8 text-xs font-semibold",
    lg: "w-10 h-10 text-sm font-semibold",
  };

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={cn("rounded-full object-cover ring-2 ring-zinc-950", sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: color }}
      className={cn(
        "rounded-full flex items-center justify-center text-white select-none ring-2 ring-zinc-950 font-sans shadow-sm",
        sizeMap[size],
        className
      )}
    >
      {getInitials(name || "U")}
    </div>
  );
};
