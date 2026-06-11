import { isAdminLoggedIn } from "./admin-auth.js";
import { loadHallOfFame, saveHallOfFame } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";
import { escapeHtml } from "./home.js";

let hallOfFameData = null;
let editMode = false;

function renderHallOfFame() {
  const container = document.getElementById("hall-of-fame-content");
  if (!container || !hallOfFameData) return;

  const years = Array.isArray(hallOfFameData.years) ? hallOfFameData.years : [];
  const editable = editMode ? ' contenteditable="true"' : "";
  const intro = hallOfFameData.intro ?? "";

  if (years.length === 0 && !intro) {
    container.innerHTML = '<p class="placeholder-text">Alumni roster coming soon.</p>';
    return;
  }

  const adminBar = editMode
    ? `<div class="content-admin-bar">
        <button type="button" id="btn-save-hof" class="btn-admin">Save changes</button>
        <button type="button" id="btn-cancel-hof" class="btn-admin btn-admin-outline">Cancel</button>
      </div>`
    : "";

  container.innerHTML = `
    <p class="hof-intro"${editable}>${escapeHtml(intro)}</p>
    <div class="hof-grid">
      ${years
        .map(
          (entry) => `
        <article class="hof-card">
          <h2 class="hof-year"${editable}>${escapeHtml(entry.year ?? "")}</h2>
          <ul class="hof-members">
            ${(entry.members ?? [])
              .map((name) => `<li${editable}>${escapeHtml(name)}</li>`)
              .join("")}
          </ul>
        </article>`
        )
        .join("")}
    </div>
    ${adminBar}`;

  container.classList.toggle("content-editing", editMode);

  if (editMode) {
    document.getElementById("btn-save-hof")?.addEventListener("click", saveFromDom);
    document.getElementById("btn-cancel-hof")?.addEventListener("click", () => {
      editMode = false;
      renderHallOfFame();
    });
  }
}

async function saveFromDom() {
  if (!isAdminLoggedIn()) return;

  const container = document.getElementById("hall-of-fame-content");
  if (!container) return;

  const intro = container.querySelector(".hof-intro")?.textContent.trim() ?? "";
  const years = [...container.querySelectorAll(".hof-card")].map((card) => ({
    year: card.querySelector(".hof-year")?.textContent.trim() ?? "",
    members: [...card.querySelectorAll(".hof-members li")]
      .map((li) => li.textContent.trim())
      .filter(Boolean),
  }));

  const payload = { intro, years };

  try {
    await saveHallOfFame(payload);
    hallOfFameData = payload;
    editMode = false;
    renderHallOfFame();
  } catch (err) {
    console.error(err);
    alert("Could not save Hall of Fame. Try again.");
  }
}

function wireEditButton() {
  const btn = document.getElementById("btn-edit-hof");
  btn?.addEventListener("click", () => {
    if (!isAdminLoggedIn()) return;
    editMode = true;
    renderHallOfFame();
  });
}

export async function initHallOfFame() {
  const container = document.getElementById("hall-of-fame-content");
  if (!container) return;

  try {
    hallOfFameData = await loadHallOfFame();
  } catch {
    container.innerHTML = '<p class="placeholder-text">Could not load Hall of Fame.</p>';
    return;
  }

  renderHallOfFame();
  wireEditButton();
  syncAdminControls();
}
