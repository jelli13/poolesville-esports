import { isAdminLoggedIn } from "./admin-auth.js";

export function syncAdminControls() {
  const admin = isAdminLoggedIn();
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.hidden = !admin;
  });
  document.dispatchEvent(new CustomEvent("phs-admin-sync", { detail: { admin } }));
}
