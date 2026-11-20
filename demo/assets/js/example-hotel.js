/**
 * Beispiel-Website "Hotel Seeblick" (demo/example-hotel.html): Anfrageformular.
 * - Schnellsuche im Hero (GET ?anreise=...&abreise=...&gaeste=...) und die
 *   "Anfragen"-Links der Zimmerkarten (?zimmer=...) füllen das Formular vor.
 * - Datumsregeln: Anreise frühestens heute, Abreise nach der Anreise
 *   (setCustomValidity - die Fehlermeldung erscheint im nativen Validierungs-UI und
 *   zusätzlich als Text unter dem Feld).
 * - Absenden: keine echte Übertragung (Demo) - Bestätigung per ncss.notify().
 * Ohne JavaScript bleibt es ein normales Formular mit nativer Pflichtfeld-Prüfung.
 */
(function () {
  "use strict";

  var form = document.getElementById("anfrage-form");
  if (!form) return;

  function iso(date) {
    var local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  function addDays(value, days) {
    var d = new Date(value + "T12:00:00");
    d.setDate(d.getDate() + days);
    return iso(d);
  }

  var arrival = form.elements.anreise;
  var departure = form.elements.abreise;
  var today = iso(new Date());
  arrival.min = today;
  departure.min = addDays(today, 1);

  /* Vorbelegung aus der URL */
  var params = new URLSearchParams(window.location.search);
  [["anreise", arrival], ["abreise", departure], ["zimmer", form.elements.zimmer], ["erwachsene", form.elements.erwachsene]].forEach(function (pair) {
    var value = params.get(pair[0]);
    if (value && pair[1]) {
      if (pair[1].tagName === "SELECT" && !Array.prototype.some.call(pair[1].options, function (o) { return o.value === value; })) return;
      pair[1].value = value;
    }
  });
  var quick = document.getElementById("schnellanfrage");
  if (quick) {
    quick.elements.anreise.min = today;
    quick.elements.abreise.min = addDays(today, 1);
    quick.elements.anreise.addEventListener("change", function () {
      if (quick.elements.anreise.value) quick.elements.abreise.min = addDays(quick.elements.anreise.value, 1);
    });
  }

  function setError(input, message) {
    input.setCustomValidity(message);
    var hint = document.getElementById(input.id + "-error");
    if (hint) {
      hint.textContent = message;
      hint.hidden = !message;
    }
  }

  function checkDates() {
    if (arrival.value) departure.min = addDays(arrival.value, 1);
    if (arrival.value && arrival.value < today) {
      setError(arrival, "Die Anreise kann nicht in der Vergangenheit liegen.");
    } else {
      setError(arrival, "");
    }
    if (arrival.value && departure.value && departure.value <= arrival.value) {
      setError(departure, "Die Abreise muss nach der Anreise liegen.");
    } else {
      setError(departure, "");
    }
    var nights = document.getElementById("anfrage-naechte");
    if (nights) {
      if (arrival.value && departure.value && departure.value > arrival.value) {
        var n = Math.round((new Date(departure.value) - new Date(arrival.value)) / 86400000);
        nights.textContent = n === 1 ? "1 Nacht" : n + " Nächte";
      } else {
        nights.textContent = "";
      }
    }
  }
  arrival.addEventListener("change", checkDates);
  departure.addEventListener("change", checkDates);
  checkDates();

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    checkDates();
    if (!form.reportValidity()) return;
    var name = form.elements.name.value.trim();
    if (window.ncss && typeof window.ncss.notify === "function") {
      window.ncss.notify("Wir melden uns innerhalb von 24 Stunden mit einem persönlichen Angebot bei Ihnen.", {
        title: "Danke, " + name + "!",
        status: "success",
        timeout: 8000
      });
    }
    form.reset();
    checkDates();
  });
})();
