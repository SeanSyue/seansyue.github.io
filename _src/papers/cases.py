"""Decorate case pages; retain the original content and controls.

The caller loads inner.css, then inner-cases.css after the original cases.css.
Paper positioning and anchor navigation belong to the common inner.js.
"""
from .utils import attribute, elements, paper, plain, replace_spans


CASE_PAGES = frozenset({
    'aicc', 'negative-control', 'tetherlock',
    'ai-image', 'ai-music', 'heart-apartment',
})


def _has_class(attrs, name):
    return name in attribute(attrs, 'class').split()


def _label(section, chapter_id, labels):
    """Reuse this language's short navigation label, never invent copy."""
    if labels.get(chapter_id):
        return labels[chapter_id]
    for _, _, attrs, body in elements(section, 'span'):
        if _has_class(attrs, 'eyebrow') and plain(body):
            return plain(body)
    headings = elements(section, 'h2')
    return plain(headings[0][3]) if headings else chapter_id


def decorate(html, page_id, language):
    """Return wrapped HTML for any of the six cases in any source language.

    Balanced spans include nested sections in their entirety. If a future case
    has a case-section inside another, decorate children before their parent;
    overlapping full-span replacements would otherwise discard child changes.
    All original IDs stay on their original elements. No links are rewritten.
    """
    if page_id not in CASE_PAGES or 'data-folio-chapter=' in html:
        return html

    labels = {}
    for _, _, attrs, nav in elements(html, 'nav'):
        if _has_class(attrs, 'section-nav'):
            for _, _, link_attrs, link in elements(nav, 'a'):
                href = attribute(link_attrs, 'href')
                if href.startswith('#'):
                    labels[href[1:]] = plain(link)

    sections = [span for span in elements(html, 'section')
                if _has_class(span[2], 'case-section')]
    if not sections:
        return html

    children = {None: []}
    stack = []
    for index, (start, end, attrs, body) in enumerate(sections):
        if not attribute(attrs, 'id'):
            raise ValueError(f'{page_id}/{language}: case-section has no anchor ID')
        while stack and sections[stack[-1]][1] <= start:
            stack.pop()
        parent = stack[-1] if stack else None
        children.setdefault(parent, []).append(index)
        children[index] = []
        stack.append(index)

    def sheet(index):
        start, end, attrs, body = sections[index]
        replacements = []
        for child in children[index]:
            child_start, child_end = sections[child][:2]
            replacements.append((child_start - start, child_end - start, sheet(child)))
        body = replace_spans(body, replacements)
        chapter_id = attribute(attrs, 'id')
        return paper(body, index + 1, _label(sections[index][3], chapter_id, labels),
                     chapter_id, 'folio-case')

    replacements = [(sections[index][0], sections[index][1], sheet(index))
                    for index in children[None]]
    # Only content's existing wrap loses its width constraint. Hero and
    # navigation wraps remain unchanged. Modify just the opening tag, so this
    # replacement cannot overlap the section replacements inside the div.
    for start, end, attrs, body in elements(html, 'div'):
        if not _has_class(attrs, 'wrap'):
            continue
        if any(start < section[0] and section[1] < end for section in sections):
            opening_end = html.index('>', start) + 1
            opening = html[start:opening_end]
            classes = attribute(attrs, 'class')
            opening = opening.replace(f'class="{classes}"',
                                      f'class="{classes} folio-case-flow"', 1)
            replacements.append((start, opening_end, opening))
    return replace_spans(html, replacements)
