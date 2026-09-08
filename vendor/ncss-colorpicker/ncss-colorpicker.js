/**
 * ncss Colorpicker - eigenstaendige Vanilla-JS-Komponente (kein Framework, kein Build).
 * Erzeugt einen Swatch-Button, der ein Popover mit Saettigung/Helligkeit-Flaeche,
 * Farbton-/Alpha-Schiebereglern und Hex/RGBA/HSL-Eingabefeldern oeffnet, plus einem
 * Reset-Button auf einen mitgegebenen Ausgangswert.
 *
 * Usage:
 *   NcssColorPicker.create({
 *     value: '#154a86',            // Startwert (hex, rgb(a), hsl(a) - alles erlaubt)
 *     defaultValue: '#154a86',     // Wert, auf den "Zuruecksetzen" springt
 *     label: 'Seitenhintergrund',  // fuer aria-label
 *     onChange: function (hex8) {} // wird bei jeder Aenderung mit #rrggbbaa aufgerufen
 *   })
 *   -> gibt { el, setValue(hex), getValue() } zurueck. el ist der Swatch-Button,
 *      ins DOM haengen wo gebraucht.
 */
(function (global) {
  'use strict';

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  // --- Farbraum-Konvertierung ------------------------------------------------

  function hsvToRgb(h, s, v) {
    s /= 100; v /= 100;
    var c = v * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = v - c;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    var s = max === 0 ? 0 : d / max;
    var v = max;
    return { h: h, s: s * 100, v: v * 100 };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0;
    var l = (max + min) / 2;
    var d = max - min;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return { h: h, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  function toHex2(n) {
    var h = clamp(Math.round(n), 0, 255).toString(16);
    return h.length === 1 ? '0' + h : h;
  }

  function rgbaToHex8(r, g, b, a) {
    var alphaByte = Math.round(clamp(a, 0, 1) * 255);
    return '#' + toHex2(r) + toHex2(g) + toHex2(b) + (alphaByte < 255 ? toHex2(alphaByte) : '');
  }

  /**
   * Parst nahezu jeden CSS-Farbstring (#hex, #hexa, rgb(), rgba(), hsl(), hsla(),
   * benannte Farben) ueber ein unsichtbares Sonden-Element - robuster als eigenes
   * Regex-Parsing fuer jedes Format.
   */
  function parseAnyColor(input) {
    var probe = parseAnyColor._probe;
    if (!probe) {
      probe = document.createElement('div');
      probe.style.display = 'none';
      document.documentElement.appendChild(probe);
      parseAnyColor._probe = probe;
    }
    probe.style.color = '';
    probe.style.color = input;
    if (probe.style.color === '') {
      return null;
    }
    var computed = getComputedStyle(probe).color;
    var m = computed.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var parts = m[1].split(',').map(function (s) { return parseFloat(s); });
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }

  // --- Popover-Aufbau ----------------------------------------------------

  var activePopover = null;

  function closeActive() {
    if (activePopover) {
      activePopover.hidden = true;
      activePopover = null;
    }
  }

  document.addEventListener('pointerdown', function (e) {
    if (activePopover && !activePopover.contains(e.target) && !activePopover._swatch.contains(e.target)) {
      closeActive();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeActive();
  });

  function create(options) {
    var initial = parseAnyColor(options.value || '#000000') || { r: 0, g: 0, b: 0, a: 1 };
    var state = { r: initial.r, g: initial.g, b: initial.b, a: initial.a };
    var mode = 'hex';

    var swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'ncp-swatch';
    swatch.setAttribute('aria-label', options.label || 'Farbe waehlen');
    var swatchFill = document.createElement('span');
    swatchFill.className = 'ncp-swatch-fill';
    swatch.appendChild(swatchFill);

    var popover = document.createElement('div');
    popover.className = 'ncp-popover';
    popover.hidden = true;
    popover._swatch = swatch;

    var sv = document.createElement('div');
    sv.className = 'ncp-sv';
    var svThumb = document.createElement('div');
    svThumb.className = 'ncp-sv-thumb';
    sv.appendChild(svThumb);

    var hue = document.createElement('div');
    hue.className = 'ncp-hue';
    var hueThumb = document.createElement('div');
    hueThumb.className = 'ncp-hue-thumb';
    hue.appendChild(hueThumb);

    var alpha = document.createElement('div');
    alpha.className = 'ncp-alpha';
    var alphaFill = document.createElement('span');
    alphaFill.className = 'ncp-alpha-fill';
    var alphaThumb = document.createElement('div');
    alphaThumb.className = 'ncp-alpha-thumb';
    alpha.appendChild(alphaFill);
    alpha.appendChild(alphaThumb);

    var tabs = document.createElement('div');
    tabs.className = 'ncp-tabs';
    ['hex', 'rgb', 'hsl'].forEach(function (m) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = m.toUpperCase();
      btn.setAttribute('aria-pressed', m === mode ? 'true' : 'false');
      btn.addEventListener('click', function () {
        mode = m;
        Array.prototype.forEach.call(tabs.children, function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        renderFields();
      });
      tabs.appendChild(btn);
    });

    var fields = document.createElement('div');
    fields.className = 'ncp-fields';

    var footer = document.createElement('div');
    footer.className = 'ncp-footer';
    var preview = document.createElement('div');
    preview.className = 'ncp-preview';
    var previewSwatch = document.createElement('span');
    previewSwatch.className = 'ncp-preview-swatch';
    var previewText = document.createElement('span');
    preview.appendChild(previewSwatch);
    preview.appendChild(previewText);

    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'ncp-reset';
    resetBtn.textContent = 'Zuruecksetzen';

    footer.appendChild(preview);
    footer.appendChild(resetBtn);

    popover.appendChild(sv);
    popover.appendChild(hue);
    popover.appendChild(alpha);
    popover.appendChild(tabs);
    popover.appendChild(fields);
    popover.appendChild(footer);

    function currentHex8() {
      return rgbaToHex8(state.r, state.g, state.b, state.a);
    }

    function notify() {
      updateVisuals();
      if (typeof options.onChange === 'function') {
        options.onChange(currentHex8());
      }
    }

    function updateVisuals() {
      var rgbCss = 'rgb(' + state.r + ' ' + state.g + ' ' + state.b + ')';
      var rgbaCss = 'rgb(' + state.r + ' ' + state.g + ' ' + state.b + ' / ' + state.a + ')';
      swatchFill.style.background = rgbaCss;
      previewSwatch.style.background = rgbaCss;
      previewText.textContent = currentHex8();

      var hsv = rgbToHsv(state.r, state.g, state.b);
      sv.style.background = 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(' + hsv.h + ' 100% 50%))';
      svThumb.style.left = hsv.s + '%';
      svThumb.style.bottom = hsv.v + '%';
      hueThumb.style.left = (hsv.h / 360 * 100) + '%';

      alphaFill.style.background = 'linear-gradient(to right, transparent, ' + rgbCss + ')';
      alphaThumb.style.left = (state.a * 100) + '%';

      resetBtn.disabled = options.defaultValue ? currentHex8().toLowerCase() === (parseHexForCompare(options.defaultValue)) : true;
    }

    function parseHexForCompare(value) {
      var c = parseAnyColor(value);
      if (!c) return '';
      return rgbaToHex8(c.r, c.g, c.b, c.a).toLowerCase();
    }

    function renderFields() {
      fields.innerHTML = '';
      fields.setAttribute('data-mode', mode);

      if (mode === 'hex') {
        fields.style.display = 'block';
        var wrap = document.createElement('div');
        var label = document.createElement('label');
        label.textContent = 'HEX';
        var input = document.createElement('input');
        input.type = 'text';
        input.value = currentHex8();
        input.addEventListener('change', function () {
          var c = parseAnyColor(input.value);
          if (c) {
            state.r = c.r; state.g = c.g; state.b = c.b; state.a = c.a;
            notify();
          } else {
            input.value = currentHex8();
          }
        });
        wrap.appendChild(label);
        wrap.appendChild(input);
        fields.appendChild(wrap);
        fields.style.display = 'flex';
        fields._hexInput = input;
      } else if (mode === 'rgb') {
        ['r', 'g', 'b'].forEach(function (ch) {
          var wrap = document.createElement('div');
          var label = document.createElement('label');
          label.textContent = ch.toUpperCase();
          var input = document.createElement('input');
          input.type = 'number';
          input.min = '0'; input.max = '255';
          input.value = state[ch];
          input.addEventListener('input', function () {
            state[ch] = clamp(parseInt(input.value, 10) || 0, 0, 255);
            notify();
          });
          wrap.appendChild(label);
          wrap.appendChild(input);
          fields.appendChild(wrap);
        });
        var aWrap = document.createElement('div');
        var aLabel = document.createElement('label');
        aLabel.textContent = 'A';
        var aInput = document.createElement('input');
        aInput.type = 'number';
        aInput.min = '0'; aInput.max = '1'; aInput.step = '0.05';
        aInput.value = state.a;
        aInput.addEventListener('input', function () {
          state.a = clamp(parseFloat(aInput.value) || 0, 0, 1);
          notify();
        });
        aWrap.appendChild(aLabel);
        aWrap.appendChild(aInput);
        fields.appendChild(aWrap);
      } else if (mode === 'hsl') {
        var hsl = rgbToHsl(state.r, state.g, state.b);
        var defs = [
          { key: 'h', label: 'H', value: Math.round(hsl.h), min: 0, max: 360 },
          { key: 's', label: 'S', value: Math.round(hsl.s), min: 0, max: 100 },
          { key: 'l', label: 'L', value: Math.round(hsl.l), min: 0, max: 100 },
        ];
        defs.forEach(function (def) {
          var wrap = document.createElement('div');
          var label = document.createElement('label');
          label.textContent = def.label;
          var input = document.createElement('input');
          input.type = 'number';
          input.min = String(def.min); input.max = String(def.max);
          input.value = def.value;
          input.addEventListener('input', function () {
            var h = def.key === 'h' ? clamp(parseInt(input.value, 10) || 0, 0, 360) : hsl.h;
            var s = def.key === 's' ? clamp(parseInt(input.value, 10) || 0, 0, 100) : hsl.s;
            var l = def.key === 'l' ? clamp(parseInt(input.value, 10) || 0, 0, 100) : hsl.l;
            var rgb = hslToRgb(h, s, l);
            state.r = rgb.r; state.g = rgb.g; state.b = rgb.b;
            notify();
          });
          wrap.appendChild(label);
          wrap.appendChild(input);
          fields.appendChild(wrap);
        });
      }
    }

    sv.addEventListener('pointerdown', function (e) {
      sv.setPointerCapture(e.pointerId);
      function move(ev) {
        var rect = sv.getBoundingClientRect();
        var s = clamp((ev.clientX - rect.left) / rect.width, 0, 1) * 100;
        var v = clamp(1 - (ev.clientY - rect.top) / rect.height, 0, 1) * 100;
        var hsv = rgbToHsv(state.r, state.g, state.b);
        var rgb = hsvToRgb(hsv.h, s, v);
        state.r = rgb.r; state.g = rgb.g; state.b = rgb.b;
        notify();
        renderFields();
      }
      move(e);
      sv.addEventListener('pointermove', move);
      sv.addEventListener('pointerup', function up() {
        sv.removeEventListener('pointermove', move);
        sv.removeEventListener('pointerup', up);
      });
    });

    hue.addEventListener('pointerdown', function (e) {
      hue.setPointerCapture(e.pointerId);
      function move(ev) {
        var rect = hue.getBoundingClientRect();
        var h = clamp((ev.clientX - rect.left) / rect.width, 0, 1) * 360;
        var hsv = rgbToHsv(state.r, state.g, state.b);
        var rgb = hsvToRgb(h, hsv.s, hsv.v);
        state.r = rgb.r; state.g = rgb.g; state.b = rgb.b;
        notify();
        renderFields();
      }
      move(e);
      hue.addEventListener('pointermove', move);
      hue.addEventListener('pointerup', function up() {
        hue.removeEventListener('pointermove', move);
        hue.removeEventListener('pointerup', up);
      });
    });

    alpha.addEventListener('pointerdown', function (e) {
      alpha.setPointerCapture(e.pointerId);
      function move(ev) {
        var rect = alpha.getBoundingClientRect();
        state.a = Math.round(clamp((ev.clientX - rect.left) / rect.width, 0, 1) * 20) / 20;
        notify();
        renderFields();
      }
      move(e);
      alpha.addEventListener('pointermove', move);
      alpha.addEventListener('pointerup', function up() {
        alpha.removeEventListener('pointermove', move);
        alpha.removeEventListener('pointerup', up);
      });
    });

    resetBtn.addEventListener('click', function () {
      var c = parseAnyColor(options.defaultValue || options.value);
      if (c) {
        state.r = c.r; state.g = c.g; state.b = c.b; state.a = c.a;
        notify();
        renderFields();
      }
    });

    swatch.addEventListener('click', function () {
      if (!popover.hidden) {
        closeActive();
        return;
      }
      closeActive();
      document.body.appendChild(popover);
      var rect = swatch.getBoundingClientRect();
      popover.style.position = 'fixed';
      popover.style.top = (rect.bottom + 6) + 'px';
      popover.style.left = rect.left + 'px';
      popover.hidden = false;
      activePopover = popover;

      // Falls das Popover ueber den rechten Rand hinausragt, links ausrichten
      requestAnimationFrame(function () {
        var pRect = popover.getBoundingClientRect();
        if (pRect.right > window.innerWidth) {
          popover.style.left = Math.max(4, window.innerWidth - pRect.width - 8) + 'px';
        }
        if (pRect.bottom > window.innerHeight) {
          popover.style.top = Math.max(4, rect.top - pRect.height - 6) + 'px';
        }
      });
    });

    renderFields();
    updateVisuals();

    return {
      el: swatch,
      setValue: function (value) {
        var c = parseAnyColor(value);
        if (c) {
          state.r = c.r; state.g = c.g; state.b = c.b; state.a = c.a;
          updateVisuals();
          renderFields();
        }
      },
      getValue: currentHex8,
    };
  }

  global.NcssColorPicker = { create: create, parseAnyColor: parseAnyColor };
})(window);
