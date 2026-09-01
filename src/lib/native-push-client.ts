const NATIVE_PUSH_TOKEN_KEY = "sipstories:native-push-token";

export function rememberNativePushToken(deviceToken: string) {
  window.localStorage.setItem(NATIVE_PUSH_TOKEN_KEY, deviceToken);
}

export async function removeNativePushTokenForLogout() {
  const deviceToken = window.localStorage.getItem(NATIVE_PUSH_TOKEN_KEY);
  if (!deviceToken) return;

  try {
    await fetch("/api/push/native/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceToken }),
    });
  } finally {
    window.localStorage.removeItem(NATIVE_PUSH_TOKEN_KEY);
  }
}
