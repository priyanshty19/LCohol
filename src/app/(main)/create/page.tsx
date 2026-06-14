import { CreatePostForm } from "@/components/feed/create-post-form";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create Post",
};

export default function CreatePostPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold text-primary">
        Share Your Story
      </h1>
      <CreatePostForm />
    </div>
  );
}
