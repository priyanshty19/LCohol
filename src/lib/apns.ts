import { createPrivateKey, sign } from "node:crypto";
import { connect, type ClientHttp2Session } from "node:http2";
import { prisma } from "@/lib/prisma";
import { nativeIosPushEnabled } from "@/lib/native-push";

type ApnsEnvironment = "sandbox" | "production";

type ApnsConfig = {
  bundleId: string;
  environment: ApnsEnvironment;
  keyId: string;
  privateKey: string;
  teamId: string;
};

type ApnsPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type ApnsResponse = {
  status: number;
  reason?: string;
};

const INVALID_TOKEN_REASONS = new Set([
  "BadDeviceToken",
  "DeviceTokenNotForTopic",
  "Unregistered",
]);

let cachedProviderToken: { token: string; issuedAt: number; cacheKey: string } | null = null;

function value(env: NodeJS.ProcessEnv, key: string) {
  return env[key]?.trim();
}

export function resolveApnsConfig(env: NodeJS.ProcessEnv = process.env): ApnsConfig | null {
  const keyId = value(env, "APNS_KEY_ID");
  const teamId = value(env, "APNS_TEAM_ID");
  const privateKey = value(env, "APNS_PRIVATE_KEY")?.replace(/\\n/g, "\n");
  const bundleId = value(env, "APNS_BUNDLE_ID");
  if (!keyId || !teamId || !privateKey || !bundleId) return null;

  return {
    keyId,
    teamId,
    privateKey,
    bundleId,
    environment: value(env, "APNS_ENVIRONMENT") === "production" ? "production" : "sandbox",
  };
}

export function isApnsConfigured(env: NodeJS.ProcessEnv = process.env) {
  return resolveApnsConfig(env) !== null;
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function providerToken(config: ApnsConfig) {
  const now = Math.floor(Date.now() / 1000);
  const cacheKey = `${config.teamId}:${config.keyId}`;
  if (
    cachedProviderToken &&
    cachedProviderToken.cacheKey === cacheKey &&
    now - cachedProviderToken.issuedAt < 50 * 60
  ) {
    return cachedProviderToken.token;
  }

  const header = base64Url(JSON.stringify({ alg: "ES256", kid: config.keyId }));
  const claims = base64Url(JSON.stringify({ iss: config.teamId, iat: now }));
  const unsigned = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: createPrivateKey(config.privateKey),
    dsaEncoding: "ieee-p1363",
  });
  const token = `${unsigned}.${base64Url(signature)}`;
  cachedProviderToken = { token, issuedAt: now, cacheKey };
  return token;
}

function openSession(host: string) {
  return new Promise<ClientHttp2Session>((resolve, reject) => {
    const client = connect(host);
    const onError = (error: Error) => reject(error);
    client.once("error", onError);
    client.once("connect", () => {
      client.off("error", onError);
      client.on("error", (error) => console.error("[apns session]", error));
      resolve(client);
    });
  });
}

function sendOne(
  client: ClientHttp2Session,
  config: ApnsConfig,
  token: string,
  deviceToken: string,
  payload: ApnsPayload,
) {
  return new Promise<ApnsResponse>((resolve, reject) => {
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${token}`,
      "apns-topic": config.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });

    let status = 0;
    let responseBody = "";
    request.setEncoding("utf8");
    request.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    request.on("data", (chunk) => {
      responseBody += chunk;
    });
    request.on("end", () => {
      const reason = (() => {
        try {
          return (JSON.parse(responseBody) as { reason?: string }).reason;
        } catch {
          return undefined;
        }
      })();
      resolve({ status, reason });
    });
    request.on("error", reject);
    request.end(
      JSON.stringify({
        aps: {
          alert: { title: payload.title, body: payload.body },
          sound: "default",
          ...(payload.tag ? { "thread-id": payload.tag } : {}),
        },
        ...(payload.url ? { url: payload.url } : {}),
      }),
    );
  });
}

export async function sendNativePush(userId: string, payload: ApnsPayload): Promise<void> {
  if (!nativeIosPushEnabled()) return;
  const config = resolveApnsConfig();
  if (!config) return;

  let client: ClientHttp2Session | null = null;
  try {
    const subscriptions = await prisma.nativePushSubscription.findMany({
      where: { userId, platform: "ios" },
    });
    if (!subscriptions.length) return;

    const host =
      config.environment === "production"
        ? "https://api.push.apple.com"
        : "https://api.sandbox.push.apple.com";
    const token = providerToken(config);
    client = await openSession(host);
    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          const response = await sendOne(
            client!,
            config,
            token,
            subscription.deviceToken,
            payload,
          );
          if (response.status === 200) return;

          if (response.status === 410 || (response.reason && INVALID_TOKEN_REASONS.has(response.reason))) {
            await prisma.nativePushSubscription
              .delete({ where: { deviceToken: subscription.deviceToken } })
              .catch(() => {});
            return;
          }
          console.error("[sendNativePush]", response.status, response.reason ?? "Unknown APNs error");
        } catch (error) {
          console.error("[sendNativePush]", error);
        }
      }),
    );
  } catch (error) {
    console.error("[sendNativePush setup]", error);
  } finally {
    client?.close();
  }
}
