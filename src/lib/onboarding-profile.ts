type ProfileFetcher = (
  input: string,
  init: RequestInit,
) => Promise<{ ok: boolean }>;

export async function persistOnboardingProfile(
  body: Record<string, unknown>,
  fetcher: ProfileFetcher = fetch,
): Promise<void> {
  const response = await fetcher("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Profile update failed");
  }
}
