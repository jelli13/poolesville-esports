import { isAdminLoggedIn } from "./admin-auth.js";
import { loadPlayers, savePlayers } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";

let players = [];
let editMode = false;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizePlayersData(data) {
  if (Array.isArray(data?.players)) return data.players;
  if (typeof data?.text === "string" && data.text.trim()) {
    return data.text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name = "TBD", gamertag = "", role = "Player"] = line
          .split(/[·|]/)
          .map((part) => part.trim());
        return { name, gamertag, role };
      });
  }
  return [];
}

function avatarSvg() {
  return `<svg class="player-avatar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/>
  </svg>`;
}

function renderPlayerCard(player, index) {
  const name = escapeHtml(player.name || "TBD");
  const gamertag = escapeHtml(player.gamertag || "");
  const role = escapeHtml(player.role || "Player");

  if (editMode) {
    return `
      <article class="player-card player-card--editing" data-player-index="${index}">
        <label class="player-edit-field">
          <span>Name</span>
          <input type="text" class="player-edit-name" value="${name}" />
        </label>
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
      <div class="player-avatar" aria-hidden="true">${avatarSvg()}</div>
      <h3 class="player-name">${name}</h3>
      ${gamertag ? `<p class="player-gamertag">@${gamertag}</p>` : ""}
      <span class="player-role">${role}</span>
    </article>`;
}

function renderPlayers() {
  const content = document.getElementById("players-content");
  if (!content) return;

  if (!players.length && !editMode) {
    content.innerHTML =
      '<p class="players-empty">Varsity roster will be posted here once the season begins.</p>';
    content.classList.remove("players-editing");
    return;
  }

  content.innerHTML = `
    <div class="player-grid">
      ${players.map((player, index) => renderPlayerCard(player, index)).join("")}
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
    players.push({ name: "New Player", gamertag: "", role: "Player" });
    renderPlayers();
  });
}

function readPlayersFromDom() {
  const content = document.getElementById("players-content");
  if (!content || !editMode) return players;

  players = [...content.querySelectorAll(".player-card--editing")].map((card) => ({
    name: card.querySelector(".player-edit-name")?.value.trim() ?? "",
    gamertag: card.querySelector(".player-edit-gamertag")?.value.trim() ?? "",
    role: card.querySelector(".player-edit-role")?.value.trim() ?? "Player",
  }));

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
    content.innerHTML = '<p class="players-empty">Could not load player roster.</p>';
    return;
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
