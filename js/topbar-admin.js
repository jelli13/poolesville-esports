import { isAdminLoggedIn } from "./admin-auth.js";

export function renderAdminGate() {
  const el = document.getElementById("admin-gate");
  if (!el) return;

  if (isAdminLoggedIn()) {
    el.innerHTML =
      '<span class="admin-gate-status">Logged in as administrator</span>';
  } else {
    el.innerHTML =
      '<a href="login.html" class="admin-gate-link">Are you an administrator?</a>';
  }
}
