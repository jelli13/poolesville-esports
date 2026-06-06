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

  const discord = document.getElementById("contact-discord");
  const youtube = document.getElementById("contact-youtube");
  const footerDiscord = document.getElementById("footer-discord");
  const footerYoutube = document.getElementById("footer-youtube");
  const footerEmail = document.getElementById("footer-email");
  const footerPhs = document.getElementById("footer-phs");

  if (links.discord && discord) discord.href = links.discord;
  if (links.youtube && youtube) youtube.href = links.youtube;
  if (links.discord && footerDiscord) footerDiscord.href = links.discord;
  if (links.youtube && footerYoutube) footerYoutube.href = links.youtube;
  if (links.email && footerEmail) footerEmail.href = links.email;
  if (links.phs && footerPhs) footerPhs.href = links.phs;
}

function interestFormEmbedUrl(viewformUrl) {
  const url = viewformUrl.trim();
  if (url.includes("embedded=true")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}embedded=true`;
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
        String(row.result).trim() === "—" &&
        !String(row.week).toLowerCase().includes("bye") &&
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
        <td>${escapeHtml(row.week)}</td>
        <td>${escapeHtml(row.opponent)}</td>
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
  await populateHomeSchedule();
}
