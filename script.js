// ZENOC website interactions
// 1) Deploy the included Google Apps Script as a Web App.
// 2) Paste its /exec URL into GOOGLE_SCRIPT_URL below.
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyiqFHtUG3pmdr7RDhp3ASfn7i45FzQZgtGkHFl7ioRVZn-ke0905eWV8801ggqAkkB/exec";

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.textContent = isOpen ? "×" : "☰";
    });
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "☰";
    }));
  }

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const note = document.getElementById("formNote");
    const submitButton = form.querySelector('button[type="submit"]');

    if (!GOOGLE_SCRIPT_URL.startsWith("https://script.google.com/macros/s/") ||
        GOOGLE_SCRIPT_URL.includes("PASTE_YOUR")) {
      note.textContent = "The form is not connected yet. Add your Google Apps Script Web App URL in script.js.";
      note.classList.add("form-error");
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      service: String(formData.get("service") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || "") // honeypot field
    };

    if (!payload.name || !payload.email || !payload.service || !payload.message) {
      note.textContent = "Please complete all fields before submitting.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    note.classList.remove("form-error");
    note.textContent = "Sending your enquiry...";

    try {
      // text/plain avoids a browser CORS preflight for Apps Script.
      // no-cors returns an opaque response, so this confirms the request was sent,
      // not that the spreadsheet write was independently verified.
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      form.reset();
      note.textContent = "Thank you. Your enquiry has been sent. We'll be in touch soon.";
    } catch (error) {
      note.textContent = "We couldn't send your enquiry. Please try again or email us directly.";
      note.classList.add("form-error");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Submit enquiry <span>↗</span>';
    }
  });
});
