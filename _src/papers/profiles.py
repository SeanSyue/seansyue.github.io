"""Approved paper decoration for About and Résumé; original sections stay intact."""

from .utils import attribute, elements, paper, plain, replace_spans


def _has_class(attrs, name):
    return name in attribute(attrs, 'class').split()


def decorate(html, page_id, language):
    """Wrap top-level profile chapters using their existing translated nav labels.

    The caller owns assets and the root's data-inner-study attribute. Keeping
    each section byte-for-byte preserves IDs, copy, print children and the
    direct-child selectors used by profile-motion.js. Language is intentionally
    read from existing markup rather than maintained as a second copy table.
    """
    if page_id not in ('about', 'resume'):
        return html

    mains = [span for span in elements(html, 'main')
             if _has_class(span[2], 'profile-page')]
    if not mains:
        return html
    main_start, main_end, _, main = mains[0]
    if 'data-folio-chapter=' in main:
        return html

    labels = {}
    for _, _, attrs, nav in elements(main, 'nav'):
        if not _has_class(attrs, 'profile-nav'):
            continue
        for _, _, link_attrs, link in elements(nav, 'a'):
            href = attribute(link_attrs, 'href')
            if href.startswith('#'):
                labels[href[1:]] = plain(link)

    # Ignore nested sections: a sheet represents one original top-level chapter.
    sections = elements(main, 'section')
    chapters = [span for span in sections
                if _has_class(span[2], 'profile-section')
                and not any(parent[0] < span[0] and span[1] < parent[1]
                            for parent in sections)]
    replacements = []
    for number, (start, end, attrs, body) in enumerate(chapters, 1):
        chapter_id = attribute(attrs, 'id')
        if not chapter_id:
            continue
        headings = elements(body, 'h2')
        label = labels.get(chapter_id) or (plain(headings[0][3]) if headings else '')
        wrapped = paper(body, number, label, chapter_id,
                        kind=f'folio-profile folio-{page_id}')
        # Existing print .no-print rule hides decorative rails. No print override
        # is introduced: wrapper divs keep the original résumé layout in charge.
        wrapped = wrapped.replace('class="folio-rail"',
                                  'class="folio-rail no-print"', 1)
        replacements.append((start, end, wrapped))

    return html[:main_start] + replace_spans(main, replacements) + html[main_end:]
