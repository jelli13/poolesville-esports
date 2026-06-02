import {
  formatLockoutRemaining,
  getLockoutRemainingMs,
  isLockedOut,
  recordFailedAttempt,
  setAdminSession,
  validateCredentials,
} from "./admin-auth.js";

const form = document.getElementById("login-form");
const lockoutView = document.getElementById("login-lockout");
const formView = document.getElementById("login-form-wrap");
const errorEl = document.getElementById("login-error");
const lockoutTimerEl = document.getElementById("lockout-timer");
const dialog = document.getElementById("lockout-dialog");

let timerId = null;

function showLockoutView() {
  if (formView) formView.hidden = true;
  if (lockoutView) lockoutView.hidden = false;
  if (form) form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));

  function tick() {
    const remaining = getLockoutRemainingMs();
    if (remaining <= 0) {
      clearInterval(timerId);
      window.location.reload();
      return;
    }
    if (lockoutTimerEl) {
      lockoutTimerEl.textContent = formatLockoutRemaining(remaining);
    }
  }

  tick();
  timerId = setInterval(tick, 1000);
}

function showFormView() {
  if (lockoutView) lockoutView.hidden = true;
  if (formView) formView.hidden = false;
}

function init() {
  if (isLockedOut()) {
    showLockoutView();
    return;
  }

  showFormView();
}

form?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (isLockedOut()) {
    showLockoutView();
    return;
  }

  const username = form.username?.value ?? "";
  const password = form.password?.value ?? "";

  if (validateCredentials(username, password)) {
    if (errorEl) errorEl.hidden = true;
    setAdminSession();
    window.location.replace("index.html");
    return;
  }

  const result = recordFailedAttempt();

  if (errorEl) {
    errorEl.hidden = false;
    errorEl.textContent = "Wrong username or password";
  }

  form.password?.focus();
  form.password?.select();

  if (result.justLocked) {
    dialog?.showModal();
    showLockoutView();
  }
});

dialog?.addEventListener("close", () => {
  if (isLockedOut()) showLockoutView();
});

init();
