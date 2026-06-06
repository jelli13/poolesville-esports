import { isAdminLoggedIn } from "./admin-auth.js";
import { loadPlayers, savePlayers } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";
import { escapeHtml } from "./home.js";

let players = [];
let editMode = false;

const PLACEHOLDER_COUNT = 6;

function normalizePlayersData(data) {
  if (Array.isArray(data?.players) && data.players.length) return data.players;
  return [];
}

function renderPlaceholderCards() {
  return Array.from({ length: PLACEHOLDER_COUNT }, () => `
    <!-- TODO: Replace with actual player gamertag and role -->
    <article class="player-card">
      <!-- IMAGE PLACEHOLDER: Player Avatar — TBD — swap with <img> when assets are ready -->
      <div class="img-placeholder img-placeholder--avatar" aria-hidden="true">
        <span>📷 Player Avatar — TBD</span>
      </div>
      <p class="player-gamertag-gold">—</p>
      <span class="player-role">Rocket League — Varsity</span>
    </article>`).join("");
}

function renderPlayerCard(player, index) {
  const gamertag = escapeHtml(player.gamertag || player.name || "TBD");
  const role = escapeHtml(player.role || "Rocket League — Varsity");

  if (editMode) {
    return `
      <article class="player-card player-card--editing" data-player-index="${index}">
        <label class="player-edit-field">
          <span>Gamertag</span>
          <input type="text" class="player-edit-gamertag" value="${gamertag}" />
        </label>
        <label class="player-edit-field">
          <span>Role</span>
          <input type="text" class="player-edit-role" value="${role}" />
        </label>
        <button type="button" class="player-remove-btn" data-player-index="${index}">Remove</button>
      </article>`;
  }

  return `
    <article class="player-card">
      <!-- IMAGE PLACEHOLDER: Player Avatar — ${gamertag} — swap with <img> when assets are ready -->
      <div class="img-placeholder img-placeholder--avatar" aria-hidden="true">
        <span>📷 Player Avatar — ${gamertag}</span>
      </div>
      <p class="player-gamertag-gold">${gamertag}</p>
      <span class="player-role">${role}</span>
    </article>`;
}

function renderPlayers() {
  const content = document.getElementById("players-content");
  if (!content) return;

  const cards =
    players.length > 0
      ? players.map((player, index) => renderPlayerCard(player, index)).join("")
      : renderPlaceholderCards();

  content.innerHTML = `
    <div class="player-grid">
      ${cards}
    </div>
    ${
      editMode
        ? '<button type="button" id="btn-add-player" class="btn-admin btn-admin-outline">Add player</button>'
        : ""
    }`;

  content.classList.toggle("players-editing", editMode);

  content.querySelectorAll(".player-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.playerIndex);
      readPlayersFromDom();
      players.splice(index, 1);
      renderPlayers();
    });
  });

  document.getElementById("btn-add-player")?.addEventListener("click", () => {
    readPlayersFromDom();
    players.push({ name: "NewPlayer", gamertag: "NewPlayer", role: "Rocket League — Varsity" });
    renderPlayers();
  });
}

function readPlayersFromDom() {
  const content = document.getElementById("players-content");
  if (!content || !editMode) return players;

  players = [...content.querySelectorAll(".player-card--editing")].map((card) => {
    const gamertag = card.querySelector(".player-edit-gamertag")?.value.trim() ?? "";
    return {
      name: gamertag,
      gamertag,
      role: card.querySelector(".player-edit-role")?.value.trim() ?? "Rocket League — Varsity",
    };
  });

  return players;
}

export async function initPlayers() {
  const editBtn = document.getElementById("btn-edit-players");
  const content = document.getElementById("players-content");
  if (!content) return;

  try {
    const data = await loadPlayers();
    players = normalizePlayersData(data);
  } catch (err) {
    console.error(err);
    players = [];
  }

  renderPlayers();
  syncAdminControls();

  editBtn?.addEventListener("click", () => {
    if (!isAdminLoggedIn()) return;

    if (!editMode) {
      editMode = true;
      editBtn.textContent = "Save players";
      renderPlayers();
      return;
    }

    readPlayersFromDom();
    savePlayers({ players });
    editMode = false;
    editBtn.textContent = "Edit players";
    renderPlayers();
  });
}
