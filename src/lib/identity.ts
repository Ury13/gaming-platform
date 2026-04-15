// Anonymous identity — localStorage-backed UUID + display name.
// No React imports — plain functions, safe to call from client components only.

const KEY_UID  = "cs_uid";
const KEY_NAME = "cs_display_name";

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "server";
  let uid = localStorage.getItem(KEY_UID);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(KEY_UID, uid);
  }
  return uid;
}

export function getDisplayName(): string {
  if (typeof window === "undefined") return "Anonymous";
  return localStorage.getItem(KEY_NAME) || "Anonymous";
}

export function setDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_NAME, name.trim().slice(0, 24));
}
