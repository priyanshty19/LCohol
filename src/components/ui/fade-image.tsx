"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// A client leaf around next/image that swaps to a fallback after a load error.
// Keep the image visible while it loads: cached images can complete before React
// receives onLoad, and hiding them until that event leaves a permanently blank card.
export function FadeImage({ className, onLoad, onError, fallback, ...props }: ImageProps & { fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback ?? null;
  return (
    <Image
      {...props}
      alt={props.alt}
      onLoad={(e) => {
        onLoad?.(e);
      }}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      className={cn(
        "opacity-100 transition-opacity duration-500 ease-out",
        className
      )}
    />
  );
}
