import { isAdminLoggedIn } from "./admin-auth.js";
import { loadHighlights, saveHighlights } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";

let highlightsData = [];
let dataLoaded = false;

const activeFilters = {
  playerNumber: null,
  gameNumber: null,
  opponent: null,
};

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

export function clearHighlightFilters() {
  activeFilters.playerNumber = null;
  activeFilters.gameNumber = null;
  activeFilters.opponent = null;
  document.querySelectorAll(".filter-bubble.is-active").forEach((b) => {
    b.classList.remove("is-active");
  });
}

export async function reloadHighlights() {
  await ensureHighlightsLoaded();
  highlightsData = await loadHighlights();

  const gallery = document.getElementById("highlights-gallery");
  const bubblesEl = document.getElementById("filter-bubbles");
  const searchInput = document.getElementById("highlights-search");
  const emptyEl = document.getElementById("highlights-empty");

  if (bubblesEl) renderFilterBubbles(bubblesEl);
  if (gallery) renderGallery(gallery, emptyEl, searchInput?.value ?? "");
}

export async function initHighlights() {
  const gallery = document.getElementById("highlights-gallery");
  const bubblesEl = document.getElementById("filter-bubbles");
  const searchInput = document.getElementById("highlights-search");
  const emptyEl = document.getElementById("highlights-empty");

  if (!gallery || !bubblesEl) return;

  try {
    highlightsData = await loadHighlights();
    dataLoaded = true;
  } catch {
    gallery.innerHTML =
      '<p class="placeholder-text">Could not load highlights. Run the site with a local server.</p>';
    return;
  }

  renderFilterBubbles(bubblesEl);
  renderGallery(gallery, emptyEl, searchInput?.value ?? "");

  searchInput?.addEventListener("input", () => {
    renderGallery(gallery, emptyEl, searchInput.value);
  });

  syncAdminControls();
}

function renderFilterBubbles(container) {
  const groups = [
    { key: "playerNumber", label: "Player", prefix: "Player #" },
    { key: "gameNumber", label: "Game", prefix: "Game " },
    { key: "opponent", label: "Opponent", prefix: "" },
  ];

  container.innerHTML = groups
    .map((group) => {
      const values = [...new Set(highlightsData.map((h) => h[group.key]).filter(Boolean))].sort();
      if (!values.length) return "";

      const chips = values
        .map((val) => {
          const display = group.prefix ? `${group.prefix}${val}` : val;
          return `<button type="button" class="filter-bubble" data-filter-key="${group.key}" data-filter-value="${escapeHtml(val)}">${escapeHtml(display)}</button>`;
        })
        .join("");

      return `<div class="filter-group"><span class="filter-group-label">${group.label}</span>${chips}</div>`;
    })
    .join("");

  container.querySelectorAll(".filter-bubble").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.filterKey;
      const value = btn.dataset.filterValue;

      if (activeFilters[key] === value) {
        activeFilters[key] = null;
        btn.classList.remove("is-active");
      } else {
        container.querySelectorAll(`[data-filter-key="${key}"]`).forEach((b) => b.classList.remove("is-active"));
        activeFilters[key] = value;
        btn.classList.add("is-active");
      }

      const searchInput = document.getElementById("highlights-search");
      const gallery = document.getElementById("highlights-gallery");
      const emptyEl = document.getElementById("highlights-empty");
      renderGallery(gallery, emptyEl, searchInput?.value ?? "");
    });
  });
}

function matchesFilters(item, query) {
  if (activeFilters.playerNumber && item.playerNumber !== activeFilters.playerNumber) return false;
  if (activeFilters.gameNumber && item.gameNumber !== activeFilters.gameNumber) return false;
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
