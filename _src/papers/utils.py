"""Small span helpers for decorating existing HTML without changing its copy."""
import re
from html import escape

def elements(html, tag):
    """Return correctly nested full element spans with opening attrs."""
    stack=[]; result=[]
    pattern=re.compile(r'<(/?)'+re.escape(tag)+r'\b([^>]*)>',re.I)
    for match in pattern.finditer(html):
        if not match[1]:
            stack.append(match)
        elif stack:
            opening=stack.pop()
            result.append((opening.start(),match.end(),opening[2],html[opening.start():match.end()]))
    return sorted(result)

def attribute(attrs, name):
    found=re.search(r'\b'+re.escape(name)+r'="([^"]*)"',attrs)
    return found[1] if found else ''

def plain(html):
    from html import unescape
    return ' '.join(unescape(re.sub('<[^>]*>',' ',html)).split())

def paper(body, number, label, chapter_id, kind=''):
    """ID stays on original section; flow marker is used for accurate navigation."""
    return (f'<span class="folio-anchor" data-folio-anchor="{escape(chapter_id)}" aria-hidden="true"></span>'
            f'<div class="folio-sheet {kind}" data-folio-chapter="{escape(chapter_id)}">'
            f'<aside class="folio-rail" aria-hidden="true"><span class="folio-number">{number:02d}</span>'
            f'<span class="folio-label">{escape(label)}</span></aside><div class="folio-body">{body}</div></div>')

def replace_spans(html, replacements):
    for start,end,text in sorted(replacements,reverse=True):
        html=html[:start]+text+html[end:]
    return html
