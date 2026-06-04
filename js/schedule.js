import { isAdminLoggedIn } from "./admin-auth.js";
import { loadSchedule, saveSchedule } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";

let scheduleRows = [];
let editMode = false;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatResultCell(result) {
  const r = String(result).trim();
  if (r === "W") return '<span class="result-win">W</span>';
  if (r === "L") return '<span class="result-loss">L</span>';
  return escapeHtml(r || "—");
}

function updateScheduleAdminButtons() {
  const addRowBtn = document.getElementById("btn-add-schedule-row");
  if (!addRowBtn) return;
  addRowBtn.hidden = !(isAdminLoggedIn() && editMode);
}

function renderScheduleTable() {
  const tbody = document.getElementById("schedule-tbody");
  const actionsHeader = document.getElementById("schedule-actions-header");
  if (!tbody) return;

  if (actionsHeader) actionsHeader.hidden = !editMode;

  tbody.innerHTML = scheduleRows
    .map(
      (row, index) => `
    <tr data-row-index="${index}">
      <td class="col-week"${editMode ? ' contenteditable="true"' : ""}>${escapeHtml(row.week)}</td>
      <td${editMode ? ' contenteditable="true"' : ""}>${escapeHtml(row.opponent)}</td>
      <td class="col-result"${editMode ? ' contenteditable="true"' : ""}>${
        editMode ? escapeHtml(row.result) : formatResultCell(row.result)
      }</td>
      ${
        editMode
          ? `<td class="col-actions">
              <button type="button" class="schedule-row-delete" data-row-index="${index}" aria-label="Delete row">🗑</button>
            </td>`
          : ""
      }
    </tr>`
    )
    .join("");

  tbody.querySelectorAll(".schedule-row-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.rowIndex);
      scheduleRows = readTableIntoRows();
      if (index < 0 || index >= scheduleRows.length) return;
      if (!confirm("Delete this schedule row?")) return;
      scheduleRows.splice(index, 1);
      renderScheduleTable();
    });
  });

  const table = tbody.closest("table");
  table?.classList.toggle("schedule-editing", editMode);
  updateScheduleAdminButtons();
}

function readTableIntoRows() {
  const tbody = document.getElementById("schedule-tbody");
  if (!tbody) return scheduleRows;

  return [...tbody.querySelectorAll("tr")].map((tr) => {
    const cells = tr.querySelectorAll("td");
    return {
      week: cells[0]?.textContent.trim() ?? "",
      opponent: cells[1]?.textContent.trim() ?? "",
      result: cells[2]?.textContent.trim() ?? "",
    };
  });
}

function addScheduleRow() {
  if (!isAdminLoggedIn() || !editMode) return;
  scheduleRows = readTableIntoRows();
  scheduleRows.push({
    week: "New week (date)",
    opponent: "TBD",
    result: "—",
  });
  renderScheduleTable();
}

function wireEditButton() {
  const btn = document.getElementById("btn-edit-schedule");
  if (!btn) return;

  btn.replaceWith(btn.cloneNode(true));
  const fresh = document.getElementById("btn-edit-schedule");

  fresh?.addEventListener("click", async () => {
    if (!isAdminLoggedIn()) return;

    if (!editMode) {
      editMode = true;
      fresh.textContent = "Save Schedule";
      renderScheduleTable();
      return;
    }

    scheduleRows = readTableIntoRows();
    try {
      await saveSchedule(scheduleRows);
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not save schedule for all visitors.");
      return;
    }
    editMode = false;
    fresh.textContent = "Edit Schedule";
    renderScheduleTable();
  });
}

function wireAddRowButton() {
  const btn = document.getElementById("btn-add-schedule-row");
  if (!btn) return;

  btn.replaceWith(btn.cloneNode(true));
  document.getElementById("btn-add-schedule-row")?.addEventListener("click", () => {
    addScheduleRow();
  });
}

export async function initSchedule() {
  const tbody = document.getElementById("schedule-tbody");
  if (!tbody) return;

  try {
    scheduleRows = await loadSchedule();
  } catch {
    tbody.innerHTML =
      '<tr><td colspan="4">Could not load schedule. Use a local server.</td></tr>';
    return;
  }

  editMode = false;
  const btn = document.getElementById("btn-edit-schedule");
  if (btn) btn.textContent = "Edit Schedule";

  renderScheduleTable();
  wireEditButton();
  wireAddRowButton();
  syncAdminControls();
  updateScheduleAdminButtons();
}
