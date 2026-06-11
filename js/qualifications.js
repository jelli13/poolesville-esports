import { isAdminLoggedIn } from "./admin-auth.js";
import { loadQualifications, saveQualifications } from "./data-store.js";
import { syncAdminControls } from "./admin-controls.js";
import { escapeHtml } from "./home.js";

let qualificationsData = null;
let editMode = false;

function renderQualifications() {
  const block = document.getElementById("qualifications-block");
  if (!block || !qualificationsData) return;

  const { heading, intro, items, ctaText, applyLabel, applyUrl } = qualificationsData;
  const editable = editMode ? ' contenteditable="true"' : "";

  const listItems = (items ?? [])
    .map(
      (text) =>
        `<li><span class="qual-check" aria-hidden="true">✓</span><span class="qual-text"${editable}>${escapeHtml(text)}</span></li>`
    )
    .join("");

  const applyField = editMode
    ? `<label class="qualifications-apply-field">
        <span class="qualifications-apply-label">Apply form URL</span>
        <input type="url" id="qualifications-apply-url" class="qualifications-apply-input" value="${escapeHtml(applyUrl ?? "")}" />
      </label>`
    : "";

  const adminBar = editMode
    ? `<div class="content-admin-bar">
        <button type="button" id="btn-save-qualifications" class="btn-admin">Save changes</button>
        <button type="button" id="btn-cancel-qualifications" class="btn-admin btn-admin-outline">Cancel</button>
      </div>`
    : "";

  const applyLink = editMode
    ? `<span class="btn btn-primary qualifications-apply-link" contenteditable="true">${escapeHtml(applyLabel ?? "Apply")}</span>`
    : `<a class="btn btn-primary qualifications-apply-link" href="${escapeHtml(applyUrl ?? "#")}" target="_blank" rel="noopener noreferrer">${escapeHtml(applyLabel ?? "Apply")}</a>`;

  block.innerHTML = `
    <h2 class="qualifications-heading"${editable}>${escapeHtml(heading ?? "")}</h2>
    <p class="qualifications-intro"${editable}>${escapeHtml(intro ?? "")}</p>
    <ul class="qualifications-list">${listItems}</ul>
    <div class="qualifications-cta">
      <p class="qualifications-cta-text"${editable}>${escapeHtml(ctaText ?? "")}</p>
      ${applyField}
      ${applyLink}
    </div>
    ${adminBar}`;

  block.classList.toggle("content-editing", editMode);

  if (editMode) {
    document.getElementById("btn-save-qualifications")?.addEventListener("click", saveFromDom);
    document.getElementById("btn-cancel-qualifications")?.addEventListener("click", () => {
      editMode = false;
      renderQualifications();
    });
  }
}

function readText(selector, root) {
  return root.querySelector(selector)?.textContent.trim() ?? "";
}

async function saveFromDom() {
  if (!isAdminLoggedIn()) return;

  const block = document.getElementById("qualifications-block");
  if (!block) return;

  const items = [...block.querySelectorAll(".qual-text")]
    .map((el) => el.textContent.trim())
    .filter(Boolean);

  const payload = {
    heading: readText(".qualifications-heading", block),
    intro: readText(".qualifications-intro", block),
    items,
    ctaText: readText(".qualifications-cta-text", block),
    applyLabel: block.querySelector(".qualifications-apply-link")?.textContent.trim() || qualificationsData.applyLabel || "Apply Now →",
    applyUrl: document.getElementById("qualifications-apply-url")?.value.trim() ?? qualificationsData.applyUrl ?? "",
  };

  try {
    await saveQualifications(payload);
    qualificationsData = payload;
    editMode = false;
    renderQualifications();
  } catch (err) {
    console.error(err);
    alert("Could not save qualifications. Try again.");
  }
}

function wireEditButton() {
  const btn = document.getElementById("btn-edit-qualifications");
  btn?.addEventListener("click", () => {
    if (!isAdminLoggedIn()) return;
    editMode = true;
    renderQualifications();
  });
}

export async function initQualifications() {
  const block = document.getElementById("qualifications-block");
  if (!block) return;

  try {
    qualificationsData = await loadQualifications();
  } catch {
    block.innerHTML = '<p class="placeholder-text">Could not load qualifications.</p>';
    return;
  }

  renderQualifications();
  wireEditButton();
  syncAdminControls();
}
