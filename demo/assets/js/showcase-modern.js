/**
 * Nur für den Rundgang (demo/showcase/modern.html, modern-en.html): gestapelte
 * Beispielmeldungen mit wechselnden Texten und "Alle schließen". Alles andere auf der
 * Seite läuft deklarativ über data-ncss-notify (dist/js/notification.js).
 */
(function () {
  "use strict";

  var en = (document.documentElement.getAttribute("lang") || "de").slice(0, 2) === "en";
  var texts = en
    ? [
        ["Room 12 is ready", "Check-in from 2 pm, your key is at reception."],
        ["Table booked", "Seestube restaurant, tonight 7:30 pm, 2 guests."],
        ["Rowing boat reserved", "Tomorrow 10 am at the jetty."],
        ["Spa slot confirmed", "Sauna and pool, 4 pm to 6 pm."]
      ]
    : [
        ["Zimmer 12 ist bereit", "Check-in ab 14 Uhr, Ihr Schlüssel liegt an der Rezeption."],
        ["Tisch reserviert", "Restaurant Seestube, heute 19:30 Uhr, 2 Personen."],
        ["Ruderboot reserviert", "Morgen um 10 Uhr am Steg."],
        ["Spa-Termin bestätigt", "Sauna und Hallenbad, 16 bis 18 Uhr."]
      ];
  var n = 0;

  document.addEventListener("click", function (event) {
    if (!window.ncss || !window.ncss.notify) {
      return;
    }
    if (event.target.closest("[data-demo-stack]")) {
      var t = texts[n++ % texts.length];
      window.ncss.notify({ title: t[0], message: t[1], status: n % 4 === 0 ? "brand" : "success", position: "bottom-end", stack: true, timeout: 8000 });
    } else if (event.target.closest("[data-demo-close-all]")) {
      window.ncss.notifyCloseAll();
    }
  });
})();
