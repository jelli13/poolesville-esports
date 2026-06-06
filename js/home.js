import { loadSchedule } from "./data-store.js";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wireContactLinks() {
  const { links = {} } = window.PHS_SITE_CONFIG ?? {};

  const setHref = (id, url) => {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
  };

  setHref("contact-discord", links.discord);
  setHref("contact-youtube", links.youtube);
  setHref("footer-discord", links.discord);
  setHref("footer-youtube", links.youtube);
  setHref("footer-phs", links.phs);
  setHref("footer-email", links.email);
  setHref("club-discord-link", links.discord);
  setHref("events-discord-link", links.discord);
}

function interestFormEmbedUrl(viewformUrl) {
  const url = viewformUrl.trim();
  if (url.includes("embedded=true")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}embedded=true`;
}

function initHeroCarousel() {
  const track = document.getElementById("hero-carousel-track");
  if (!track) return;

  const slides = track.querySelectorAll(".hero-carousel-slide");
  if (slides.length < 2) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const firstClone = slides[0].cloneNode(true);
  firstClone.setAttribute("aria-hidden", "true");
  track.appendChild(firstClone);

  let index = 0;
  const slideCount = slides.length;

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

async function populateHomeSchedule() {
  const section = document.getElementById("home-schedule-section");
  const tbody = document.getElementById("home-schedule-tbody");
  if (!section || !tbody) return;

  try {
    const rows = await loadSchedule();
    const upcoming = rows.filter(
      (row) =>
        String(row.result).trim().toUpperCase() === "TBD" &&
        !String(row.week).toLowerCase().includes("bye") &&
        String(row.opponent).trim().toUpperCase() !== "TBD" &&
        String(row.opponent).trim() !== "—"
    );

    if (upcoming.length === 0) {
      section.hidden = true;
      return;
    }

    tbody.innerHTML = upcoming
      .slice(0, 4)
      .map(
        (row) => `
      <tr>
        <td>${escapeHtml(row.date ?? row.week ?? "")}</td>
        <td>${escapeHtml(row.opponent ?? "")}</td>
        <td>Upcoming</td>
      </tr>`
      )
      .join("");

    section.hidden = false;
  } catch {
    section.hidden = true;
  }
}

export async function initHome() {
  wireContactLinks();
  wireInterestForm();
  wireJoinTeamLink();
  initHeroCarousel();
  await populateHomeSchedule();
}

export { escapeHtml };
