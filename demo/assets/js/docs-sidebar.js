// ncss - Doku-Website (nicht Teil der ausgelieferten Bibliothek): kollabiert die
// Handbuch-Sidebar (<details class="docs-sidebar-details" open> in docs-src/
// template.html) auf schmalen Viewports beim Laden. MUSS synchron laden (kein defer/
// async) und an genau dieser Stelle im Markup stehen, NICHT nach dem <details> - sonst
// blitzt die per Default offene Sidebar vor dem Zuklappen kurz sichtbar auf. Bewusst
// über das ECHTE open-Attribut gelöst statt es per CSS vorzutäuschen (display:block
// !important auf ein Kind eines geschlossenen <details> gewinnt zwar in
// getComputedStyle, wird in aktuellen Browsern aber trotzdem nicht gemalt - der
// interne Slot-Mechanismus von <details> lässt sich so nicht überschreiben, siehe
// SKILL.md). document.currentScript funktioniert für ein synchrones src-Script genauso
// wie für ein Inline-Script - deshalb hier unverändert nutzbar.
if (!matchMedia("(min-width: 60rem)").matches) {
  document.currentScript.closest("details").removeAttribute("open");
}
