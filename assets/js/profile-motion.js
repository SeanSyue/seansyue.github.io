// Reading motion is driven by document position, never by a once-only timer.
// The source stays fully visible without this module and in print.
export function initProfileMotion({isReduced = () => false} = {}) {
  const page = document.querySelector('.profile-page');
  if (!page) return null;
  const groups = [], units = [], claimed = new Set();
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => value * value * (3 - 2 * value);
  let frame = 0, needsMeasure = true, printing = false;
  const list = (parent, selector) => [...parent.querySelectorAll(selector)];
  function group(anchor, lead, copy, {short = false} = {}) {
    const parts = [];
    function part(element, start, end, distance) {
      if (!element || claimed.has(element)) return;
      claimed.add(element);
      element.classList.add('profile-motion-unit');
      const unit = {element, start, end, distance, value: -1};
      parts.push(unit); units.push(unit);
    }
    lead.filter(Boolean).forEach((el, i) => part(el, i * .055, .3 + i * .055, short ? 20 : 32));
    copy.filter(Boolean).forEach((el, i) => {
      const start = (lead.length ? .36 : .08) + Math.min(i * .055, .11);
      part(el, start, start + .5, short ? 18 : 26);
    });
    if (parts.length) groups.push({anchor, parts, short, top:0, height:0});
  }

  // Each row is one sequence: number/title/date, then its actual description.
  list(page, '.profile-role').forEach(row => group(row,
    [row.querySelector('.profile-role-index'), row.querySelector('.role-head')],
    list(row, ':scope > ul > li')));
  list(page, '.profile-principle').forEach(row => group(row,
    [row.querySelector('.profile-principle-number'), row.querySelector('h3')],
    list(row, '.profile-principle-copy > p, .profile-principle-copy > a')));
  list(page, '.skills > div').forEach(row => group(row,
    [row.querySelector('dt')], [row.querySelector('dd')], {short:true}));
  list(page, '.profile-timeline li').forEach(row => group(row,
    [row.querySelector('.profile-timeline-date'), row.querySelector('h3')],
    list(row, 'p'), {short:true}));
  list(page, '.profile-timeline').forEach(timeline => group(timeline,
    list(timeline, ':scope > .profile-timeline-label'),
    list(timeline, ':scope > a'), {short:true}));
  const summary = page.querySelector('.profile-summary');
  if (summary) group(summary, [summary.querySelector('.profile-section-heading')],
    list(summary, ':scope > p'));
  list(page, '.profile-section-heading').forEach(heading => {
    if (summary?.contains(heading)) return;
    group(heading, list(heading, ':scope > *'), [], {short:true});
  });
  list(page, '.profile-prose-grid').forEach(grid => {
    list(grid, ':scope > *').forEach(column => {
      if (column.matches('.profile-timeline')) return;
      const copy = column.matches('p') ? [column] : list(column, ':scope > p, :scope > a');
      group(grid, [], copy);
    });
  });
  const heading = page.querySelector('.profile-heading');
  if (heading) group(heading,
    list(heading, ':scope > .eyebrow, :scope > .profile-display, :scope > h1'),
    list(heading, ':scope > .lede, :scope > .contact-line, :scope > .btn-row, :scope > .pdf-langs'));
  const next = page.querySelector('.next');
  if (next) group(next, [], list(next, '.btn-row'), {short:true});

  const nav = page.querySelector('.profile-nav');
  const sections = nav ? list(nav, 'a[href^="#"]').map(link => ({link,
    section:document.getElementById(link.hash.slice(1))})).filter(row => row.section) : [];
  const hero = page.querySelector('.profile-about-display, .profile-display');
  const header = document.querySelector('.site-header');

  function measure() {
    // Anchors are untransformed containers, so the current effect cannot feed
    // back into its own geometry. Font loading/resize re-measure the originals.
    groups.forEach(row => {
      const rect = row.anchor.getBoundingClientRect();
      row.top = rect.top + window.scrollY;
      row.height = rect.height;
    });
    needsMeasure = false;
  }
  function set(unit, value) {
    if (Math.abs(unit.value - value) < .0005) return;
    unit.value = value;
    unit.element.style.setProperty('--profile-reveal', value.toFixed(4));
    unit.element.style.setProperty('--profile-shift', `${((1-value)*unit.distance).toFixed(2)}px`);
  }
  function update() {
    frame = 0;
    if (needsMeasure) measure();
    const disabled = isReduced() || printing;
    page.classList.toggle('profile-motion-ready', !disabled);
    const vh = window.innerHeight, y = window.scrollY;
    groups.forEach(row => {
      const span = Math.min(vh * (row.short ? .28 : .44), Math.max(vh * .24, row.height * .85));
      const progress = clamp((y + vh * .91 - row.top) / span);
      const focused = row.anchor.contains(document.activeElement);
      row.parts.forEach(unit => set(unit, disabled || focused ? 1 : ease(clamp((progress-unit.start)/(unit.end-unit.start)))));
    });
    if (hero && heading) {
      const exit = disabled ? 0 : clamp((y-heading.offsetTop) / Math.max(1, heading.offsetHeight));
      hero.style.setProperty('--profile-hero-shift', `${(-exit * (page.matches('.about-screen') ? 38 : 24)).toFixed(2)}px`);
    }
    if (sections.length) {
      const line = (header?.getBoundingClientRect().height || 90) + (nav?.offsetHeight || 0) + 40;
      let current = sections[0];
      sections.forEach(row => { if (row.section.getBoundingClientRect().top <= line) current = row; });
      if (y + vh >= document.documentElement.scrollHeight - 4) current = sections.at(-1);
      sections.forEach(row => {
        if (row === current) row.link.setAttribute('aria-current', 'location');
        else row.link.removeAttribute('aria-current');
      });
    }
  }
  function refresh(measureAgain = false) {
    if (measureAgain) needsMeasure = true;
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', () => refresh(), {passive:true});
  window.addEventListener('resize', () => refresh(true));
  window.addEventListener('pageshow', () => refresh(true));
  window.addEventListener('hashchange', () => refresh());
  document.addEventListener('focusin', () => refresh());
  document.addEventListener('focusout', () => refresh());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(true); });
  window.addEventListener('beforeprint', () => { printing = true; update(); });
  window.addEventListener('afterprint', () => { printing = false; refresh(true); });
  document.fonts.ready.then(() => refresh(true));
  document.fonts.addEventListener('loadingdone', () => refresh(true));
  if (window.ResizeObserver) new ResizeObserver(() => refresh(true)).observe(page);
  update();
  return {refresh};
}
