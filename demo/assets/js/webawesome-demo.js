// ncss - eigene Website (nicht Teil der ausgelieferten Bibliothek): Demo-Interaktionen
// nur für demo/webawesome.html - Dropdown-Auswahl-Anzeige, Toast-Auslöser.
(function () {
  var dropdown = document.querySelector("wa-dropdown");
  if (dropdown) {
    dropdown.addEventListener("wa-select", function (e) {
      document.getElementById("dropdownResult").textContent = "Ausgewählt: " + e.detail.item.value;
    });
  }

  var toastBtn = document.getElementById("toastBtn");
  if (toastBtn) {
    toastBtn.addEventListener("click", function () {
      document.getElementById("demoToast").create("Gespeichert - alles klar.", { variant: "success" });
    });
  }
})();
