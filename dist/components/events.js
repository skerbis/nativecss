/**
 * ncss - Events-Widget: EIN Lade-/Render-Motor für vier Ansichten (Kalender-Monatsraster,
 * Kalender-Liste/Agenda, Termin-Liste, Einzeltermin) statt vier getrennter Komponenten -
 * dieselbe Datenquelle (JSON ODER ICS, siehe ics.js), derselbe normalisierte Termin-
 * Datentyp, nur andere Darstellung. Reine Erweiterung, kein Ersatz für iframe-Einbettung -
 * für Fälle, in denen Termine als ECHTES natives HTML im Dokument stehen sollen (durchsuch-
 * bar, per CSS themebar, kein Cross-Origin/Höhen-Problem wie bei iframes).
 *
 * Markup (opt-in, ein <div> pro Widget-Instanz):
 *   <div class="ncss-events" data-view="month" data-src="events.json"></div>
 *   <div class="ncss-events" data-view="agenda" data-ics="kalender.ics"></div>
 *   <div class="ncss-events" data-view="list" data-src="events.json" data-limit="6"></div>
 *   <div class="ncss-events" data-view="single" data-src="events.json" data-event-id="evt-3"></div>
 *
 * data-src: JSON-Array, jedes Element {id?, title, start, end?, allDay?, location?,
 *   description?, url?} - start/end als ISO-8601-String ("2026-09-01" für ganztägig,
 *   "2026-09-01T09:00" für Uhrzeit, ohne Zeitzonen-Suffix = lokale Wanduhrzeit).
 * data-ics: .ics-Datei (siehe ics.js für den unterstützten RRULE-Umfang).
 * data-limit: max. Anzahl Termine in agenda/list (Default: kein Limit).
 * data-month: Start-Monat für die Monatsansicht, "YYYY-MM" (Default: aktueller Monat).
 * data-window-months: wie viele Monate voraus eine unbegrenzte ICS-RRULE (ohne COUNT/
 *   UNTIL) expandiert wird (Default: 18).
 *
 * Reine Vanilla-JS-Erweiterung, kein Framework, kein Build-Schritt - Rendering nutzt
 * ausschließlich bereits vorhandene ncss-Komponenten (.ncss-card, .ncss-modal,
 * .ncss-badge) statt eigener Parallel-Optik.
 */
