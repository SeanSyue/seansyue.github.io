// The host imports this module on Projects pages; filters stay with the host.
const viewers = new WeakMap();

export function initProjectViewer({isReduced = () => false} = {}) {
  const page = document.querySelector('.projects-page');
  if (!page) return null;
  if (viewers.has(page)) return viewers.get(page);
  if (typeof isReduced !== 'function') throw new TypeError('isReduced must be a function.');

  const controls = page.querySelector('[data-project-viewer]');
  const grid = page.querySelector('.projects-grid');
  const buttons = [...(controls?.querySelectorAll('button[data-project-view]') || [])];
  const tiles = [...(grid?.querySelectorAll('[data-project-expand]') || [])];
  if (!controls || !grid || buttons.length !== 2 || !tiles.length) return null;

  const status = controls.querySelector('[data-project-view-status]');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const animations = new Set();
  let view = 'overview';
  let destroyed = false;
  const reduced = () => Boolean(isReduced()) || preference.matches ||
    document.documentElement.dataset.reduce === 'true' ||
    document.documentElement.classList.contains('motion-reduced');

  function reset() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }

  function applyView() {
    page.dataset.projectView = view;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.projectView === view)));
  }

  function setView(nextView) {
    if (destroyed || !['overview', 'large'].includes(nextView) || nextView === view) return false;
    // Measure the currently painted size before cancellation, so a quick reversal
    // continues from the in-flight image rather than jumping to its resting size.
    const before = new Map();
    if (!reduced()) tiles.forEach(tile => {
      const art = tile.querySelector('.project-tile-art');
      if (!tile.hidden && art) before.set(art, art.getBoundingClientRect());
    });
    reset();
    const previousView = view;
    view = nextView;
    applyView();

    before.forEach((oldBox, art) => {
      if (!art.animate) return;
      const newBox = art.getBoundingClientRect();
      if (!oldBox.width || !newBox.width) return;
      const visible = box => box.bottom > 0 && box.top < window.innerHeight;
      if (!visible(oldBox) && !visible(newBox)) return;
      const x = oldBox.left + oldBox.width / 2 - newBox.left - newBox.width / 2;
      const y = oldBox.top + oldBox.height / 2 - newBox.top - newBox.height / 2;
      const scale = oldBox.width / newBox.width;
      if (Math.abs(x) < .5 && Math.abs(y) < .5 && Math.abs(scale - 1) < .001) return;
      // A uniform scale keeps every pixel of the original image visible. Separate
      // translate/scale properties leave the existing artistic rotation intact.
      const animation = art.animate([
        {translate: `${x}px ${y}px`, scale: String(scale)},
        {translate: '0px 0px', scale: '1'}
      ], {duration: 520, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both'});
      animations.add(animation);
      animation.finished.catch(() => {}).finally(() => {
        animations.delete(animation);
        animation.cancel();
      });
    });

    const selected = buttons.find(button => button.dataset.projectView === view);
    if (status) status.textContent = selected.dataset.projectViewAnnouncement || selected.textContent;
    // Layout and pressed states are committed before the host refreshes motion.
    document.dispatchEvent(new CustomEvent('portfolio:viewchange', {detail: {view, previousView}}));
    return true;
  }

  buttons.forEach(button => button.addEventListener('click', () => setView(button.dataset.projectView),
    {signal: listeners.signal}));
  // Filtering, viewport changes and a new motion preference cancel in-flight
  // artwork effects while retaining the chosen view and all ordinary card links.
  page.querySelectorAll('[data-project-filter]').forEach(button => button.addEventListener('click', reset,
    {capture: true, signal: listeners.signal}));
  window.addEventListener('resize', reset, {signal: listeners.signal});
  window.addEventListener('beforeprint', reset, {signal: listeners.signal});
  const motionChanged = () => { if (reduced()) reset(); };
  preference.addEventListener('change', motionChanged);
  const motionObserver = new MutationObserver(motionChanged);
  motionObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['data-reduce', 'class']});
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); },
    {signal: listeners.signal});

  const api = {
    current: () => view,
    setView,
    reset,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      reset();
      listeners.abort();
      preference.removeEventListener('change', motionChanged);
      motionObserver.disconnect();
      controls.hidden = true;
      view = 'overview';
      applyView();
      delete page.dataset.projectView;
      if (status) status.textContent = '';
      viewers.delete(page);
    }
  };
  applyView();
  viewers.set(page, api);
  controls.hidden = false;
  return api;
}
