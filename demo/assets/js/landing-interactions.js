// ncss - eigene Website (nicht Teil der ausgelieferten Bibliothek): Demo-Interaktionen
// nur für demo/landing.html - Mega-Nav-Dropdown-Navigation, Preise-Umschalter
// (monatlich/jährlich), Newsletter-Formular (Demo, verschickt nichts wirklich),
// Kontakt-Dialog.
(function () {
  var moreNavDropdown = document.getElementById("moreNavDropdown");
  if (moreNavDropdown) {
    moreNavDropdown.addEventListener("wa-select", function (e) {
      window.location.href = e.detail.item.value;
    });
  }

  var billingSwitch = document.getElementById("billingSwitch");
  var pricingGrid = document.getElementById("pricingGrid");
  if (billingSwitch && pricingGrid) {
    billingSwitch.addEventListener("change", function (e) {
      pricingGrid.dataset.billing = e.target.checked ? "yearly" : "monthly";
    });
  }

  var newsletterForm = document.getElementById("newsletterForm");
  var newsletterStatus = document.getElementById("newsletterStatus");
  if (newsletterForm && newsletterStatus) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      newsletterStatus.textContent = "Danke! (Demo - es wurde nichts wirklich verschickt.)";
      newsletterForm.reset();
    });
  }

  var contactDialog = document.getElementById("contactDialog");
  var contactForm = document.getElementById("contactForm");
  var contactSubmit = document.getElementById("contactSubmit");
  if (contactDialog && contactForm && contactSubmit) {
    contactSubmit.addEventListener("click", function () {
      if (contactForm.reportValidity()) {
        contactDialog.open = false;
        contactForm.reset();
      }
    });
  }
})();