(function () {
  "use strict";

  var WEEKDAY_NAMES = {
    de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  };
  var MONTH_NAMES = {
    de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  };

  function locale() {
    var lang = document.documentElement.getAttribute("lang") || "de";
    return lang.slice(0, 2) === "en" ? "en" : "de";
  }

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function parseJsonDate(value) {
    if (!value) return null;
    var allDay = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (allDay) {
      var parts = value.split("-");
      return { date: new Date(+parts[0], +parts[1] - 1, +parts[2]), allDay: true };
    }
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : { date: d, allDay: false };
  }

  function normalizeJson(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var raw = list[i];
      var start = parseJsonDate(raw.start);
      if (!start) continue;
      var end = raw.end ? parseJsonDate(raw.end) : null;
      out.push({
        id: raw.id || "json-" + i,
        title: raw.title || "",
        start: start.date,
        end: end ? end.date : null,
        allDay: raw.allDay !== undefined ? !!raw.allDay : start.allDay,
        location: raw.location || null,
        description: raw.description || null,
        url: raw.url || null
      });
    }
    out.sort(function (a, b) {
      return a.start.getTime() - b.start.getTime();
    });
    return out;
  }

  function fetchEvents(el, callback) {
    var windowMonths = parseInt(el.getAttribute("data-window-months") || "18", 10);
    var windowEnd = new Date();
    windowEnd.setMonth(windowEnd.getMonth() + windowMonths);

    var src = el.getAttribute("data-src");
    var ics = el.getAttribute("data-ics");
    var url = src || ics;
    if (!url) {
      callback([]);
      return;
    }

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return src ? res.json() : res.text();
      })
      .then(function (data) {
        if (src) {
          callback(normalizeJson(data));
        } else if (window.NcssICS) {
          callback(window.NcssICS.parse(data, { windowEnd: windowEnd }));
        } else {
          callback([]);
        }
      })
      .catch(function (err) {
        renderError(el, err);
      });
  }

  function renderError(el, err) {
    el.innerHTML = '<p class="ncss-events-empty">' + (locale() === "de" ? "Termine konnten nicht geladen werden." : "Could not load events.") + "</p>";
    if (window.console) {
      window.console.error("[ncss-events]", err);
    }
  }

  function fmtDate(date, allDay) {
    var lang = locale();
    var opts = allDay
      ? { day: "numeric", month: "short", year: "numeric" }
      : { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };
    return date.toLocaleDateString(lang === "de" ? "de-DE" : "en-US", opts);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  /* --- Agenda-/Listen-Baustein: ein Termin-Eintrag mit Tages-/Monats-Badge ------------- */
  function eventDateBadgeHtml(ev) {
    var lang = locale();
    var day = ev.start.getDate();
    var month = MONTH_NAMES[lang][ev.start.getMonth()].slice(0, 3);
    return (
      '<div class="ncss-event-date"><span class="ncss-event-date-day">' +
      day +
      '</span><span class="ncss-event-date-month">' +
      month +
      "</span></div>"
    );
  }

  function eventMetaHtml(ev) {
    var html = "";
    if (ev.location) {
      html += '<p class="ncss-text-sm ncss-text-muted">' + escapeHtml(ev.location) + "</p>";
    }
    if (ev.description) {
      html += "<p>" + escapeHtml(ev.description) + "</p>";
    }
    if (ev.url) {
      html += '<a class="ncss-btn ncss-btn--secondary" href="' + escapeHtml(ev.url) + '">Details</a>';
    }
    return html;
  }

  /* --- View: agenda (Kalender-Liste) --------------------------------------------------- */
  function renderAgenda(el, events) {
    var lang = locale();
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var upcoming = events.filter(function (ev) {
      return (ev.end || ev.start).getTime() >= now.getTime();
    });
    var limit = parseInt(el.getAttribute("data-limit") || "0", 10);
    if (limit > 0) upcoming = upcoming.slice(0, limit);

    if (!upcoming.length) {
      el.innerHTML = '<p class="ncss-events-empty">' + (lang === "de" ? "Keine anstehenden Termine." : "No upcoming events.") + "</p>";
      return;
    }

    var groups = [];
    var lastKey = null;
    upcoming.forEach(function (ev) {
      var key = ev.start.getFullYear() + "-" + ev.start.getMonth();
      if (key !== lastKey) {
        groups.push({ key: key, label: MONTH_NAMES[lang][ev.start.getMonth()] + " " + ev.start.getFullYear(), items: [] });
        lastKey = key;
      }
      groups[groups.length - 1].items.push(ev);
    });

    var html = '<div class="ncss-agenda">';
    groups.forEach(function (group) {
      html += '<h3 class="ncss-agenda-group-title">' + escapeHtml(group.label) + "</h3>";
      html += '<ul class="ncss-agenda-list">';
      group.items.forEach(function (ev) {
        html +=
          '<li class="ncss-agenda-item">' +
          eventDateBadgeHtml(ev) +
          '<div class="ncss-agenda-body"><p class="ncss-agenda-title">' +
          escapeHtml(ev.title) +
          "</p>" +
          eventMetaHtml(ev) +
          "</div></li>";
      });
      html += "</ul>";
    });
    html += "</div>";
    el.innerHTML = html;
  }

  /* --- View: list (Termin-Karten-Raster) ------------------------------------------------ */
  function renderList(el, events) {
    var lang = locale();
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var upcoming = events.filter(function (ev) {
      return (ev.end || ev.start).getTime() >= now.getTime();
    });
    var limit = parseInt(el.getAttribute("data-limit") || "0", 10);
    if (limit > 0) upcoming = upcoming.slice(0, limit);

    if (!upcoming.length) {
      el.innerHTML = '<p class="ncss-events-empty">' + (lang === "de" ? "Keine anstehenden Termine." : "No upcoming events.") + "</p>";
      return;
    }

    var html = '<div class="ncss-grid" style="--ncss-grid-min: 16rem;">';
    upcoming.forEach(function (ev) {
      html +=
        '<article class="ncss-card"><div class="ncss-card-header ncss-cluster">' +
        eventDateBadgeHtml(ev) +
        '<h3 class="ncss-event-title">' +
        escapeHtml(ev.title) +
        "</h3></div>" +
        '<div class="ncss-card-body">' +
        eventMetaHtml(ev) +
        "</div></article>";
    });
    html += "</div>";
    el.innerHTML = html;
  }

  /* --- View: single (ein hervorgehobener Termin) ----------------------------------------- */
  function renderSingle(el, events) {
    var lang = locale();
    var eventId = el.getAttribute("data-event-id");
    var chosen = null;

    if (eventId) {
      for (var i = 0; i < events.length; i++) {
        if (events[i].id === eventId) {
          chosen = events[i];
          break;
        }
      }
    } else {
      var now = new Date();
      for (var j = 0; j < events.length; j++) {
        if ((events[j].end || events[j].start).getTime() >= now.getTime()) {
          chosen = events[j];
          break;
        }
      }
    }

    if (!chosen) {
      el.innerHTML = '<p class="ncss-events-empty">' + (lang === "de" ? "Kein Termin gefunden." : "No matching event.") + "</p>";
      return;
    }

    el.innerHTML =
      '<article class="ncss-card ncss-event-featured"><div class="ncss-card-header ncss-cluster">' +
      eventDateBadgeHtml(chosen) +
      '<div><h3 class="ncss-event-title">' +
      escapeHtml(chosen.title) +
      '</h3><p class="ncss-text-sm ncss-text-muted">' +
      fmtDate(chosen.start, chosen.allDay) +
      "</p></div></div>" +
      '<div class="ncss-card-body">' +
      eventMetaHtml(chosen) +
      "</div></article>";
  }

  /* --- View: month (Kalender-Monatsraster) ----------------------------------------------- */
  function renderMonth(el, events) {
    var lang = locale();
    var monthAttr = el.getAttribute("data-month");
    var current;
    if (monthAttr && /^\d{4}-\d{2}$/.test(monthAttr)) {
      var mParts = monthAttr.split("-");
      current = new Date(+mParts[0], +mParts[1] - 1, 1);
    } else {
      var now = new Date();
      current = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    var dialog = document.createElement("dialog");
    dialog.className = "ncss-modal";
    el.appendChild(dialog);

    function eventsOnDay(day) {
      return events.filter(function (ev) {
        return ev.start.getFullYear() === day.getFullYear() && ev.start.getMonth() === day.getMonth() && ev.start.getDate() === day.getDate();
      });
    }

    function openDay(day, dayEvents) {
      var html =
        '<button type="button" class="ncss-dialog-close" aria-label="' +
        (lang === "de" ? "Schließen" : "Close") +
        '"><span class="ncss-icon ncss-icon-close" aria-hidden="true"></span></button>' +
        '<div class="ncss-modal-header"><h3>' +
        day.toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { day: "numeric", month: "long", year: "numeric" }) +
        "</h3></div>" +
        '<div class="ncss-modal-body ncss-stack">';
      dayEvents.forEach(function (ev) {
        html += '<div><p class="ncss-agenda-title">' + escapeHtml(ev.title) + "</p>" + eventMetaHtml(ev) + "</div>";
      });
      html += "</div>";
      dialog.innerHTML = html;
      dialog.querySelector(".ncss-dialog-close").addEventListener("click", function () {
        dialog.close();
      });
      dialog.showModal();
    }

    function draw() {
      var year = current.getFullYear();
      var month = current.getMonth();
      var firstOfMonth = new Date(year, month, 1);
      var startOffset = firstOfMonth.getDay(); // 0=Sun
      var gridStart = new Date(year, month, 1 - startOffset);
      var today = new Date();
      today.setHours(0, 0, 0, 0);

      var html =
        '<div class="ncss-cal"><div class="ncss-cal-header">' +
        '<button type="button" class="ncss-btn ncss-btn--secondary" data-cal-nav="-1" aria-label="' +
        (lang === "de" ? "Vorheriger Monat" : "Previous month") +
        '">&lsaquo;</button>' +
        "<h3>" +
        MONTH_NAMES[lang][month] +
        " " +
        year +
        "</h3>" +
        '<button type="button" class="ncss-btn ncss-btn--secondary" data-cal-nav="1" aria-label="' +
        (lang === "de" ? "Nächster Monat" : "Next month") +
        '">&rsaquo;</button>' +
        '</div><table class="ncss-cal-grid"><thead><tr>';
      WEEKDAY_NAMES[lang].forEach(function (name) {
        html += '<th scope="col" class="ncss-cal-weekday">' + name + "</th>";
      });
      html += "</tr></thead><tbody>";

      var cursor = new Date(gridStart.getTime());
      for (var week = 0; week < 6; week++) {
        html += "<tr>";
        for (var day = 0; day < 7; day++) {
          var isOtherMonth = cursor.getMonth() !== month;
          var isToday = cursor.getTime() === today.getTime();
          var dayEvents = eventsOnDay(cursor);
          var classes = "ncss-cal-day";
          if (isOtherMonth) classes += " ncss-cal-day--other-month";
          if (isToday) classes += " ncss-cal-day--today";

          html += '<td class="' + classes + '">';
          if (dayEvents.length) {
            html +=
              '<button type="button" class="ncss-cal-day-btn" data-cal-day="' +
              cursor.getFullYear() +
              "-" +
              pad2(cursor.getMonth() + 1) +
              "-" +
              pad2(cursor.getDate()) +
              '">';
          } else {
            html += '<span class="ncss-cal-day-btn ncss-cal-day-btn--empty">';
          }
          html += '<span class="ncss-cal-day-number">' + cursor.getDate() + "</span>";
          if (dayEvents.length) {
            var shown = dayEvents.slice(0, 2);
            shown.forEach(function (ev) {
              html += '<span class="ncss-cal-day-dot" title="' + escapeHtml(ev.title) + '"></span>';
            });
            if (dayEvents.length > shown.length) {
              html += '<span class="ncss-cal-day-more">+' + (dayEvents.length - shown.length) + "</span>";
            }
          }
          html += dayEvents.length ? "</button>" : "</span>";
          html += "</td>";

          cursor.setDate(cursor.getDate() + 1);
        }
        html += "</tr>";
        if (cursor.getMonth() !== month && week >= 3) break;
      }
      html += "</tbody></table></div>";

      var wrapper = el.querySelector(".ncss-cal-wrapper");
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "ncss-cal-wrapper";
        el.insertBefore(wrapper, dialog);
      }
      wrapper.innerHTML = html;

      wrapper.querySelectorAll("[data-cal-nav]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          current.setMonth(current.getMonth() + parseInt(btn.getAttribute("data-cal-nav"), 10));
          draw();
        });
      });
      wrapper.querySelectorAll("[data-cal-day]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var parts = btn.getAttribute("data-cal-day").split("-");
          var day = new Date(+parts[0], +parts[1] - 1, +parts[2]);
          openDay(day, eventsOnDay(day));
        });
      });
    }

    draw();
  }

  function init(el) {
    var view = el.getAttribute("data-view") || "list";
    fetchEvents(el, function (events) {
      if (view === "month") {
        renderMonth(el, events);
      } else if (view === "agenda") {
        renderAgenda(el, events);
      } else if (view === "single") {
        renderSingle(el, events);
      } else {
        renderList(el, events);
      }
      el.setAttribute("data-loaded", "true");
    });
  }

  var widgets = document.querySelectorAll(".ncss-events");
  for (var i = 0; i < widgets.length; i++) {
    init(widgets[i]);
  }
})();
