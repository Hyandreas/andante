import { createPrivateKey, createSign } from "crypto";
import { serverEnv as env } from "@/lib/env-server";

interface StoredPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Known Web Push service hosts. We only ever POST to these, which prevents a
// user from registering an internal/arbitrary `endpoint` and turning the
// reminder cron into an SSRF relay (it sends a VAPID-signed POST per endpoint).
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  ".notify.windows.com",
  ".push.apple.com",
  "web.push.apple.com",
  "updates.push.services.mozilla.com",
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_PUSH_HOSTS.some((allowed) =>
    allowed.startsWith(".") ? host.endsWith(allowed) || host === allowed.slice(1) : host === allowed,
  );
}

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  return Buffer.from((value + padding).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function encodeBase64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createVapidJwt(audience: string) {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    throw new Error("Web push is not configured.");
  }

  const publicKey = decodeBase64Url(env.vapidPublicKey);
  const privateKey = decodeBase64Url(env.vapidPrivateKey);
  if (publicKey.length !== 65 || publicKey[0] !== 4 || privateKey.length !== 32) {
    throw new Error("Invalid VAPID key format.");
  }

  const header = encodeBase64Url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = encodeBase64Url(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: env.vapidSubject,
  }));
  const key = createPrivateKey({
    format: "jwk",
    key: {
      kty: "EC",
      crv: "P-256",
      x: encodeBase64Url(publicKey.subarray(1, 33)),
      y: encodeBase64Url(publicKey.subarray(33, 65)),
      d: encodeBase64Url(privateKey),
    },
  });
  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  return `${header}.${payload}.${encodeBase64Url(signature)}`;
}

export async function sendReminderPush(subscription: StoredPushSubscription) {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    return { sent: false, skipped: true, expired: false };
  }

  // Defense in depth: never POST to a non-allowlisted (e.g. internal) endpoint,
  // even if a bad row slipped past the API-layer validation.
  if (!isAllowedPushEndpoint(subscription.endpoint)) {
    return { sent: false, skipped: true, expired: false };
  }

  const audience = new URL(subscription.endpoint).origin;
  const jwt = createVapidJwt(audience);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.vapidPublicKey}`,
      TTL: "300",
      Urgency: "normal",
    },
  });

  if (response.status === 404 || response.status === 410) {
    return { sent: false, skipped: false, expired: true };
  }
  if (!response.ok) {
    throw new Error(`Push service returned ${response.status}.`);
  }
  return { sent: true, skipped: false, expired: false };
}
