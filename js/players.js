import { isAdminLoggedIn } from "./admin-auth.js";
import { loadPlayers, savePlayers } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";

let playersText = "";
let editMode = false;

function renderPlayers() {
  const content = document.getElementById("players-content");
  if (!content) return;

  content.textContent = playersText;
  content.contentEditable = editMode ? "true" : "false";
  content.classList.toggle("players-editing", editMode);
}

function readPlayersFromDom() {
  const content = document.getElementById("players-content");
  return content?.textContent ?? playersText;
}

export async function initPlayers() {
  const editBtn = document.getElementById("btn-edit-players");
  const content = document.getElementById("players-content");
  if (!content) return;

  try {
    const data = await loadPlayers();
    playersText = data.text ?? "";
  } catch (err) {
    console.error(err);
    playersText = "Could not load player list.";
  }

  renderPlayers();
  syncAdminControls();

  editBtn?.addEventListener("click", () => {
    if (!isAdminLoggedIn()) return;

    if (!editMode) {
      editMode = true;
      editBtn.textContent = "Save players";
      renderPlayers();
      content.focus();
      return;
    }

    playersText = readPlayersFromDom();
    savePlayers({ text: playersText });
    editMode = false;
    editBtn.textContent = "Edit players";
    renderPlayers();
  });
}
