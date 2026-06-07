import { isAdminLoggedIn } from "./admin-auth.js";
import { loadSchedule, saveSchedule, loadSiteSettings, saveSiteSettings } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";
import { escapeHtml } from "./home.js";
import { populateHomeSchedule } from "./home.js";

let scheduleRows = [];
let editMode = false;
let siteSettings = { currentWeek: "" };

function formatResultBadge(result) {
  const r = String(result).trim().toUpperCase();
  if (r === "W") return '<span class="result-badge result-badge--win">W</span>';
  if (r === "L") return '<span class="result-badge result-badge--loss">L</span>';
  if (r === "BYE") return '<span class="result-badge result-badge--bye">BYE</span>';
  if (r === "—" || r === "" || r === "TBD") {
    return '<span class="result-badge result-badge--tbd">TBD</span>';
  }
  return escapeHtml(result);
}

function formatScoreCell(score, result) {
  const s = String(score ?? "").trim();
  const r = String(result ?? "").trim().toUpperCase();
  if (!s || r === "TBD" || r === "BYE" || r === "—") {
    return '<span class="schedule-score schedule-score--empty" aria-hidden="true">—</span>';
  }
  return `<span class="schedule-score">${escapeHtml(s)}</span>`;
}

function uniqueWeeks(rows) {
  return [...new Set(rows.map((row) => String(row.week ?? "").trim()).filter(Boolean))];
}

function renderCurrentWeekControl() {
  const wrap = document.getElementById("current-week-control");
  const select = document.getElementById("current-week-select");
  if (!wrap || !select) return;

  const show = isAdminLoggedIn();
  wrap.hidden = !show;

  if (!show) return;

  const weeks = uniqueWeeks(scheduleRows);
  select.innerHTML = weeks
    .map(
      (week) =>
        `<option value="${escapeHtml(week)}"${week === siteSettings.currentWeek ? " selected" : ""}>${escapeHtml(week)}</option>`
    )
    .join("");
}

async function saveCurrentWeek(week) {
  siteSettings = { ...siteSettings, currentWeek: week };
  try {
    await saveSiteSettings(siteSettings);
    await populateHomeSchedule();
  } catch (err) {
    console.error(err);
    alert(err.message || "Could not save current week.");
  }
}

function wireCurrentWeekControl() {
  const select = document.getElementById("current-week-select");
  select?.addEventListener("change", () => {
    if (!isAdminLoggedIn()) return;
    saveCurrentWeek(select.value);
  });
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
      <td class="col-week"${editMode ? ' contenteditable="true"' : ""}>${escapeHtml(row.week ?? "")}</td>
      <td${editMode ? ' contenteditable="true"' : ""}>${escapeHtml(row.date ?? "")}</td>
      <td${editMode ? ' contenteditable="true"' : ""}>${escapeHtml(row.opponent ?? "")}</td>
      <td class="col-result"${editMode ? ' contenteditable="true"' : ""}>${
        editMode ? escapeHtml(row.result ?? "") : formatResultBadge(row.result)
      }</td>
      <td class="col-score"${editMode ? ' contenteditable="true"' : ""}>${
        editMode ? escapeHtml(row.score ?? "") : formatScoreCell(row.score, row.result)
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
      const idx = Number(btn.dataset.rowIndex);
      scheduleRows = readTableIntoRows();
      if (idx < 0 || idx >= scheduleRows.length) return;
      if (!confirm("Delete this schedule row?")) return;
      scheduleRows.splice(idx, 1);
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
      date: cells[1]?.textContent.trim() ?? "",
      opponent: cells[2]?.textContent.trim() ?? "",
      result: cells[3]?.textContent.trim() ?? "",
      score: cells[4]?.textContent.trim() ?? "",
    };
  });
}

function addScheduleRow() {
  if (!isAdminLoggedIn() || !editMode) return;
  scheduleRows = readTableIntoRows();
  scheduleRows.push({
    week: "New week",
    date: "TBD",
    opponent: "vs. TBD",
    result: "TBD",
    score: "",
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
      renderCurrentWeekControl();
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
    renderCurrentWeekControl();
  });
}

function wireAddRowButton() {
  const btn = document.getElementById("btn-add-schedule-row");
  if (!btn) return;

  btn.replaceWith(btn.cloneNode(true));
  document.getElementById("btn-add-schedule-row")?.addEventListener("click", addScheduleRow);
}

export async function initSchedule() {
  const tbody = document.getElementById("schedule-tbody");
  if (!tbody) return;

  try {
    [scheduleRows, siteSettings] = await Promise.all([
      loadSchedule(),
      loadSiteSettings().catch(() => ({ currentWeek: "" })),
    ]);
  } catch {
    tbody.innerHTML =
      '<tr><td colspan="5">Could not load schedule. Use a local server.</td></tr>';
    return;
  }

  editMode = false;
  const btn = document.getElementById("btn-edit-schedule");
  if (btn) btn.textContent = "Edit Schedule";

  renderScheduleTable();
  renderCurrentWeekControl();
  wireEditButton();
  wireAddRowButton();
  wireCurrentWeekControl();
  syncAdminControls();
  updateScheduleAdminButtons();
}
