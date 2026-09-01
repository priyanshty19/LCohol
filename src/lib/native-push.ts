export function normalizeNativeDeviceToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  if (token.length % 2 !== 0 || !/^[a-f0-9]{32,512}$/.test(token)) return null;
  return token;
}

export function nativeIosPushEnabled(env: Record<string, string | undefined> = process.env) {
  return env.NATIVE_IOS_PUSH_ENABLED?.trim().toLowerCase() === "true";
}
