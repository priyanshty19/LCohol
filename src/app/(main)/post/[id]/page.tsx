import { PostDetail } from "@/components/feed/post-detail";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostDetail postId={id} />;
}
