import axios from "axios";
import { server } from "../constants/config";

// Web push for this browser. The subscription lives in the browser, and the server keeps a copy
// tied to the login session (logging this device out deletes it there).

// Which account turned push on in this browser, so a different account logging in here doesn't inherit it
const OWNER_KEY = "push_user_id";

const readOwner = () => {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
};

const writeOwner = (userId) => {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // Storage blocked: push still works for this visit
  }
};

export const pushSupported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// iPhone and iPad only allow push for web apps added to the home screen
export const needsHomeScreen = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !window.matchMedia("(display-mode: standalone)").matches;

export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => undefined);
};

const authed = (token) => ({
  withCredentials: true,
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

// The VAPID key arrives as base64url; the browser wants raw bytes
const keyBytes = (base64url) => {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

const sameKey = (subscription, bytes) => {
  const current = subscription.options?.applicationServerKey;
  if (!current) return false;
  const a = new Uint8Array(current);
  return a.length === bytes.length && a.every((byte, i) => byte === bytes[i]);
};

const browserSubscription = async () => {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
};

const save = (subscription, token) => {
  const { endpoint, keys } = subscription.toJSON();
  return axios.post(
    `${server}/api/v1/push/subscription`,
    { endpoint, p256dh: keys.p256dh, auth: keys.auth },
    authed(token),
  );
};

// "Not now" on the turn-on prompt hides it for a while
const PROMPT_SNOOZE_KEY = "push_prompt_snoozed_until";
const PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export const snoozePushPrompt = () => {
  try {
    localStorage.setItem(
      PROMPT_SNOOZE_KEY,
      String(Date.now() + PROMPT_SNOOZE_MS),
    );
  } catch {
    // Storage blocked: the prompt comes back next visit
  }
};

const promptSnoozed = () => {
  try {
    return Number(localStorage.getItem(PROMPT_SNOOZE_KEY)) > Date.now();
  } catch {
    return false;
  }
};

/**
 * Whether to offer turning push on: the browser supports it and hasn't blocked it, it isn't on
 * for this account yet, the server has push set up, and the user didn't just say "Not now".
 */
export const shouldPromptForPush = async ({ token, userId }) => {
  if (
    !pushSupported() ||
    Notification.permission === "denied" ||
    promptSnoozed()
  )
    return false;
  if (await isPushOn(userId)) return false;
  try {
    const { data } = await axios.get(
      `${server}/api/v1/push/public-key`,
      authed(token),
    );
    return !!data.public_key;
  } catch {
    return false;
  }
};

const messageOf = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong";

/** Whether push is on in this browser for this account. */
export const isPushOn = async (userId) => {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const subscription = await browserSubscription();
  return !!subscription && readOwner() === userId;
};

/** Asks for permission and subscribes this browser. Throws an Error with a message to show. */
export const enablePush = async ({ token, userId }) => {
  try {
    const { data } = await axios.get(
      `${server}/api/v1/push/public-key`,
      authed(token),
    );
    if (!data.public_key)
      throw new Error("Push notifications aren't available right now");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error(
        permission === "denied"
          ? "Notifications are blocked for this site. Allow them in your browser's site settings, then try again."
          : "Notifications weren't allowed",
      );
    }

    const registration = await navigator.serviceWorker.ready;
    const key = keyBytes(data.public_key);
    let subscription = await registration.pushManager.getSubscription();
    // A subscription made with a different server key can't be used
    if (subscription && !sameKey(subscription, key)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });

    await save(subscription, token);
    writeOwner(userId);
  } catch (error) {
    throw new Error(messageOf(error));
  }
};

export const disablePush = async ({ token }) => {
  await axios
    .delete(`${server}/api/v1/push/subscription`, authed(token))
    .catch(() => undefined);
  const subscription = await browserSubscription();
  await subscription?.unsubscribe().catch(() => undefined);
  writeOwner(null);
};

/**
 * On app start: logging in again (a new session) re-links this browser's subscription for the same
 * account; for a different account it's removed, so they don't get the previous person's setting.
 */
export const syncPush = async ({ token, userId }) => {
  if (!pushSupported() || Notification.permission !== "granted") return;
  const subscription = await browserSubscription();
  if (!subscription) return;
  if (readOwner() !== userId) {
    await subscription.unsubscribe().catch(() => undefined);
    writeOwner(null);
    return;
  }
  await save(subscription, token).catch(() => undefined);
};
