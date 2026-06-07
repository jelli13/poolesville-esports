import { initAdminAuth } from "./admin-auth.js";
import { syncAdminControls } from "./admin-controls.js";
import { renderAdminGate } from "./topbar-admin.js";
import { initHome, warmHeroImages } from "./home.js";

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
const pages = document.querySelectorAll(".page");
const varsityPanels = document.querySelectorAll(".varsity-panel");
const aboutPanels = document.querySelectorAll(".about-panel");
const navGroupVarsity = document.getElementById("nav-group-varsity");
const navGroupAbout = document.getElementById("nav-group-about");
const navGroupEvents = document.getElementById("nav-group-events");

const mobileNavQuery = window.matchMedia("(max-width: 900px)");

let highlightsReady = false;
let scheduleReady = false;
let playersReady = false;
let hallOfFameReady = false;
let eventsReady = false;

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

  syncAdminControls();

  if (tabId === "schedule" && !scheduleReady) {
    scheduleReady = true;
    const { initSchedule } = await import("./schedule.js");
    initSchedule();
  }

  if (tabId === "highlights" && !highlightsReady) {
    const { initHighlights } = await import("./highlights.js?v=3");
    await initHighlights();
    highlightsReady = true;
  }

  if (tabId === "players" && !playersReady) {
    playersReady = true;
    const { initPlayers } = await import("./players.js?v=4");
    initPlayers();
  }

  if (tabId === "hall-of-fame" && !hallOfFameReady) {
    hallOfFameReady = true;
    const { initHallOfFame } = await import("./hall-of-fame.js");
    initHallOfFame();
  }
}

function showAboutTab(tabId) {
  aboutPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `about-${tabId}`);
  });
}

async function showEventsView({ eventTab = "list" } = {}) {
  if (!eventsReady) {
    eventsReady = true;
    const { initEvents, showEventById, showEventsList } = await import("./events.js?v=3");
    await initEvents();
    if (eventTab && eventTab !== "list") {
      showEventById(eventTab);
    } else {
      showEventsList();
    }
    return;
  }

  const { showEventById, showEventsList } = await import("./events.js?v=3");
  if (eventTab && eventTab !== "list") {
    showEventById(eventTab);
  } else {
    showEventsList();
  }
}

function syncNavGroups(pageId) {
  navGroupVarsity?.classList.toggle("is-expanded", pageId === "varsity");
  navGroupAbout?.classList.toggle("is-expanded", pageId === "about");
  navGroupEvents?.classList.toggle("is-expanded", pageId === "events");
}

function syncSubtabNav(pageId, { varsityTab, aboutTab, eventTab } = {}) {
  varsityTabButtons.forEach((btn) => {
    btn.classList.toggle(
      "is-active",
      pageId === "varsity" && btn.dataset.varsityTab === varsityTab
    );
  });

  aboutTabButtons.forEach((btn) => {
    btn.classList.toggle(
      "is-active",
      pageId === "about" && btn.dataset.aboutTab === aboutTab
    );
  });

  const detailOpen = document.getElementById("event-detail")?.classList.contains("is-active");

  document.querySelectorAll("[data-event-tab]").forEach((btn) => {
    const tab = btn.dataset.eventTab;
    let active = false;
    if (pageId === "events") {
      if (detailOpen && eventTab && eventTab !== "list") {
        active = tab === eventTab;
      } else if (!detailOpen) {
        active = tab === "list";
      }
    }
    btn.classList.toggle("is-active", active);
  });
}

async function showPage(pageId, options = {}) {
  const {
    varsityTab = "schedule",
    aboutTab = "what-is-esports",
    eventTab = "list",
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
  if (pageId === "events") await showEventsView({ eventTab });

  syncSubtabNav(pageId, { varsityTab, aboutTab, eventTab });

  if (pageId === "home") warmHeroImages();

  syncAdminControls();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

mainNavButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const pageId = btn.dataset.page;
    const options = {};
    if (pageId === "varsity") options.varsityTab = "schedule";
    if (pageId === "about") options.aboutTab = "what-is-esports";
    if (pageId === "events") options.eventTab = "list";
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

document.getElementById("events-nav-menu")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-event-tab]");
  if (!btn) return;
  e.preventDefault();
  showPage("events", { eventTab: btn.dataset.eventTab });
});

document.querySelectorAll("[data-go-varsity]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("varsity", { varsityTab: el.dataset.goVarsity });
  });
});

document.getElementById("full-schedule-link")?.addEventListener("click", (e) => {
  e.preventDefault();
  showPage("varsity", { varsityTab: "schedule" });
});

document.querySelectorAll("[data-page-link]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    showPage(el.dataset.pageLink);
  });
});

document.querySelectorAll("[data-go-event]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("events", { eventTab: el.dataset.goEvent });
  });
});

document.getElementById("footer-contact-link")?.addEventListener("click", (e) => {
  e.preventDefault();
  showPage("about", { aboutTab: "contact" });
});

document.getElementById("brand-home")?.addEventListener("click", (e) => {
  e.preventDefault();
  showPage("home");
});

window.addEventListener("phs:show-event", (e) => {
  syncSubtabNav("events", { eventTab: e.detail?.eventId ?? "list" });
});

window.addEventListener("phs:show-events-list", () => {
  syncSubtabNav("events", { eventTab: "list" });
});

window.addEventListener("phs:events-updated", (e) => {
  syncSubtabNav("events", { eventTab: e.detail?.eventId ?? "list" });
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

export { showPage };
