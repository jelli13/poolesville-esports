import { isAdminLoggedIn } from "./admin-auth.js";

export function renderAdminGate() {
  const footer = document.getElementById("admin-gate-footer");
  if (!footer) return;

  if (isAdminLoggedIn()) {
    footer.innerHTML = '<span class="footer-staff-status"><span class="footer-staff-status-long">Admin · signed in</span><span class="footer-staff-status-short">Admin</span></span>';
    return;
  }

  footer.innerHTML =
    '<a href="login.html" class="footer-staff-link" aria-label="Admin Login"><span class="footer-staff-link-long">Admin Login</span><span class="footer-staff-link-short">Admin</span></a>';
}
