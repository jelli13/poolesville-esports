import { isAdminLoggedIn } from "./admin-auth.js";
import { loadHighlights, saveHighlights } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";

let highlightsData = [];
let dataLoaded = false;

const DEFAULT_PLAYERS = ["Shatterlol", "BlaKKat", "AcidSquirrel", "DynamiteHanSolo1"];
const DEFAULT_OPPONENTS = ["Blake", "Clarksburg", "Northwood"];

const activeFilters = {
  player: null,
  opponent: null,
  week: null,
};

const FILTER_SELECTS = [
  { key: "player", selectId: "filter-player" },
  { key: "week", selectId: "filter-week" },
  { key: "opponent", selectId: "filter-opponent" },
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function compareFilterValues(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function mergeFilterOptions(defaults, fromData) {
  return [...new Set([...defaults, ...fromData.map(String).filter(Boolean)])].sort(compareFilterValues);
}

function isNumericPlayerValue(value) {
  return /^\d+$/.test(String(value ?? "").trim());
}

function getPlayerName(item) {
  const stored = String(item.playerNumber ?? "").trim();
  if (stored && !isNumericPlayerValue(stored)) return stored;

  const hay = `${item.title} ${item.keywords}`.toLowerCase();
  for (const name of DEFAULT_PLAYERS) {
    if (hay.includes(name.toLowerCase())) return name;
  }

  const titleMatch = item.title?.match(/[—–-]\s*([A-Za-z][A-Za-z0-9]*)/);
  if (titleMatch) {
    const candidate = titleMatch[1];
    if (!/^(full|game|semifinals|finals)$/i.test(candidate)) return candidate;
  }

  return null;
}

function getWeekNumber(item) {
  const fromTitle = item.title?.match(/Week\s+(\d+)/i);
  if (fromTitle) return fromTitle[1];
  return item.gameNumber ? String(item.gameNumber) : null;
}

function formatHighlightMeta(item) {
  const parts = [];
  const player = getPlayerName(item);
  const week = getWeekNumber(item);

  if (player) parts.push(escapeHtml(player));
  if (week) parts.push(`Week ${escapeHtml(week)}`);
  if (item.opponent) parts.push(`vs ${escapeHtml(item.opponent)}`);

  return parts.join(" · ");
}

async function ensureHighlightsLoaded() {
  if (!dataLoaded) {
    highlightsData = await loadHighlights();
    dataLoaded = true;
  }
}

function getGalleryElements() {
  return {
    gallery: document.getElementById("highlights-gallery"),
    searchInput: document.getElementById("highlights-search"),
    emptyEl: document.getElementById("highlights-empty"),
  };
}

function applyGalleryFilters() {
  const { gallery, searchInput, emptyEl } = getGalleryElements();
  renderGallery(gallery, emptyEl, searchInput?.value ?? "");
}

function populateFilterDropdowns() {
  const groups = [
    {
      key: "player",
      selectId: "filter-player",
      allLabel: "All Players",
      values: mergeFilterOptions(
        DEFAULT_PLAYERS,
        highlightsData.map((h) => getPlayerName(h)).filter(Boolean)
      ).filter((value) => !isNumericPlayerValue(value)),
      formatLabel: (value) => value,
    },
    {
      key: "week",
      selectId: "filter-week",
      allLabel: "All Weeks",
      values: mergeFilterOptions([], highlightsData.map((h) => getWeekNumber(h)).filter(Boolean)),
      formatLabel: (value) => `Week ${value}`,
    },
    {
      key: "opponent",
      selectId: "filter-opponent",
      allLabel: "All Opponents",
      values: mergeFilterOptions(
        DEFAULT_OPPONENTS,
        highlightsData.map((h) => h.opponent)
      ),
      formatLabel: (value) => value,
    },
  ];

  groups.forEach(({ key, selectId, allLabel, values, formatLabel }) => {
    const select = document.getElementById(selectId);
    if (!select) return;

    const current = activeFilters[key] ?? "";

    select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>`;
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = formatLabel(value);
      select.appendChild(option);
    });

    if (current && values.includes(current)) {
      select.value = current;
    } else {
      select.value = "";
      activeFilters[key] = null;
    }
  });
}

export function clearHighlightFilters() {
  activeFilters.player = null;
  activeFilters.opponent = null;
  activeFilters.week = null;

  FILTER_SELECTS.forEach(({ selectId }) => {
    const select = document.getElementById(selectId);
    if (select) select.value = "";
  });
}

export async function reloadHighlights() {
  dataLoaded = false;
  await ensureHighlightsLoaded();
  highlightsData = await loadHighlights();
  populateFilterDropdowns();
  applyGalleryFilters();
}

let filterPanelWired = false;

function setFilterPanelOpen(open) {
  const panel = document.getElementById("highlights-filter-panel");
  const searchInput = document.getElementById("highlights-search");
  if (!panel || !searchInput) return;

  panel.hidden = !open;
  searchInput.setAttribute("aria-expanded", String(open));
}

function wireFilterPanel() {
  if (filterPanelWired) return;

  const wrap = document.getElementById("highlights-search-wrap");
  const searchInput = document.getElementById("highlights-search");
  const panel = document.getElementById("highlights-filter-panel");
  if (!wrap || !searchInput || !panel) return;

  filterPanelWired = true;

  const openPanel = () => setFilterPanelOpen(true);

  searchInput.addEventListener("focus", openPanel);
  searchInput.addEventListener("click", openPanel);
  wrap.addEventListener("mousedown", (e) => e.stopPropagation());

  document.addEventListener("mousedown", (e) => {
    if (!wrap.contains(e.target)) {
      setFilterPanelOpen(false);
    }
  });

  FILTER_SELECTS.forEach(({ key, selectId }) => {
    const select = document.getElementById(selectId);
    select?.addEventListener("change", () => {
      activeFilters[key] = select.value || null;
      applyGalleryFilters();
    });
  });
}

export async function initHighlights() {
  const { gallery, searchInput, emptyEl } = getGalleryElements();

  if (!gallery) return;

  wireFilterPanel();

  try {
    highlightsData = await loadHighlights();
    dataLoaded = true;
  } catch {
    gallery.innerHTML =
      '<p class="placeholder-text">Could not load highlights. Run the site with a local server.</p>';
    populateFilterDropdowns();
    return;
  }

  populateFilterDropdowns();
  renderGallery(gallery, emptyEl, searchInput?.value ?? "");

  searchInput?.addEventListener("input", applyGalleryFilters);

  syncAdminControls();
}

function matchesPlayerFilter(item, player) {
  const needle = player.toLowerCase();
  const playerName = getPlayerName(item);
  if (playerName && playerName.toLowerCase() === needle) return true;

  const hay = `${item.title} ${item.keywords}`.toLowerCase();
  return hay.includes(needle);
}

function matchesFilters(item, query) {
  if (activeFilters.player && !matchesPlayerFilter(item, activeFilters.player)) return false;
  if (activeFilters.week && getWeekNumber(item) !== activeFilters.week) return false;
  if (activeFilters.opponent && item.opponent !== activeFilters.opponent) return false;

  const q = query.toLowerCase().trim();
  if (!q) return true;

  const player = getPlayerName(item) ?? "";
  const week = getWeekNumber(item) ?? "";
  const hay = `${item.title} ${item.keywords} ${player} ${week} ${item.opponent} week`.toLowerCase();
  return hay.includes(q);
}

export async function deleteHighlight(id) {
  if (!isAdminLoggedIn()) return;
  await ensureHighlightsLoaded();
  highlightsData = highlightsData.filter((h) => h.id !== id);
  await saveHighlights(highlightsData);
}

export async function addHighlight(clip) {
  await ensureHighlightsLoaded();
  highlightsData = [clip, ...highlightsData];
  await saveHighlights(highlightsData);
}

function renderGallery(gallery, emptyEl, query) {
  if (!gallery) return;

  const admin = isAdminLoggedIn();
  const filtered = highlightsData.filter((item) => matchesFilters(item, query));

  gallery.innerHTML = filtered
    .map((item) => {
      const media = item.embedUrl
        ? `<div class="highlight-embed"><iframe src="${escapeHtml(item.embedUrl)}" title="${escapeHtml(item.title)}" allowfullscreen loading="lazy"></iframe></div>`
        : `<div class="highlight-embed highlight-embed--placeholder"><span>Video embed coming soon</span></div>`;

      const deleteBtn = admin
        ? `<button type="button" class="highlight-delete" data-delete-id="${escapeHtml(item.id)}" aria-label="Delete clip">🗑</button>`
        : "";

      return `
        <article class="highlight-card" data-id="${escapeHtml(item.id)}">
          ${deleteBtn}
          ${media}
          <div class="highlight-card-body">
            <h3>${escapeHtml(item.title)}</h3>
            <p class="highlight-meta">${formatHighlightMeta(item)}</p>
          </div>
        </article>`;
    })
    .join("");

  gallery.querySelectorAll(".highlight-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remove this clip permanently?")) return;
      await deleteHighlight(btn.dataset.deleteId);
      clearHighlightFilters();
      await reloadHighlights();
    });
  });

  if (emptyEl) emptyEl.hidden = filtered.length > 0;
}

export { formatHighlightMeta };
