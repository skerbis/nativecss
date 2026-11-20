/**
 * NativeCSS-Rundgang (demo/showcase/) - hält das aktuelle Kapitel in der seitlich
 * wischbaren Kapitel-Leiste sichtbar (auf schmalen Bildschirmen stünde z. B.
 * "Barrierefreiheit" sonst außerhalb). Nur Website, nicht Teil von dist/.
 */
(function () {
  "use strict";
  var link = document.querySelector('.demo-chapterbar a[aria-current="page"]');
  if (!link) return;
  var list = link.closest(".demo-chapterbar-list");
  if (!list || list.scrollWidth <= list.clientWidth) return;
  var start = link.offsetLeft - list.offsetLeft;
  list.scrollLeft = Math.max(0, start - (list.clientWidth - link.offsetWidth) / 2);
})();
