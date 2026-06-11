import { isAdminLoggedIn } from "./admin-auth.js";
import { loadPlayers, savePlayers } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";
import { escapeHtml } from "./home.js";

let players = [];
let editMode = false;
let editingIndex = null;

function playerId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function playerAvatarMarkup() {
  return `<div class="player-avatar" aria-hidden="true">
    <svg class="player-avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  </div>`;
}

function renderPlayerCard(player, index) {
  const gamertag = escapeHtml(player.name || "Player");
  const realName = escapeHtml(player.realName || "");
  const bio = escapeHtml(player.bio || "");
  const avatar = playerAvatarMarkup();

  const nameBlock = `
    <p class="player-name">${gamertag}</p>
    ${realName ? `<p class="player-real-name">${realName}</p>` : ""}`;

  if (editMode) {
    return `
      <article class="player-card player-card--editing" data-player-index="${index}">
        ${avatar}
        ${nameBlock}
        ${bio ? `<p class="player-bio">${bio}</p>` : ""}
        <div class="player-edit-actions">
          <button type="button" class="btn-admin btn-admin-outline player-edit-btn" data-edit-index="${index}">Edit</button>
          <button type="button" class="player-remove-btn" data-player-index="${index}">Remove</button>
        </div>
      </article>`;
  }

  return `
    <article class="player-card">
      ${avatar}
      ${nameBlock}
      ${bio ? `<p class="player-bio">${bio}</p>` : ""}
    </article>`;
}

function renderPlayers() {
  const content = document.getElementById("players-content");
  if (!content) return;

  const gridContent =
    players.length > 0
      ? `<div class="player-grid">${players.map((player, index) => renderPlayerCard(player, index)).join("")}</div>`
      : "";

  const emptyMessage =
    players.length === 0
      ? '<p class="players-empty-note placeholder-text">Roster coming soon — check back after tryouts.</p>'
      : "";

  const adminBar = editMode
    ? `<div class="players-admin-bar">
        ${emptyMessage}
        <div class="players-admin-actions">
          <button type="button" id="btn-add-player" class="btn-admin btn-admin-outline">Add player</button>
          <button type="button" id="btn-save-players" class="btn-admin">Save players</button>
        </div>
      </div>`
    : "";

  content.innerHTML = `${gridContent}${adminBar}`;
  content.classList.toggle("players-editing", editMode);

  content.querySelectorAll(".player-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.playerIndex);
      if (!confirm("Remove this player from the roster?")) return;
      players.splice(index, 1);
      renderPlayers();
    });
  });

  content.querySelectorAll(".player-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openPlayerModal(Number(btn.dataset.editIndex));
    });
  });

  document.getElementById("btn-add-player")?.addEventListener("click", () => {
    openPlayerModal(null);
  });

  document.getElementById("btn-save-players")?.addEventListener("click", async () => {
    try {
      await savePlayers({ players });
      editMode = false;
      const editBtn = document.getElementById("btn-edit-players");
      if (editBtn) editBtn.textContent = "Edit players";
      renderPlayers();
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not save players.");
    }
  });
}

function openPlayerModal(index) {
  const modal = document.getElementById("player-modal");
  const form = document.getElementById("player-form");
  if (!modal || !form) return;

  editingIndex = index;
  const player = index != null ? players[index] : { name: "", realName: "", bio: "" };

  form.querySelector("#player-name").value = player.name ?? "";
  form.querySelector("#player-real-name").value = player.realName ?? "";
  form.querySelector("#player-bio").value = player.bio ?? "";

  document.getElementById("player-modal-title").textContent =
    index != null ? "Edit player" : "Add player";

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function closePlayerModal() {
  const modal = document.getElementById("player-modal");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  editingIndex = null;
}

function wirePlayerModal() {
  const modal = document.getElementById("player-modal");
  const form = document.getElementById("player-form");
  if (!modal || !form) return;

  modal.querySelector(".modal-backdrop")?.addEventListener("click", closePlayerModal);
  document.getElementById("btn-cancel-player")?.addEventListener("click", closePlayerModal);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const existing = editingIndex != null ? players[editingIndex] : null;
    const entry = {
      id: existing?.id ?? playerId(),
      name: form.querySelector("#player-name").value.trim(),
      realName: form.querySelector("#player-real-name").value.trim(),
      bio: form.querySelector("#player-bio").value.trim(),
    };

    if (!entry.name) {
      alert("Gamertag is required.");
      return;
    }

    if (editingIndex != null) {
      players[editingIndex] = entry;
    } else {
      players.push(entry);
    }

    closePlayerModal();
    renderPlayers();
  });
}

export async function initPlayers() {
  const editBtn = document.getElementById("btn-edit-players");
  const content = document.getElementById("players-content");
  if (!content) return;

  wirePlayerModal();

  try {
    const data = await loadPlayers();
    players = Array.isArray(data?.players) ? data.players : [];
  } catch (err) {
    console.error(err);
    players = [];
  }

  renderPlayers();
  syncAdminControls();

  editBtn?.replaceWith(editBtn.cloneNode(true));
  document.getElementById("btn-edit-players")?.addEventListener("click", () => {
    if (!isAdminLoggedIn()) return;

    const btn = document.getElementById("btn-edit-players");
    editMode = !editMode;
    btn.textContent = editMode ? "Cancel editing" : "Edit players";
    if (!editMode) renderPlayers();
    else renderPlayers();
  });
}
