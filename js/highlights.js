import { isAdminLoggedIn } from "./admin-auth.js";
import { loadHighlights, saveHighlights } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";

let highlightsData = [];
let dataLoaded = false;

const activeFilters = {
  player: null,
  opponent: null,
};

const FILTER_SELECTS = [
  { key: "player", selectId: "filter-player" },
  { key: "opponent", selectId: "filter-opponent" },
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

export function clearHighlightFilters() {
  activeFilters.player = null;
  activeFilters.opponent = null;

  FILTER_SELECTS.forEach(({ selectId }) => {
    const select = document.getElementById(selectId);
    if (select) select.value = "";
  });
}

export async function reloadHighlights() {
  await ensureHighlightsLoaded();
  highlightsData = await loadHighlights();
  applyGalleryFilters();
}

function setFilterPanelOpen(open) {
  const panel = document.getElementById("highlights-filter-panel");
  const searchInput = document.getElementById("highlights-search");
  if (!panel || !searchInput) return;

  panel.hidden = !open;
  searchInput.setAttribute("aria-expanded", String(open));
}

function wireFilterPanel() {
  const wrap = document.getElementById("highlights-search-wrap");
  const searchInput = document.getElementById("highlights-search");
  const panel = document.getElementById("highlights-filter-panel");
  if (!wrap || !searchInput || !panel) return;

  searchInput.addEventListener("focus", () => setFilterPanelOpen(true));
  searchInput.addEventListener("click", () => setFilterPanelOpen(true));

  document.addEventListener("click", (e) => {
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

  try {
    highlightsData = await loadHighlights();
    dataLoaded = true;
  } catch {
    gallery.innerHTML =
      '<p class="placeholder-text">Could not load highlights. Run the site with a local server.</p>';
    return;
  }

  wireFilterPanel();
  renderGallery(gallery, emptyEl, searchInput?.value ?? "");

  searchInput?.addEventListener("input", applyGalleryFilters);

  syncAdminControls();
}

function matchesFilters(item, query) {
  if (activeFilters.player) {
    const playerHay = `${item.title} ${item.keywords}`.toLowerCase();
    if (!playerHay.includes(activeFilters.player.toLowerCase())) return false;
  }

  if (activeFilters.opponent && item.opponent !== activeFilters.opponent) return false;

  const q = query.toLowerCase().trim();
  if (!q) return true;

  const hay = `${item.title} ${item.keywords} ${item.playerNumber} ${item.gameNumber} ${item.opponent}`.toLowerCase();
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

      const opponentLine = item.opponent ? ` · vs ${escapeHtml(item.opponent)}` : "";

      return `
        <article class="highlight-card" data-id="${escapeHtml(item.id)}">
          ${deleteBtn}
          ${media}
          <div class="highlight-card-body">
            <h3>${escapeHtml(item.title)}</h3>
            <p class="highlight-meta">Player #${escapeHtml(item.playerNumber)} · Game ${escapeHtml(item.gameNumber)}${opponentLine}</p>
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
