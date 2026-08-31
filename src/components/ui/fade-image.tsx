"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// next/image that fades in once decoded, instead of snapping in. Safe inside
// server components (it's a client leaf). Starts already-visible if the browser
// reports the image complete (cached), so cached images don't flash.
export function FadeImage({ className, onLoad, onError, fallback, ...props }: ImageProps & { fallback?: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return fallback ?? null;
  return (
    <Image
      {...props}
      alt={props.alt}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      className={cn(
        "transition-opacity duration-500 ease-out",
        loaded ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
}
