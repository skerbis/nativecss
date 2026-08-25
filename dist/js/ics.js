/**
 * ncss - ICS-Parser (iCalendar, RFC 5545). Reine Datenfunktion, kein DOM-Zugriff -
 * eigenständig nutzbar, wird von events.js für data-ics="..." konsumiert. Kein Vendor/
 * keine Abhängigkeit (kein npm-Paket wie ical.js) - passt zu "kein Build-Schritt,
 * selbst gehostet, kein Wildwuchs" und deckt bewusst nur ab, was ein Termin-Widget
 * wirklich braucht, nicht die volle RFC-5545-Fläche.
 *
 * Abgedeckt: VEVENT (UID, SUMMARY, DTSTART, DTEND, LOCATION, DESCRIPTION, URL), Zeilen-
 * Unfolding (fortgesetzte Zeilen beginnen mit Leerzeichen/Tab), Wert-Escaping (\\n, \\,,
 * \\;, \\\\), ganztägige Termine (VALUE=DATE), UTC-Zeiten ("Z"-Suffix). RRULE-Teilmenge:
 * FREQ=DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL, COUNT, UNTIL, BYDAY (nur einfache
 * Wochentags-Liste, kein Ordinal-Präfix wie "2MO"), EXDATE.
 *
 * NICHT abgedeckt (bewusste Grenze, siehe Doku): TZID-Zeitzonenkonvertierung (Zeiten
 * ohne "Z"-Suffix werden als lokale Wanduhrzeit übernommen, keine Konvertierung),
 * BYMONTHDAY/BYSETPOS/BYWEEKNO, verschachtelte RECURRENCE-ID-Ausnahmen (nur EXDATE).
 * Deckt die weit überwiegende Mehrheit realer Kalender-Exports (Google/Outlook/Apple)
 * für einfache und regelmäßig wiederkehrende Termine ab.
 */
