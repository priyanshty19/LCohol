"use client";

import { LoaderCircle, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DefaultDrinkArtwork } from "@/components/drinks/default-drink-artwork";
import { FadeImage } from "@/components/ui/fade-image";
import { compressImage } from "@/lib/image-compress";
import { toast } from "@/lib/toast";

type CocktailImageEditorProps = {
  cocktailId: string;
  name: string;
  glass: string | null;
  initialImageUrl: string | null;
  canEdit: boolean;
};

export function CocktailImageEditor({
  cocktailId,
  name,
  glass,
  initialImageUrl,
  canEdit,
}: CocktailImageEditorProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [saving, setSaving] = useState(false);
  const fallback = <DefaultDrinkArtwork name={name} category={glass} kind="cocktail" />;

  async function replaceImage(file: File) {
    if (saving) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a JPEG, PNG or WebP image.");
      return;
    }

    setSaving(true);
    try {
      const compressed = await compressImage(file, { maxEdge: 1400, quality: 0.78 });
      const form = new FormData();
      form.append("file", compressed, "mix-photo.jpg");
      form.append("scope", "mixes");

      const upload = await fetch("/api/upload", { method: "POST", body: form });
      const uploaded = await upload.json().catch(() => ({}));
      if (!upload.ok || !uploaded.url) {
        throw new Error(uploaded.error ?? "Photo upload failed.");
      }

      const update = await fetch(`/api/cocktails/${cocktailId}/image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploaded.url }),
      });
      const updated = await update.json().catch(() => ({}));
      if (!update.ok || !updated.data?.imageUrl) {
        throw new Error(updated.error ?? "Couldn't update the drink image.");
      }

      setImageUrl(updated.data.imageUrl);
      toast.success("Drink image updated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the drink image.");
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl ring-1 ring-primary/15">
      {imageUrl ? (
        <FadeImage
          src={imageUrl}
          alt={name}
          fill
          sizes="96px"
          className="object-cover"
          unoptimized
          fallback={fallback}
        />
      ) : fallback}

      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label={`Choose a new image for ${name}`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void replaceImage(file);
            }}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/75 px-2 py-1 text-[10px] font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-70 [@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100"
            aria-label={`Edit image for ${name}`}
          >
            {saving ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
            {saving ? "Saving" : "Edit"}
          </button>
        </>
      )}
    </div>
  );
}
