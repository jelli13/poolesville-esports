import { getAdminApiToken } from "./admin-auth.js";

const KEYS = {
  PLAYERS: "phs_esports_players",
};

function apiBase() {
  const base = window.PHS_SITE_CONFIG?.apiBase ?? "";
  return String(base).replace(/\/$/, "");
}

function apiUrl(path) {
  const base = apiBase();
  return base ? `${base}${path}` : path;
}

function normalizeHighlight(item) {
  return {
    ...item,
    opponent: item.opponent ?? item.location ?? "",
  };
}

async function fetchPublicJson(apiPath, fallbackPath) {
  const cacheBust = `?_=${Date.now()}`;
  try {
    const res = await fetch(`${apiUrl(apiPath)}${cacheBust}`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {
    /* try fallback */
  }

  if (fallbackPath) {
    const res = await fetch(`${fallbackPath}${cacheBust}`, { cache: "no-store" });
    if (res.ok) return res.json();
  }

  throw new Error(`Could not load ${apiPath}`);
}

async function postAdminJson(apiPath, data) {
  const token = getAdminApiToken();
  if (!token) {
    throw new Error(
      "Server login required. Sign in again with npm start (or your deployed API) running."
    );
  }

  const res = await fetch(apiUrl(apiPath), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Save failed. Is the site API running?");
  }
}

export async function loginToContentApi(username, password) {
  const res = await fetch(apiUrl("/api/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error("API login failed");
  }

  const payload = await res.json();
  if (!payload?.token) throw new Error("API login failed");
  return payload.token;
}

export async function loadHighlights() {
  const data = await fetchPublicJson("/api/highlights", "data/highlights.json");
  return data.map(normalizeHighlight);
}

export async function saveHighlights(items) {
  await postAdminJson("/api/highlights", items.map(normalizeHighlight));
}

export async function loadSchedule() {
  return fetchPublicJson("/api/schedule", "data/schedule.json");
}

export async function saveSchedule(rows) {
  await postAdminJson("/api/schedule", rows);
}

export async function loadPlayers() {
  const saved = localStorage.getItem(KEYS.PLAYERS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      /* fall through */
    }
  }
  const res = await fetch("data/players.json");
  if (!res.ok) throw new Error("Could not load players");
  return res.json();
}

export function savePlayers(data) {
  localStorage.setItem(KEYS.PLAYERS, JSON.stringify(data));
}
