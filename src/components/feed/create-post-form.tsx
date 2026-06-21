"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POST_TYPES } from "@/lib/constants";
import { compressImage } from "@/lib/image-compress";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function CreatePostForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"PUBLIC" | "CIRCLE">("PUBLIC");

  // Revoke the active object URL on unmount (e.g. after submit navigates away)
  // so the blob isn't leaked for the document's lifetime.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("Please choose a JPEG, PNG or WebP image.");
      return;
    }
    setError(null);
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const body = formData.get("body") as string;
    const postType = formData.get("postType") as string;

    try {
      // Compress + upload the image first (if any), then create the post.
      let imageUrl: string | null = null;
      if (imageFile) {
        const blob = await compressImage(imageFile);
        const fd = new FormData();
        fd.append("file", blob, "post.jpg");
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const upJson = await up.json();
        if (!up.ok) {
          setError(upJson.error || "Image upload failed");
          return;
        }
        imageUrl = upJson.url;
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, postType, imageUrl, visibility }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to create post");
        return;
      }

      router.push(`/post/${json.data.id}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card variant="glass">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="postType">Type</Label>
            <Select name="postType" defaultValue="STORY">
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {POST_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Audience</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "PUBLIC", emoji: "🌍", label: "Public" },
                  { value: "CIRCLE", emoji: "🤝", label: "Circle" },
                ] as const
              ).map((opt) => {
                const active = visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    aria-pressed={active}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="mr-1">{opt.emoji}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {visibility === "PUBLIC"
                ? "Everyone on SipStories can see this."
                : "Only people in your circle can see this."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="What's your story?"
              required
              maxLength={300}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body (optional)</Label>
            <Textarea
              id="body"
              name="body"
              placeholder="Share the details..."
              rows={6}
              maxLength={10000}
            />
          </div>

          {/* Image (optional) — compressed client-side before upload */}
          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-xl border border-border/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Selected preview"
                  className="max-h-72 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  aria-label="Remove image"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/40 bg-white/[0.02] px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-white/[0.04]">
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Add a photo
                </span>
                <span className="text-[11px] text-muted-foreground/60">
                  JPEG, PNG or WebP
                </span>
                <input
                  type="file"
                  accept={ACCEPTED.join(",")}
                  onChange={onPickImage}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-[var(--ml-sos)]/10 p-3 text-sm text-[var(--ml-sos)] glow-danger">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="glass"
              size="lg"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="lg" disabled={loading}>
              {loading ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
