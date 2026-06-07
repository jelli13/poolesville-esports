import { loadHallOfFame } from "./data-store.js";
import { escapeHtml } from "./home.js";

export async function initHallOfFame() {
  const container = document.getElementById("hall-of-fame-content");
  if (!container) return;

  try {
    const data = await loadHallOfFame();
    const years = Array.isArray(data?.years) ? data.years : [];

    if (years.length === 0) {
      container.innerHTML =
        '<p class="placeholder-text">Alumni roster coming soon.</p>';
      return;
    }

    container.innerHTML = `
      <div class="hof-grid">
        ${years
          .map(
            (entry) => `
          <article class="hof-card">
            <h2 class="hof-year">${escapeHtml(entry.year)}</h2>
            <ul class="hof-members">
              ${(entry.members ?? [])
                .map((name) => `<li>${escapeHtml(name)}</li>`)
                .join("")}
            </ul>
          </article>`
          )
          .join("")}
      </div>`;
  } catch {
    container.innerHTML =
      '<p class="placeholder-text">Could not load Hall of Fame.</p>';
  }
}
