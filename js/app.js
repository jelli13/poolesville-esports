import { initAdminAuth } from "./admin-auth.js";
import { syncAdminControls } from "./admin-controls.js";
import { renderAdminGate } from "./topbar-admin.js";
import { initHome } from "./home.js";

initAdminAuth();
renderAdminGate();
initHome();

document.body.classList.remove("nav-open");

const siteNav = document.getElementById("site-nav");
const navToggle = document.getElementById("nav-toggle");
const navBackdrop = document.getElementById("nav-backdrop");
const mainNavButtons = document.querySelectorAll(
  ".site-nav > ul > li > button[data-page], .nav-dropdown > button[data-page]"
);
const aboutTabButtons = document.querySelectorAll("[data-about-tab]");
const varsityTabButtons = document.querySelectorAll("[data-varsity-tab]");
const clubTabButtons = document.querySelectorAll("[data-club-tab]");
const eventsTabButtons = document.querySelectorAll("[data-events-tab]");
const pages = document.querySelectorAll(".page");
const varsityPanels = document.querySelectorAll(".varsity-panel");
const aboutPanels = document.querySelectorAll(".about-panel");
const clubPanels = document.querySelectorAll(".club-panel");
const eventsPanels = document.querySelectorAll(".event-panel");
const navGroupVarsity = document.getElementById("nav-group-varsity");
const navGroupAbout = document.getElementById("nav-group-about");
const navGroupClub = document.getElementById("nav-group-club");
const navGroupEvents = document.getElementById("nav-group-events");

const mobileNavQuery = window.matchMedia("(max-width: 900px)");

let highlightsReady = false;
let scheduleReady = false;
let playersReady = false;

function isMobileNav() {
  return mobileNavQuery.matches;
}

function closeMobileNav() {
  siteNav?.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
  navToggle?.setAttribute("aria-label", "Open menu");
  document.body.classList.remove("nav-open");
  navBackdrop?.setAttribute("hidden", "");
}

function openMobileNav() {
  siteNav?.classList.add("is-open");
  navToggle?.setAttribute("aria-expanded", "true");
  navToggle?.setAttribute("aria-label", "Close menu");
  document.body.classList.add("nav-open");
  navBackdrop?.removeAttribute("hidden");
}

function closeAllDropdowns() {
  document.querySelectorAll(".nav-dropdown.is-open").forEach((el) => {
    el.classList.remove("is-open");
  });
}

function initDesktopDropdownHover() {
  document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
    dropdown.addEventListener("mouseenter", () => {
      if (isMobileNav()) return;
      closeAllDropdowns();
      dropdown.classList.add("is-open");
    });

    dropdown.addEventListener("mouseleave", () => {
      if (isMobileNav()) return;
      dropdown.classList.remove("is-open");
    });
  });
}

initDesktopDropdownHover();

navToggle?.addEventListener("click", () => {
  if (siteNav?.classList.contains("is-open")) {
    closeMobileNav();
    closeAllDropdowns();
  } else {
    openMobileNav();
  }
});

navBackdrop?.addEventListener("click", () => {
  closeMobileNav();
  closeAllDropdowns();
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest(".nav-dropdown") || event.target.closest(".nav-toggle")) return;
  closeAllDropdowns();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMobileNav();
    closeAllDropdowns();
  }
});

mobileNavQuery.addEventListener("change", () => {
  closeMobileNav();
  closeAllDropdowns();
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

  if (tabId === "players" && !playersReady) {
    playersReady = true;
    const { initPlayers } = await import("./players.js");
    initPlayers();
  }
}

function showAboutTab(tabId) {
  aboutPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `about-${tabId}`);
  });

  aboutTabButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.aboutTab === tabId);
  });
}

function showClubTab(tabId) {
  clubPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `club-${tabId}`);
  });

  clubTabButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.clubTab === tabId);
  });
}

function showEventsTab(tabId) {
  eventsPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `events-${tabId}`);
  });

  eventsTabButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.eventsTab === tabId);
  });
}

function syncNavGroups(pageId) {
  navGroupVarsity?.classList.toggle("is-expanded", pageId === "varsity");
  navGroupAbout?.classList.toggle("is-expanded", pageId === "about");
  navGroupClub?.classList.toggle("is-expanded", pageId === "club");
  navGroupEvents?.classList.toggle("is-expanded", pageId === "events");
}

function showPage(pageId, options = {}) {
  const {
    varsityTab = "schedule",
    aboutTab = "what-is-esports",
    clubTab = "what-is-esports",
    eventsTab = "nba-2k-tournament",
  } = options;

  pages.forEach((page) => {
    page.classList.toggle("is-active", page.id === `page-${pageId}`);
  });

  mainNavButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.page === pageId);
  });

  syncNavGroups(pageId);
  closeMobileNav();
  closeAllDropdowns();

  if (pageId === "varsity") showVarsityTab(varsityTab);
  if (pageId === "about") showAboutTab(aboutTab);
  if (pageId === "club") showClubTab(clubTab);
  if (pageId === "events") showEventsTab(eventsTab);

  syncAdminControls();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

mainNavButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const pageId = btn.dataset.page;
    const options = {};
    if (pageId === "varsity") options.varsityTab = "schedule";
    if (pageId === "about") options.aboutTab = "what-is-esports";
    if (pageId === "events") options.eventsTab = "nba-2k-tournament";
    showPage(pageId, options);
  });
});

varsityTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showPage("varsity", { varsityTab: btn.dataset.varsityTab });
  });
});

aboutTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showPage("about", { aboutTab: btn.dataset.aboutTab });
  });
});

clubTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showPage("club", { clubTab: btn.dataset.clubTab });
  });
});

eventsTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showPage("events", { eventsTab: btn.dataset.eventsTab });
  });
});

document.getElementById("full-schedule-link")?.addEventListener("click", (e) => {
  e.preventDefault();
  showPage("varsity", { varsityTab: "schedule" });
});

document.querySelectorAll("[data-go-varsity]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("varsity", { varsityTab: el.dataset.goVarsity });
  });
});

document.getElementById("brand-home")?.addEventListener("click", (e) => {
  e.preventDefault();
  showPage("home");
});

showPage("home");

import("./admin-ui.js")
  .then(({ initAdminUi }) => {
    initAdminUi();
    syncAdminControls();
  })
  .catch((err) => {
    console.error("Admin UI failed to load:", err);
  });
