"""Terminal paper surfaces. Original facts and inner-page prose are retained."""
from .utils import attribute, elements


def contact(html, language, labels):
    footer = next(s for s in elements(html, 'footer') if attribute(s[2], 'id') == 'contact')
    start, end, _, original = footer
    description = elements(original, 'p')[0][3]
    links = elements(original, 'a')
    email = links[0][3].replace('class="btn btn-quiet"', '')
    secondary = ''.join(s[3].replace('class="btn btn-quiet"', '') for s in links[1:])
    copyright = elements(original, 'small')[0][3]
    paper = f'''<span id="contact-chapter-start" class="chapter-anchor" aria-hidden="true"></span>
<div class="section-plane plane-contact"><section id="contact" class="contact-chapter" aria-labelledby="contact-heading">
<div class="contact-intro"><span class="eyebrow" data-contact-reveal>{labels[0]} / CONTACT</span>
<h2 id="contact-heading" data-contact-reveal>{labels[1]}</h2>
<div class="contact-description" data-contact-reveal>{description}</div></div>
<div class="contact-actions"><a class="contact-primary" href="mailto:sean86711@gmail.com" data-contact-reveal><span>{labels[2]}</span><span aria-hidden="true">↗</span></a>
<div class="contact-email" data-contact-reveal>{email}</div><nav class="contact-secondary" aria-label="{labels[0]}" data-contact-reveal>{secondary}</nav></div>
</section></div>'''
    html = html[:start] + f'<footer class="site-footer contact-copyright"><div class="wrap">{copyright}</div></footer>' + html[end:]
    return html.replace('</main>', paper + '</main>', 1)


def inner(html):
    start, end, attrs, main = elements(html, 'main')[0]
    sheets = [s for s in elements(main, 'div') if 'folio-sheet' in attribute(s[2], 'class').split()]
    last = sheets[-1]
    paper = last[3].replace('<div ', '<div data-folio-last="true" ', 1)
    if 'projects-page' in attribute(attrs, 'class').split():
        # These sheets are nested in projects-grid. Its closing tag and the
        # independent outro must not be moved inside the last filterable sheet.
        main = main[:last[0]] + paper + main[last[1]:]
        return html[:start] + main + html[end:]
    tail = main[last[1]:].removesuffix('</main>')
    # Put final actions inside the full-width terminal paper, so its opaque
    # surface also seals the space beneath the content. No floating narrow box.
    ending = f'<div class="folio-ending">{tail}</div>' if tail.strip() else ''
    if ending:
        paper = paper.replace('data-folio-last="true"','data-folio-last="true" data-folio-ending="true"',1)
        paper = paper.removesuffix('</div>') + ending + '</div>'
    main = main[:last[0]] + paper + '</main>'
    return html[:start] + main + html[end:]
