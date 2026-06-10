import { loadEvents } from "./data-store.js";
import { escapeHtml } from "./home.js";

let events = [];

function renderBlock(block) {
  switch (block.type) {
    case "heading":
      return `<h2 class="event-block-heading">${escapeHtml(block.text ?? "")}</h2>`;
    case "text":
      return `<p class="event-block-text">${escapeHtml(block.text ?? "")}</p>`;
    case "image":
      return block.url
        ? `<figure class="event-block-image"><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt ?? "")}" loading="lazy" /></figure>`
        : "";
    case "button":
      return block.url
        ? `<div class="event-block-button-wrap"><a class="btn btn-primary event-block-button" href="${escapeHtml(block.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(block.label ?? "Learn more")} →</a></div>`
        : "";
    case "infoGrid": {
      const rows = (block.rows ?? [])
        .map(
          (row) => `
        <li class="event-detail-row">
          <span class="event-detail-label">${escapeHtml(row.label ?? "")}</span>
          <span class="event-detail-value">${escapeHtml(row.value ?? "")}</span>
        </li>`
        )
        .join("");
      return `
        <section class="event-detail-section">
          <h2 class="event-detail-heading">${escapeHtml(block.title ?? "Details")}</h2>
          <ul class="event-detail-list">${rows}</ul>
        </section>`;
    }
    case "list": {
      const items = (block.items ?? [])
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      return `
        <section class="event-detail-section event-detail-section--full">
          <h2 class="event-detail-heading">${escapeHtml(block.title ?? "Details")}</h2>
          <ul class="event-detail-rules">${items}</ul>
        </section>`;
    }
    default:
      return "";
  }
}

function renderEventDetail(event) {
  const panel = document.getElementById("event-detail");
  if (!panel || !event) return;

  const banner = event.bannerUrl
    ? `<div class="event-detail-banner"><img src="${escapeHtml(event.bannerUrl)}" alt="" width="1200" height="160" /></div>`
    : `<div class="event-detail-banner event-detail-banner--empty" aria-hidden="true"></div>`;

  const infoGrids = (event.blocks ?? []).filter((b) => b.type === "infoGrid");
  const otherBlocks = (event.blocks ?? []).filter((b) => b.type !== "infoGrid");

  const gridHtml =
    infoGrids.length > 0
      ? `<div class="event-detail-grid">${infoGrids.map((b) => renderBlock(b)).join("")}</div>`
      : "";

  const bodyHtml = otherBlocks.map((b) => renderBlock(b)).join("");

  panel.innerHTML = `
    <header class="page-header">
      <div class="page-header-inner">
        <h1 class="page-header-title">${escapeHtml(event.title)}</h1>
        <p class="page-header-breadcrumb">Events › ${escapeHtml(event.title)}</p>
      </div>
    </header>
    <div class="page-content">
      <button type="button" class="event-back-link" data-event-back>← All Events</button>
      <article class="event-detail-card">
        ${banner}
        <div class="event-detail-intro">
          ${event.subtitle ? `<p class="event-detail-subtitle">${escapeHtml(event.subtitle)}</p>` : ""}
          ${event.summary ? `<p class="event-detail-summary">${escapeHtml(event.summary)}</p>` : ""}
          ${event.status ? `<span class="event-card-status">${escapeHtml(event.status)}</span>` : ""}
        </div>
        ${gridHtml}
        ${bodyHtml}
      </article>
    </div>`;

  panel.querySelector("[data-event-back]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("phs:show-events-list"));
  });
}

function renderEventsList() {
  const grid = document.getElementById("events-grid");
  if (!grid) return;

  const cards = events
    .map(
      (event) => `
    <article class="event-card">
      ${
        event.bannerUrl
          ? `<div class="event-card-banner event-card-banner--photo"><img src="${escapeHtml(event.bannerUrl)}" alt="" width="1200" height="160" loading="lazy" /></div>`
          : `<div class="event-card-banner event-card-banner--empty" aria-hidden="true"></div>`
      }
      <div class="event-card-body">
        <h2 class="event-card-title">${escapeHtml(event.title)}</h2>
        <p class="event-card-desc">${escapeHtml(event.summary ?? "")}</p>
        ${event.status ? `<span class="event-card-status">${escapeHtml(event.status)}</span>` : ""}
        <button type="button" class="btn btn-primary" data-event-id="${escapeHtml(event.id)}">View Event →</button>
      </div>
    </article>`
    )
    .join("");

  grid.innerHTML =
    cards +
    `
    <article class="event-card event-card--coming">
      <div class="event-card-coming-inner">
        <div class="event-card-coming-copy">
          <p class="event-card-coming-eyebrow">Stay in the loop</p>
          <h2 class="event-card-coming-title">More Events Coming</h2>
          <p class="event-card-coming-desc">Check back for upcoming tournaments, scrimmages, and community gaming nights.</p>
        </div>
        <div class="event-card-coming-action">
          <span class="event-card-coming-badge">Stay Tuned</span>
          <a class="btn btn-primary event-card-coming-btn" href="#" id="events-discord-link">Join Discord for Updates →</a>
        </div>
      </div>
    </article>`;

  grid.querySelectorAll("[data-event-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("phs:show-event", { detail: { eventId: btn.dataset.eventId } })
      );
    });
  });

  const { links = {} } = window.PHS_SITE_CONFIG ?? {};
  const discordLink = grid.querySelector("#events-discord-link");
  if (discordLink && links.discord) discordLink.href = links.discord;
}

export function syncEventsNavMenu() {
  const menu = document.getElementById("events-nav-menu");
  if (!menu) return;

  menu.innerHTML = `
    <li><button type="button" data-event-tab="list">All Events</button></li>
    ${events
      .map(
        (event) =>
          `<li><button type="button" data-event-tab="${escapeHtml(event.id)}">${escapeHtml(event.navLabel || event.title)}</button></li>`
      )
      .join("")}`;
}

export async function showEventById(eventId) {
  if (events.length === 0) await bootstrapEventsNav();

  const event = events.find((e) => e.id === eventId);
  if (!event) return false;

  document.getElementById("events-list")?.classList.remove("is-active");
  document.getElementById("event-detail")?.classList.add("is-active");
  renderEventDetail(event);
  return true;
}

export function showEventsList() {
  document.getElementById("event-detail")?.classList.remove("is-active");
  document.getElementById("events-list")?.classList.add("is-active");
}

export async function bootstrapEventsNav() {
  if (events.length === 0) {
    try {
      events = await loadEvents();
    } catch {
      events = [];
    }
  }
  syncEventsNavMenu();
}

let eventsListenersWired = false;

function wireEventsListeners() {
  if (eventsListenersWired) return;
  eventsListenersWired = true;

  window.addEventListener("phs:show-event", (e) => {
    showEventById(e.detail?.eventId);
  });

  window.addEventListener("phs:show-events-list", () => {
    showEventsList();
  });
}

export async function initEvents() {
  await bootstrapEventsNav();
  renderEventsList();
  wireEventsListeners();
}
