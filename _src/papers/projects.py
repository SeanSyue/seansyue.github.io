"""Group the Projects page without rewriting its original cards."""
from html import escape

from .utils import attribute, elements, paper, plain, replace_spans


GROUPS = ("workflows", "media", "games")


def decorate(html, page_id, language):
    """Keep the filter target, card markup and viewer hooks intact in all locales.

    experience.js toggles ``hidden`` on descendant cards and imports
    assets/js/project-viewer.js, which queries descendants of .projects-grid.
    Neither needs direct child articles; wrappers never get data-project-group.
    papers-inner.js handles portfolio:filterchange synchronously and observes
    sheet resizing for view changes; data-folio-project-group identifies sheets.
    CSS :has() also hides empty sheets without waiting for common JS.
    """
    if page_id != "projects" or 'class="folio-project-grid"' in html:
        return html

    grids = [span for span in elements(html, "section")
             if attribute(span[2], "id") == "projects-grid"]
    if len(grids) != 1:
        raise ValueError("Projects decoration requires one original projects-grid.")
    start, end, _, grid = grids[0]
    cards = [span for span in elements(grid, "article")
             if "project-tile" in attribute(span[2], "class").split()]
    expected = ("workflows", "workflows", "workflows", "media", "media", "games")
    if tuple(attribute(card[2], "data-project-group") for card in cards) != expected:
        raise ValueError("Projects cards changed; review the three chapter boundaries.")

    labels = {attribute(attrs, "data-project-filter"): plain(button)
              for _, _, attrs, button in elements(html, "button")
              if attribute(attrs, "data-project-filter") in GROUPS}
    if set(labels) != set(GROUPS):
        raise ValueError("Projects chapters require the existing localized category labels.")

    replacements = []
    for number, group in enumerate(GROUPS, 1):
        members = [card for card in cards
                   if attribute(card[2], "data-project-group") == group]
        first, last = members[0][0], members[-1][1]
        chapter_id = "projects-" + group
        if f'id="{chapter_id}"' in html:
            raise ValueError("Projects chapter ID already exists: " + chapter_id)
        label = labels[group]
        # Slice the original run, retaining every article and intervening byte.
        body = (f'<section class="folio-project-chapter" id="{chapter_id}" '
                f'aria-label="{escape(label, quote=True)}">'
                '<div class="folio-project-grid">' + grid[first:last] + '</div></section>')
        wrapped = paper(body, number, label, chapter_id, kind="folio-project-sheet")
        wrapped = wrapped.replace('data-folio-anchor=',
                                  f'data-folio-project-anchor="{group}" data-folio-anchor=', 1)
        wrapped = wrapped.replace('data-folio-chapter=',
                                  f'data-folio-project-group="{group}" data-folio-chapter=', 1)
        replacements.append((first, last, wrapped))
    return html[:start] + replace_spans(grid, replacements) + html[end:]
