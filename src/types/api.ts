export type ApiResponse<T> = {
  data: T;
  error?: never;
} | {
  data?: never;
  error: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
};

export type CreatePostInput = {
  title: string;
  body?: string;
  postType: string;
  tagIds?: string[];
  drinkIds?: string[];
};

export type CreateCommentInput = {
  body: string;
  parentId?: string;
};

export type VoteInput = {
  value: 1 | -1;
};

export type SearchParams = {
  q: string;
  type?: "posts" | "drinks" | "users";
  sort?: string;
  page?: number;
};
