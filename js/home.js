import { loadSchedule, loadSiteSettings } from "./data-store.js";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wireContactLinks() {
  const { links = {}, contacts = {} } = window.PHS_SITE_CONFIG ?? {};

  const setHref = (id, url) => {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
  };

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  };

  setHref("contact-discord", links.discord);
  setHref("contact-youtube", links.youtube);
  setHref("footer-discord", links.discord);
  setHref("footer-youtube", links.youtube);
  setHref("footer-phs", links.phs);
  setHref("club-discord-link", links.discord);
  setHref("contact-page-discord", links.discord);

  setText("contact-coach-name", contacts.coachName);
  setText("contact-coach-title", contacts.coachTitle);
  setText("contact-manager-name", contacts.teamManagerName);
  setText("contact-discord-label", contacts.discordLabel);

  if (contacts.coachEmail) {
    setHref("contact-coach-email", `mailto:${contacts.coachEmail}`);
    const coachEmail = document.getElementById("contact-coach-email");
    if (coachEmail) coachEmail.textContent = contacts.coachEmail;
  }

  if (contacts.teamManagerEmail) {
    setHref("contact-manager-email", `mailto:${contacts.teamManagerEmail}`);
    const managerEmail = document.getElementById("contact-manager-email");
    if (managerEmail) managerEmail.textContent = contacts.teamManagerEmail;
  }
}

function interestFormEmbedUrl(viewformUrl) {
  const url = viewformUrl.trim();
  if (url.includes("embedded=true")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}embedded=true`;
}

function warmHeroImages() {
  document.querySelectorAll("#hero-carousel-track img").forEach((img) => {
    if (!img.src) return;
    if (img.complete && img.naturalWidth > 0) return;
    const cached = new Image();
    cached.src = img.src;
  });
}

function initHeroCarousel() {
  const track = document.getElementById("hero-carousel-track");
  if (!track) return;

  warmHeroImages();

  const slides = track.querySelectorAll(".hero-carousel-slide");
  if (slides.length < 2) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const firstClone = track.querySelector(".hero-carousel-slide")?.cloneNode(true);
  if (!firstClone) return;
  firstClone.setAttribute("aria-hidden", "true");
  track.appendChild(firstClone);

  let index = 0;
  const slideCount = track.querySelectorAll(".hero-carousel-slide").length - 1;

  const advance = () => {
    index += 1;
    track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;

    if (index !== slideCount) return;

    const reset = (event) => {
      if (event.propertyName !== "transform") return;
      track.removeEventListener("transitionend", reset);
      track.style.transition = "none";
      track.style.transform = "translate3d(0, 0, 0)";
      index = 0;
      track.offsetHeight;
      track.style.transition = "";
    };

    track.addEventListener("transitionend", reset);
  };

  window.setInterval(advance, 5000);
}

function wireJoinTeamLink() {
  const link = document.getElementById("hero-join-link");
  const url = window.PHS_SITE_CONFIG?.interestFormUrl?.trim();
  if (!link || !url) return;

  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
}

function wireInterestForm() {
  const section = document.getElementById("home-interest-section");
  const iframe = document.getElementById("interest-form-iframe");
  const url = window.PHS_SITE_CONFIG?.interestFormUrl?.trim();

  if (!section || !iframe) return;

  if (!url) {
    section.hidden = true;
    return;
  }

  iframe.src = interestFormEmbedUrl(url);
  section.hidden = false;
}

export function normalizeWeekLabel(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function parseSiteSettings(raw) {
  if (!raw || typeof raw !== "object") return { currentWeek: "" };
  if (typeof raw.currentWeek === "string") return { currentWeek: raw.currentWeek };
  if (raw.data && typeof raw.data.currentWeek === "string") {
    return { currentWeek: raw.data.currentWeek };
  }
  return { currentWeek: "" };
}

export function weekIndex(rows, currentWeek) {
  const target = normalizeWeekLabel(currentWeek);
  if (!target) return 0;
  const idx = rows.findIndex((row) => normalizeWeekLabel(row.week) === target);
  return idx >= 0 ? idx : 0;
}

export function isByeWeek(row) {
  const week = normalizeWeekLabel(row.week);
  const opponent = String(row.opponent ?? "").trim().toUpperCase();
  const result = String(row.result ?? "").trim().toUpperCase();
  return week.includes("bye") || opponent === "BYE" || result === "BYE";
}

/** Next N schedule rows on the home page, starting at the admin-selected week. */
export const HOME_SCHEDULE_ROW_LIMIT = 3;

export function homeScheduleRows(rows, currentWeek, limit = HOME_SCHEDULE_ROW_LIMIT) {
  const start = weekIndex(rows, currentWeek);
  return rows.slice(start, start + limit);
}

function formatHomeStatus(row) {
  if (isByeWeek(row)) return "BYE";
  const result = String(row.result ?? "").trim().toUpperCase();
  if (result === "TBD" || result === "—" || result === "") return "Upcoming";
  if (result === "W") return "Win";
  if (result === "L") return "Loss";
  return escapeHtml(row.result ?? "");
}

function renderHomeScheduleRows(tbody, rows) {
  tbody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td data-label="Week">${escapeHtml(row.week ?? "")}</td>
        <td data-label="Date">${escapeHtml(row.date ?? "")}</td>
        <td data-label="Opponent">${escapeHtml(row.opponent ?? "")}</td>
        <td data-label="Status">${formatHomeStatus(row)}</td>
      </tr>`
    )
    .join("");
}

export async function populateHomeSchedule(settingsOverride = null) {
  const section = document.getElementById("home-schedule-section");
  const tbody = document.getElementById("home-schedule-tbody");
  if (!section || !tbody) return;

  let rows = [];
  try {
    rows = await loadSchedule();
  } catch {
    section.hidden = true;
    return;
  }

  let settings = { currentWeek: "" };
  if (settingsOverride) {
    settings = parseSiteSettings(settingsOverride);
  } else {
    try {
      settings = parseSiteSettings(await loadSiteSettings());
    } catch {
      settings = { currentWeek: "" };
    }
  }

  const upcoming = homeScheduleRows(rows, settings.currentWeek);

  if (upcoming.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="schedule-empty-note">No schedule rows from the selected week. Pick a week under Schedule → Current week, then click Save.</td></tr>';
    section.hidden = false;
    return;
  }

  renderHomeScheduleRows(tbody, upcoming);
  section.hidden = false;
}

export async function initHome() {
  wireContactLinks();
  wireInterestForm();
  wireJoinTeamLink();
  initHeroCarousel();
  await populateHomeSchedule();
}

export { escapeHtml, warmHeroImages };
