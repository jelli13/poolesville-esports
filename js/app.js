import { initAdminAuth } from "./admin-auth.js";
import { syncAdminControls } from "./admin-controls.js";
import { renderAdminGate } from "./topbar-admin.js";

initAdminAuth();
renderAdminGate();

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const mainNavButtons = document.querySelectorAll(
  ".sidebar-nav > li > button[data-page], .nav-group > button[data-page]"
);
const varsityTabButtons = document.querySelectorAll("[data-varsity-tab]");
const clubTabButtons = document.querySelectorAll("[data-club-tab]");
const pages = document.querySelectorAll(".page");
const varsityPanels = document.querySelectorAll(".varsity-panel");
const clubPanels = document.querySelectorAll(".club-panel");
const navGroupVarsity = document.getElementById("nav-group-varsity");
const navGroupClub = document.getElementById("nav-group-club");

let highlightsReady = false;
let scheduleReady = false;

sidebarToggle?.addEventListener("click", () => {
  const collapsed = sidebar.classList.toggle("is-collapsed");
  sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  sidebarToggle.setAttribute(
    "aria-label",
    collapsed ? "Expand sidebar" : "Collapse sidebar"
  );
});

async function showVarsityTab(tabId) {
  varsityPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `varsity-${tabId}`);
  });

  varsityTabButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.varsityTab === tabId);
  });

  syncAdminControls();

  if (tabId === "schedule" && !scheduleReady) {
    scheduleReady = true;
    const { initSchedule } = await import("./schedule.js");
    initSchedule();
  }

  if (tabId === "highlights" && !highlightsReady) {
    highlightsReady = true;
    const { initHighlights } = await import("./highlights.js");
    initHighlights();
  }
}

function showClubTab(tabId) {
  clubPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `club-${tabId}`);
  });

  clubTabButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.clubTab === tabId);
  });
}

function showPage(pageId, options = {}) {
  const { varsityTab = "schedule", clubTab = "what-is-esports" } = options;

  pages.forEach((page) => {
    page.classList.toggle("is-active", page.id === `page-${pageId}`);
  });

  mainNavButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.page === pageId);
  });

  navGroupVarsity?.classList.toggle("is-expanded", pageId === "varsity");
  navGroupClub?.classList.toggle("is-expanded", pageId === "club");

  if (pageId === "varsity") showVarsityTab(varsityTab);
  if (pageId === "club") showClubTab(clubTab);

  syncAdminControls();
}

mainNavButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const pageId = btn.dataset.page;
    const options = {};
    if (pageId === "varsity") options.varsityTab = "schedule";
    if (pageId === "club") options.clubTab = "what-is-esports";
    showPage(pageId, options);
  });
});

varsityTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showPage("varsity", { varsityTab: btn.dataset.varsityTab });
  });
});

clubTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showPage("club", { clubTab: btn.dataset.clubTab });
  });
});

document.getElementById("full-schedule-link")?.addEventListener("click", (e) => {
  e.preventDefault();
  showPage("varsity", { varsityTab: "schedule" });
});

showPage("home");

// Admin UI loads after navigation is wired so a failure cannot brick the site
import("./admin-ui.js")
  .then(({ initAdminUi }) => {
    initAdminUi();
    syncAdminControls();
  })
  .catch((err) => {
    console.error("Admin UI failed to load:", err);
  });
