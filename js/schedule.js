import { isAdminLoggedIn } from "./admin-auth.js";
import { loadSchedule, saveSchedule, loadSiteSettings, saveSiteSettings } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";
import {
  escapeHtml,
  normalizeWeekLabel,
  parseSiteSettings,
  populateHomeSchedule,
} from "./home.js";

let scheduleRows = [];
let editMode = false;
let siteSettings = { currentWeek: "" };
let suppressWeekSelectChange = false;

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

function formatScheduleDate(dateStr) {
  const raw = String(dateStr ?? "").trim();
  if (!raw) return "—";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatOpponentLabel(opponent) {
  const raw = String(opponent ?? "").trim();
  if (!raw) return "—";
  return raw.replace(/^vs\.\s*/i, "vs ");
}

function renderCurrentWeekControl() {
  const wrap = document.getElementById("current-week-control");
  const select = document.getElementById("current-week-select");
  const saveBtn = document.getElementById("btn-save-current-week");
  if (!wrap || !select) return;

  const show = isAdminLoggedIn();
  wrap.hidden = !show;
  if (saveBtn) saveBtn.hidden = !show;

  if (!show) return;

  let weeks = uniqueWeeks(scheduleRows);
  const saved = String(siteSettings.currentWeek ?? "").trim();
  if (saved && !weeks.includes(saved)) {
    weeks = [saved, ...weeks];
  }

  suppressWeekSelectChange = true;
  select.innerHTML = weeks
    .map(
      (week) =>
        `<option value="${escapeHtml(week)}"${week === saved ? " selected" : ""}>${escapeHtml(week)}</option>`
    )
    .join("");
  if (saved && weeks.includes(saved)) {
    select.value = saved;
  }
  suppressWeekSelectChange = false;
  updateCurrentWeekSaveUi();
}

function setCurrentWeekSaveStatus(message, { isError = false } = {}) {
  const status = document.getElementById("current-week-save-status");
  if (!status) return;
  if (!message) {
    status.hidden = true;
    status.textContent = "";
    status.classList.remove("is-error");
    return;
  }
  status.hidden = false;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function isCurrentWeekDirty() {
  const select = document.getElementById("current-week-select");
  if (!select) return false;
  return select.value !== String(siteSettings.currentWeek ?? "").trim();
}

function updateCurrentWeekSaveUi() {
  const btn = document.getElementById("btn-save-current-week");
  if (!btn) return;

  if (!isAdminLoggedIn()) {
    btn.hidden = true;
    return;
  }

  btn.hidden = false;
  const dirty = isCurrentWeekDirty();
  btn.disabled = !dirty;
  btn.textContent = dirty ? "Save current week" : "Saved";
  if (!dirty) {
    setCurrentWeekSaveStatus("");
  }
}

async function saveCurrentWeek(week) {
  if (!isAdminLoggedIn()) return;

  siteSettings = { ...siteSettings, currentWeek: week };
  const btn = document.getElementById("btn-save-current-week");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving…";
  }

  try {
    await saveSiteSettings(siteSettings);
    await populateHomeSchedule(siteSettings);
    renderScheduleTable();
    updateCurrentWeekSaveUi();
    setCurrentWeekSaveStatus("Saved — home page updated.");
  } catch (err) {
    console.error(err);
    updateCurrentWeekSaveUi();
    setCurrentWeekSaveStatus(err.message || "Could not save current week.", { isError: true });
  }
}

function wireCurrentWeekControl() {
  const select = document.getElementById("current-week-select");
  const btn = document.getElementById("btn-save-current-week");

  select?.addEventListener("change", () => {
    if (suppressWeekSelectChange) return;
    updateCurrentWeekSaveUi();
  });

  btn?.addEventListener("click", () => {
    if (!isAdminLoggedIn() || !select) return;
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

  const currentWeekLabel = normalizeWeekLabel(siteSettings.currentWeek);

  tbody.innerHTML = scheduleRows
    .map(
      (row, index) => `
    <tr data-row-index="${index}"${
      currentWeekLabel && normalizeWeekLabel(row.week) === currentWeekLabel
        ? ' class="is-current-week"'
        : ""
    }>
      <td class="col-week"${editMode ? ' contenteditable="true"' : ""}>${escapeHtml(row.week ?? "")}</td>
      <td class="col-date"${editMode ? ' contenteditable="true"' : ""}>${
        editMode ? escapeHtml(row.date ?? "") : escapeHtml(formatScheduleDate(row.date))
      }</td>
      <td class="col-opponent"${editMode ? ' contenteditable="true"' : ""}>${
        editMode ? escapeHtml(row.opponent ?? "") : escapeHtml(formatOpponentLabel(row.opponent))
      }</td>
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
      loadSiteSettings().then(parseSiteSettings).catch(() => ({ currentWeek: "" })),
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

  document.addEventListener("phs-admin-sync", () => {
    renderCurrentWeekControl();
  });
}
