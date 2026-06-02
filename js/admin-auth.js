/**
 * Client-side admin gate (static site).
 * Production schedule editing should use a real backend — credentials here
 * are for prototyping only and are not secret in the browser.
 */

const STORAGE_KEYS = {
  LOCKOUT_UNTIL: "phs_esports_lockout_until",
  FAIL_COUNT: "phs_esports_fail_count",
  LOGIN_HANDOFF: "phs_esports_admin_handoff",
  /** @deprecated cleared on init — sessions no longer persist across reload */
  SESSION: "phs_esports_admin_session",
};

/** Admin state lives in memory only; cleared on every full page reload. */
let adminActive = false;

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 5 * 60 * 1000;

const VALID_USERNAME = "poolesville";
const VALID_PASSWORD = "esports";

function secureEqual(a, b) {
  const sa = String(a);
  const sb = String(b);
  if (sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i += 1) {
    diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  }
  return diff === 0;
}

function readNumber(key) {
  const raw = localStorage.getItem(key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function getLockoutUntil() {
  return readNumber(STORAGE_KEYS.LOCKOUT_UNTIL);
}

export function getLockoutRemainingMs() {
  const until = getLockoutUntil();
  if (!until) return 0;
  return Math.max(0, until - Date.now());
}

export function isLockedOut() {
  if (getLockoutRemainingMs() > 0) return true;
  if (getLockoutUntil() > 0) {
    localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
    localStorage.removeItem(STORAGE_KEYS.FAIL_COUNT);
  }
  return false;
}

export function getFailedAttemptCount() {
  if (isLockedOut()) return MAX_ATTEMPTS;
  return readNumber(STORAGE_KEYS.FAIL_COUNT);
}

export function applyLockout() {
  localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, String(Date.now() + LOCKOUT_MS));
  localStorage.setItem(STORAGE_KEYS.FAIL_COUNT, String(MAX_ATTEMPTS));
}

export function recordFailedAttempt() {
  if (isLockedOut()) {
    return { locked: true, attempts: MAX_ATTEMPTS, justLocked: false };
  }

  const next = getFailedAttemptCount() + 1;
  localStorage.setItem(STORAGE_KEYS.FAIL_COUNT, String(next));

  if (next >= MAX_ATTEMPTS) {
    applyLockout();
    return { locked: true, attempts: next, justLocked: true };
  }

  return { locked: false, attempts: next, justLocked: false };
}

export function clearFailedAttempts() {
  localStorage.removeItem(STORAGE_KEYS.FAIL_COUNT);
  localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
}

export function validateCredentials(username, password) {
  const user = String(username).trim();
  const pass = String(password);
  return secureEqual(user, VALID_USERNAME) && secureEqual(pass, VALID_PASSWORD);
}

/**
 * Call once when each page loads. Promotes a one-time login handoff into memory,
 * then discards it so reloads always log the user out.
 */
export function initAdminAuth() {
  sessionStorage.removeItem(STORAGE_KEYS.SESSION);
  if (adminActive) return;

  const handoff = sessionStorage.getItem(STORAGE_KEYS.LOGIN_HANDOFF);
  if (handoff === "1") {
    sessionStorage.removeItem(STORAGE_KEYS.LOGIN_HANDOFF);
    adminActive = true;
  }
}

/** Set after successful login; consumed on the next page load only. */
export function setAdminSession() {
  clearFailedAttempts();
  adminActive = false;
  sessionStorage.setItem(STORAGE_KEYS.LOGIN_HANDOFF, "1");
}

export function isAdminLoggedIn() {
  return adminActive;
}

export function clearAdminSession() {
  adminActive = false;
  sessionStorage.removeItem(STORAGE_KEYS.LOGIN_HANDOFF);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION);
}

export function formatLockoutRemaining(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}
