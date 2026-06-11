import { isAdminLoggedIn } from "./admin-auth.js";
import { syncAdminControls } from "./admin-controls.js";
import { toEmbedUrl, toWatchUrl, fetchYoutubeTitle } from "./youtube.js";
import {
  addHighlight,
  clearHighlightFilters,
  reloadHighlights,
  updateHighlight,
} from "./highlights.js";

let addClipDialogWired = false;
let editingClipId = null;
const previewTitleCache = new Map();
let previewDebounce = null;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderClipPreview({ title, embedUrl, playerNumber, gameNumber, opponent }) {
  const preview = document.getElementById("add-clip-preview");
  if (!preview) return;

  const displayTitle = title || "YouTube video title will appear here";
  const media = embedUrl
    ? `<div class="highlight-embed"><iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(displayTitle)}" allowfullscreen></iframe></div>`
    : `<div class="highlight-embed highlight-embed--placeholder"><span>Enter a valid YouTube URL</span></div>`;

  const metaParts = [];
  if (playerNumber) metaParts.push(escapeHtml(playerNumber));
  if (gameNumber) metaParts.push(`Week ${escapeHtml(gameNumber)}`);
  if (opponent) metaParts.push(`vs ${escapeHtml(opponent)}`);
  const metaLine = metaParts.length ? metaParts.join(" · ") : "—";

  preview.innerHTML = `
    <article class="highlight-card highlight-card--preview">
      ${media}
      <div class="highlight-card-body">
        <h3>${escapeHtml(displayTitle)}</h3>
        <p class="highlight-meta">${metaLine}</p>
      </div>
    </article>`;
}

async function updatePreviewFromForm() {
  const url = document.getElementById("clip-url")?.value.trim() ?? "";
  const gameNumber = document.getElementById("clip-game")?.value.trim() ?? "";
  const playerNumber = document.getElementById("clip-player")?.value.trim() ?? "";
  const opponent = document.getElementById("clip-opponent")?.value.trim() ?? "";
  const preview = document.getElementById("add-clip-preview");
  const embedUrl = toEmbedUrl(url);

  let title = previewTitleCache.get(url) ?? null;

  if (embedUrl && !title && preview) {
    preview.innerHTML = '<p class="preview-loading">Loading video title…</p>';
    title = await fetchYoutubeTitle(url);
    if (title) previewTitleCache.set(url, title);
  }

  renderClipPreview({ title, embedUrl, playerNumber, gameNumber, opponent });
}

function resetClipModalState() {
  editingClipId = null;
  document.getElementById("add-clip-title").textContent = "Add clip";
  document.getElementById("btn-submit-clip").textContent = "Add clip";
}

function openAddClipModal() {
  const modal = document.getElementById("add-clip-modal");
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function openEditClipModal(clip) {
  if (!clip) return;

  editingClipId = clip.id;
  document.getElementById("add-clip-title").textContent = "Edit clip";
  document.getElementById("btn-submit-clip").textContent = "Save changes";

  const watchUrl = toWatchUrl(clip.embedUrl) || clip.embedUrl || "";
  document.getElementById("clip-url").value = watchUrl;
  document.getElementById("clip-game").value = clip.gameNumber ?? "";
  document.getElementById("clip-player").value = clip.playerNumber ?? "";
  document.getElementById("clip-opponent").value = clip.opponent ?? "";

  if (clip.title && watchUrl) {
    previewTitleCache.set(watchUrl, clip.title);
  }

  renderClipPreview({
    title: clip.title,
    embedUrl: clip.embedUrl,
    playerNumber: clip.playerNumber,
    gameNumber: clip.gameNumber,
    opponent: clip.opponent,
  });

  openAddClipModal();
}

function closeAddClipModal() {
  const modal = document.getElementById("add-clip-modal");
  const form = document.getElementById("add-clip-form");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  form?.reset();
  previewTitleCache.clear();
  resetClipModalState();
  renderClipPreview({});
}

function wireAddClipDialog() {
  if (addClipDialogWired) return;
  addClipDialogWired = true;

  const modal = document.getElementById("add-clip-modal");
  const openBtn = document.getElementById("btn-add-clip");
  const form = document.getElementById("add-clip-form");
  const submitBtn = document.getElementById("btn-submit-clip");
  const backdrop = modal?.querySelector(".modal-backdrop");

  openBtn?.addEventListener("click", () => {
    if (!isAdminLoggedIn()) return;
    resetClipModalState();
    form?.reset();
    previewTitleCache.clear();
    renderClipPreview({});
    openAddClipModal();
  });

  backdrop?.addEventListener("click", closeAddClipModal);

  ["clip-url", "clip-game", "clip-player", "clip-opponent"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      clearTimeout(previewDebounce);
      previewDebounce = setTimeout(updatePreviewFromForm, 400);
    });
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdminLoggedIn()) {
      alert("You must be logged in as an administrator.");
      return;
    }

    const url = document.getElementById("clip-url")?.value.trim() ?? "";
    const gameNumber = document.getElementById("clip-game")?.value.trim() ?? "";
    const playerNumber = document.getElementById("clip-player")?.value.trim() ?? "";
    const opponent = document.getElementById("clip-opponent")?.value.trim() ?? "";
    const embedUrl = toEmbedUrl(url);

    if (!embedUrl || !gameNumber || !playerNumber || !opponent) {
      alert("Please enter URL, Week #, Player, and Opponent.");
      return;
    }

    if (/^\d+$/.test(playerNumber)) {
      alert("Player must be a name, not a number.");
      return;
    }

    submitBtn.disabled = true;

    try {
      let title = previewTitleCache.get(url) ?? (await fetchYoutubeTitle(url));
      if (!title) title = "Untitled highlight";

      const clip = {
        id: editingClipId ?? `clip-${Date.now()}`,
        title,
        keywords: `${title} ${playerNumber} ${gameNumber} ${opponent}`.toLowerCase(),
        playerNumber,
        gameNumber,
        opponent,
        embedUrl,
      };

      if (editingClipId) {
        await updateHighlight(clip);
      } else {
        await addHighlight(clip);
      }

      clearHighlightFilters();
      await reloadHighlights();
      closeAddClipModal();
    } catch (err) {
      console.error(err);
      alert("Could not save clip. Try again.");
    } finally {
      submitBtn.disabled = false;
    }
  };

  submitBtn?.addEventListener("click", handleSubmit);
  form?.addEventListener("submit", handleSubmit);
}

export function initAdminUi() {
  wireAddClipDialog();
  syncAdminControls();
}

export { openEditClipModal };
