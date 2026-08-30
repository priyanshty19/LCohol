export type PushCapability = "available" | "install-required" | "unsupported";

type PushCapabilityInput = {
  appleMobile: boolean;
  standalone: boolean;
  serviceWorkerAvailable: boolean;
  notificationAvailable: boolean;
  vapidConfigured: boolean;
};

export function resolvePushCapability({
  appleMobile,
  standalone,
  serviceWorkerAvailable,
  notificationAvailable,
  vapidConfigured,
}: PushCapabilityInput): PushCapability {
  if (!serviceWorkerAvailable || !vapidConfigured) return "unsupported";

  // iOS deliberately hides the Notification API in ordinary Safari. Explain
  // the required installation step before treating that missing API as a lack
  // of device support.
  if (appleMobile && !standalone) return "install-required";

  return notificationAvailable ? "available" : "unsupported";
}