(function (global) {
  "use strict";

  var MAX_OCCURRENCES_PER_RULE = 366;
  var WEEKDAY_INDEX = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  function unfold(text) {
    return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  }

  function unescapeValue(value) {
    return value
      .replace(/\\n/gi, "\n")
      .replace(/\\,/g, ",")
      .replace(/\\;/g, ";")
      .replace(/\\\\/g, "\\");
  }

  function parseLine(line) {
    var colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      return null;
    }
    var head = line.slice(0, colonIndex);
    var value = line.slice(colonIndex + 1);
    var parts = head.split(";");
    var name = parts[0].toUpperCase();
    var params = {};
    for (var i = 1; i < parts.length; i++) {
      var eq = parts[i].indexOf("=");
      if (eq !== -1) {
        params[parts[i].slice(0, eq).toUpperCase()] = parts[i].slice(eq + 1);
      }
    }
    return { name: name, params: params, value: value };
  }

  function parseDate(value, params) {
    var isDate = params.VALUE === "DATE" || /^\d{8}$/.test(value);
    if (isDate) {
      var y = +value.slice(0, 4);
      var mo = +value.slice(4, 6) - 1;
      var d = +value.slice(6, 8);
      return { date: new Date(y, mo, d), allDay: true };
    }
    var utc = /Z$/.test(value);
    var m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.exec(value);
    if (!m) {
      return null;
    }
    var year = +m[1], month = +m[2] - 1, day = +m[3], hh = +m[4], mm = +m[5], ss = +m[6];
    var dt = utc
      ? new Date(Date.UTC(year, month, day, hh, mm, ss))
      : new Date(year, month, day, hh, mm, ss);
    return { date: dt, allDay: false };
  }

  function parseRRule(value) {
    var rule = {};
    var pairs = value.split(";");
    for (var i = 0; i < pairs.length; i++) {
      var eq = pairs[i].indexOf("=");
      if (eq === -1) continue;
      rule[pairs[i].slice(0, eq).toUpperCase()] = pairs[i].slice(eq + 1);
    }
    return rule;
  }

  function addInterval(date, freq, interval) {
    var next = new Date(date.getTime());
    if (freq === "DAILY") {
      next.setDate(next.getDate() + interval);
    } else if (freq === "WEEKLY") {
      next.setDate(next.getDate() + 7 * interval);
    } else if (freq === "MONTHLY") {
      next.setMonth(next.getMonth() + interval);
    } else if (freq === "YEARLY") {
      next.setFullYear(next.getFullYear() + interval);
    } else {
      return null;
    }
    return next;
  }

  /* WEEKLY+BYDAY läuft Woche für Woche (nicht Tag für Tag) - eine Woche ist die
     natürliche Schrittweite von RRULE INTERVAL bei FREQ=WEEKLY, unabhängig davon, wie
     viele BYDAY-Wochentage pro Woche einschlagen. Tag-für-Tag-Stepping (erster Anlauf)
     bräuchte eine Sonderbehandlung für INTERVAL>1 mitten in der Iteration - Woche-für-
     Woche vermeidet das strukturell. */
  function expandWeeklyByDay(start, rule, interval, byDay, untilDate) {
    var occurrences = [];
    var weekStart = new Date(start.getTime());
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    var weekIndex = 0;

    while (occurrences.length < MAX_OCCURRENCES_PER_RULE && weekIndex < MAX_OCCURRENCES_PER_RULE) {
      var thisWeekStart = new Date(weekStart.getTime());
      thisWeekStart.setDate(thisWeekStart.getDate() + weekIndex * 7 * interval);
      if (untilDate && thisWeekStart.getTime() > untilDate.getTime()) break;

      for (var d = 0; d < byDay.length; d++) {
        var occ = new Date(thisWeekStart.getTime());
        occ.setDate(occ.getDate() + byDay[d]);
        occ.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
        if (occ.getTime() < start.getTime()) continue;
        if (untilDate && occ.getTime() > untilDate.getTime()) continue;
        occurrences.push(occ);
      }
      weekIndex++;
    }

    occurrences.sort(function (a, b) {
      return a.getTime() - b.getTime();
    });
    return occurrences;
  }

  function expandRecurrence(start, durationMs, rule, exdates, windowEnd) {
    var freq = rule.FREQ;
    if (!freq) {
      return [];
    }
    var interval = rule.INTERVAL ? parseInt(rule.INTERVAL, 10) : 1;
    var count = rule.COUNT ? parseInt(rule.COUNT, 10) : null;
    var until = rule.UNTIL ? parseDate(rule.UNTIL, {}) : null;
    var untilDate = until ? until.date : null;
    var hasBound = count !== null || untilDate !== null;
    var byDay = null;
    if (rule.BYDAY) {
      byDay = rule.BYDAY
        .split(",")
        .map(function (token) {
          return WEEKDAY_INDEX[token.replace(/^[+-]?\d+/, "")];
        })
        .filter(function (d) {
          return d !== undefined;
        });
    }

    var candidates;
    if (freq === "WEEKLY" && byDay && byDay.length) {
      candidates = expandWeeklyByDay(start, rule, interval, byDay, untilDate);
      if (!hasBound && windowEnd) {
        candidates = candidates.filter(function (d) {
          return d.getTime() <= windowEnd.getTime();
        });
      }
      if (count !== null) {
        candidates = candidates.slice(0, count);
      }
    } else {
      candidates = [];
      var cursor = new Date(start.getTime());
      while (candidates.length < MAX_OCCURRENCES_PER_RULE) {
        if (untilDate && cursor.getTime() > untilDate.getTime()) break;
        if (count !== null && candidates.length >= count) break;
        if (!hasBound && windowEnd && cursor.getTime() > windowEnd.getTime()) break;
        candidates.push(new Date(cursor.getTime()));
        var next = addInterval(cursor, freq, interval);
        if (!next) break;
        cursor = next;
      }
    }

    var filtered = candidates.filter(function (occStart) {
      var key = occStart.toISOString().slice(0, 16);
      return exdates.indexOf(key) === -1;
    });

    return filtered.map(function (occStart) {
      return { start: occStart, end: durationMs !== null ? new Date(occStart.getTime() + durationMs) : null };
    });
  }

  function parse(icsText, options) {
    options = options || {};
    var windowEnd = options.windowEnd || null;
    var text = unfold(icsText);
    var lines = text.split("\n");
    var events = [];
    var current = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line) continue;
      if (line === "BEGIN:VEVENT") {
        current = { exdates: [] };
        continue;
      }
      if (line === "END:VEVENT") {
        if (current) events.push(current);
        current = null;
        continue;
      }
      if (!current) continue;

      var field = parseLine(line);
      if (!field) continue;
      var value = unescapeValue(field.value);

      if (field.name === "UID") {
        current.uid = value;
      } else if (field.name === "SUMMARY") {
        current.title = value;
      } else if (field.name === "LOCATION") {
        current.location = value;
      } else if (field.name === "DESCRIPTION") {
        current.description = value;
      } else if (field.name === "URL") {
        current.url = value;
      } else if (field.name === "DTSTART") {
        current.dtstart = parseDate(field.value, field.params);
      } else if (field.name === "DTEND") {
        current.dtend = parseDate(field.value, field.params);
      } else if (field.name === "RRULE") {
        current.rrule = parseRRule(value);
      } else if (field.name === "EXDATE") {
        value.split(",").forEach(function (v) {
          var parsed = parseDate(v.trim(), field.params);
          if (parsed) current.exdates.push(parsed.date.toISOString().slice(0, 16));
        });
      }
    }

    var normalized = [];
    events.forEach(function (raw, index) {
      if (!raw.dtstart) return;
      var start = raw.dtstart.date;
      var allDay = raw.dtstart.allDay;
      var end = raw.dtend ? raw.dtend.date : null;
      var durationMs = end ? end.getTime() - start.getTime() : null;
      var baseId = raw.uid || "ics-" + index;

      if (raw.rrule) {
        var occs = expandRecurrence(start, durationMs, raw.rrule, raw.exdates, windowEnd);
        occs.forEach(function (occ, occIndex) {
          normalized.push({
            id: baseId + "-" + occIndex,
            title: raw.title || "",
            start: occ.start,
            end: occ.end,
            allDay: allDay,
            location: raw.location || null,
            description: raw.description || null,
            url: raw.url || null
          });
        });
      } else {
        normalized.push({
          id: baseId,
          title: raw.title || "",
          start: start,
          end: end,
          allDay: allDay,
          location: raw.location || null,
          description: raw.description || null,
          url: raw.url || null
        });
      }
    });

    normalized.sort(function (a, b) {
      return a.start.getTime() - b.start.getTime();
    });

    return normalized;
  }

  global.NcssICS = { parse: parse };
})(window);
