"""Compose the approved paper layout after content markers are resolved.

Content, fact markers, translations and routes remain owned by the existing
page sources. Wrappers reuse the original sections and preserve their IDs.
"""
import re

from .profiles import decorate as profiles
from .cases import decorate as cases
from .projects import decorate as projects
from .endings import contact, inner as close_inner


CHAPTERS = {
    'en': [('01', 'Capabilities & experience'), ('02', 'Selected work'), ('03', 'How I work')],
    'zh-tw': [('01', '能力與實際經驗'), ('02', '精選作品'), ('03', '我的工作方式')],
    'ja': [('01', '強みと実際の経験'), ('02', '主な作品'), ('03', '仕事の進め方')],
}
CAP_LABELS = {
    'en': ('Selected capability', 'Related experience & work'),
    'zh-tw': ('目前能力', '相關經歷與作品'),
    'ja': ('選択中の強み', '関連する経験と作品'),
}


def home(html, language, strings):
    current_label, evidence_label = CAP_LABELS[language]
    html = re.sub(r'(data-cap-link>)\d{2}\s*', r'\1', html)
    html = re.sub(r'(<span class="cap-index">)\d{2}\s*/',
                  lambda m: m[1] + current_label + ' /', html)

    def group_capability(match):
        body = match[2].replace('<div class="evidence-list">',
            f'</div><div class="capability-proofs"><h4>{evidence_label}</h4><div class="evidence-list">', 1)
        return match[1] + '<div class="capability-summary">' + body + '</div></article>'

    html = re.sub(r'(<article class="capability-panel"[^>]*>)(.*?)</article>',
                  group_capability, html, flags=re.S)
    specs = [('id="capabilities" class="capabilities"', 0),
             ('class="work" id="work"', 1), ('class="working-note"', 2)]
    for attr, index in specs:
        number, label = CHAPTERS[language][index]
        marker = (f'<div class="chapter-marker" aria-hidden="true"><span class="chapter-number">{number}</span>'
                  f'<span class="chapter-name">{label}</span><span class="chapter-trail">SEAN SYUE / {number} — 03</span></div>')
        html = re.sub(r'(<section\b[^>]*' + re.escape(attr) + r'[^>]*>)',
                      lambda m: m[1] + marker, html, count=1)

    def plane(match):
        attrs = match[1]
        kind = ('hero' if 'id="intro"' in attrs else 'cap' if 'id="capabilities"' in attrs
                else 'work' if 'id="work"' in attrs else 'note')
        return f'<div class="section-plane plane-{kind}">{match[0]}</div>'

    html = re.sub(r'<section\b([^>]*)>.*?</section>', plane, html, flags=re.S)
    html = html.replace('<div class="section-plane plane-cap">',
        '<span id="capability-chapter-start" class="chapter-anchor" aria-hidden="true"></span><div class="section-plane plane-cap">', 1)
    return contact(html, language, labels=(strings['footer.contact'],
        strings['contact.heading'], strings['contact.email_action']))


def decorate(html, page_id, language, token, strings):
    html = html.replace('data-design="motion03"', 'data-design="motion03" data-section-study="d"', 1)
    css = f'<link rel="stylesheet" href="/assets/css/papers.css?v={token}">'
    if page_id == 'home':
        html = home(html, language, strings)
        script = f'<script type="module" src="/assets/js/papers-home.js?v={token}"></script>'
    else:
        kind = 'profiles' if page_id in ('about', 'resume') else 'projects' if page_id == 'projects' else 'cases'
        html = html.replace('data-section-study="d"', f'data-section-study="d" data-inner-study="{kind}"', 1)
        decorator = {'profiles': profiles, 'projects': projects, 'cases': cases}[kind]
        html = close_inner(decorator(html, page_id, language))
        html = re.sub(r'(<main\b[^>]*class=")([^\"]*)', r'\1\2 folio-shell', html, count=1)
        html = html.replace('class="profile-nav ', 'class="profile-nav folio-nav ')
        html = html.replace('class="section-nav"', 'class="section-nav folio-nav"')
        css += (f'<link rel="stylesheet" href="/assets/css/papers-inner.css?v={token}">'
                f'<link rel="stylesheet" href="/assets/css/papers-{kind}.css?v={token}">')
        script = f'<script type="module" src="/assets/js/papers-inner.js?v={token}"></script>'
    return html.replace('</head>', css + '\n</head>', 1).replace('</body>', script + '\n</body>', 1)
