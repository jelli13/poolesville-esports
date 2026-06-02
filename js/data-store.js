const KEYS = {
  HIGHLIGHTS: "phs_esports_highlights",
  SCHEDULE: "phs_esports_schedule",
};

function normalizeHighlight(item) {
  return {
    ...item,
    opponent: item.opponent ?? item.location ?? "",
  };
}

export async function loadHighlights() {
  const saved = localStorage.getItem(KEYS.HIGHLIGHTS);
  if (saved) {
    try {
      return JSON.parse(saved).map(normalizeHighlight);
    } catch {
      /* fall through */
    }
  }
  const res = await fetch("data/highlights.json");
  if (!res.ok) throw new Error("Could not load highlights");
  const data = await res.json();
  return data.map(normalizeHighlight);
}

export function saveHighlights(items) {
  localStorage.setItem(KEYS.HIGHLIGHTS, JSON.stringify(items.map(normalizeHighlight)));
}

export async function loadSchedule() {
  const saved = localStorage.getItem(KEYS.SCHEDULE);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      /* fall through */
    }
  }
  const res = await fetch("data/schedule.json");
  if (!res.ok) throw new Error("Could not load schedule");
  return res.json();
}

export function saveSchedule(rows) {
  localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(rows));
}
