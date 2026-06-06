import { isAdminLoggedIn } from "./admin-auth.js";

export function renderAdminGate() {
  const footer = document.getElementById("admin-gate-footer");
  if (!footer) return;

  if (isAdminLoggedIn()) {
    footer.innerHTML = '<span class="footer-staff-status">Admin · signed in</span>';
    return;
  }

  footer.innerHTML = '<a href="login.html" class="footer-staff-link">Admin Login</a>';
}
