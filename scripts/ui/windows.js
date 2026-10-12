// Einzelne Instanzen der Fenster (Glossar, Prüf-Ansicht), von überall aufrufbar.
import { GlossaryEditor } from "./glossary-editor.js";
import { ReviewView } from "./review.js";

let glossary;
let review;

export function openGlossary({ filter } = {}) {
  glossary ??= new GlossaryEditor();
  if (filter) glossary.filter = filter;
  glossary.render({ force: true });
}

export function openReview(uuids, index = 0) {
  review ??= new ReviewView();
  review.show(uuids, index);
}

/** Offene Fenster nach Datenänderungen neu zeichnen. */
export function refreshWindows() {
  if (review?.rendered && !review.busy) review.render();
}
