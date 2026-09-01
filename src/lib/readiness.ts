export type RuntimeServiceChecks = {
  googlePlaces: boolean;
  imageUploads: boolean;
  nativePush: boolean;
  webPush: boolean;
};

type Environment = Record<string, string | undefined>;

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

/** Pure configuration audit used by the public readiness probe and unit tests. */
export function configuredRuntimeServices(env: Environment): RuntimeServiceChecks {
  const browserVapid = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const serverVapid = env.VAPID_PUBLIC_KEY?.trim();
  const nativePushEnabled = env.NATIVE_IOS_PUSH_ENABLED?.trim().toLowerCase() === "true";

  return {
    googlePlaces: present(env.GOOGLE_MAPS_API_KEY),
    imageUploads:
      present(env.NEXT_PUBLIC_SUPABASE_URL) && present(env.SUPABASE_SERVICE_ROLE_KEY),
    nativePush:
      !nativePushEnabled ||
      (present(env.APNS_KEY_ID) &&
        present(env.APNS_TEAM_ID) &&
        present(env.APNS_PRIVATE_KEY) &&
        present(env.APNS_BUNDLE_ID)),
    webPush:
      Boolean(browserVapid) &&
      browserVapid === serverVapid &&
      present(env.VAPID_PRIVATE_KEY) &&
      present(env.VAPID_SUBJECT),
  };
}
