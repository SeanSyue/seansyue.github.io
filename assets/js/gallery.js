// Selected project gallery. Copy comes from the generated language page.
// The host owns markup, themes, touch-action: pan-y, tabindex and .dragging CSS.
const PROJECTS = JSON.parse(document.getElementById('gallery-data').textContent);
const ORDER = ['aicc', 'image', 'heart'];
const EASE = 'cubic-bezier(.22,.8,.18,1)';
const DURATIONS = {calm:250, expressive:550, experimental:850};
const VISUAL_STYLES = ['transform', 'opacity', 'clipPath', 'position', 'inset', 'zIndex', 'willChange'];

export function initGallery({ getLevel, isReduced, onProject = () => {} }) {
  if (typeof getLevel !== 'function' || typeof isReduced !== 'function' || typeof onProject !== 'function') {
    throw new TypeError('initGallery requires getLevel/isReduced functions and an optional onProject function.');
  }
  const root = document.documentElement;
  const required = id => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Gallery DOM contract: missing #${id}`);
    return el;
  };
  const surface = required('media-frame');
  const title = required('work-title');
  const category = required('work-category');
  const description = required('work-description');
  const role = required('work-role');
  const caption = required('media-caption');
  const link = required('case-link');
  const status = required('gallery-status');
  const hint = required('gesture-hint');
  const previous = required('previous');
  const next = required('next');
  const buttons = [...document.querySelectorAll('button[data-work]')];
  const figures = new Map(ORDER.map(key => {
    const el = surface.querySelector(`figure[data-visual="${key}"]`);
    if (!el) throw new Error(`Gallery DOM contract: missing figure[data-visual="${key}"]`);
    return [key, el];
  }));
  // Restore host inline layout after temporary animation overlays, not cssText.
  const baseStyles = new Map([...figures.values()].map(el => [el,
    Object.fromEntries(VISUAL_STYLES.map(prop => [prop, el.style[prop] || '']))
  ]));
  const view = surface.ownerDocument.defaultView;
  const raf = fn => view.requestAnimationFrame(fn);
  const caf = id => view.cancelAnimationFrame(id);
  let current = null;
  let run = 0;
  let active = null;
  let gesture = null;
  let watcher = null;
  const animations = new Set();
  const level = () => {
    const value = getLevel();
    return Object.hasOwn(DURATIONS, value) ? value : 'calm';
  };
  const settings = () => ({level:level(), reduced:Boolean(isReduced())});
  const sameSettings = (a, b) => a.level === b.level && a.reduced === b.reduced;

  function restoreStyles() {
    for (const [el, styles] of baseStyles) {
      for (const prop of VISUAL_STYLES) el.style[prop] = styles[prop];
    }
  }
  function revealCurrent() {
    for (const [key, el] of figures) {
      el.hidden = key !== current;
      el.setAttribute('aria-hidden', String(key !== current));
    }
  }
  function stopWatcher() {
    if (watcher !== null) caf(watcher);
    watcher = null;
  }
  function clearGesture() {
    const old = gesture;
    gesture = null; // Release can synchronously dispatch lostpointercapture.
    surface.classList.remove('dragging');
    delete hint.dataset.dragging;
    if (old && surface.hasPointerCapture(old.id)) {
      try { surface.releasePointerCapture(old.id); } catch { /* Already released by UA. */ }
    }
  }
  function cancelEffects() {
    ++run;
    stopWatcher();
    clearGesture();
    for (const animation of animations) animation.cancel();
    animations.clear();
    if (active) active.resolve(false);
    active = null;
    restoreStyles();
    revealCurrent();
    surface.setAttribute('aria-busy', 'false');
  }
  function announce() {
    const name = PROJECTS[current].name;
    if (status.textContent !== name) status.textContent = name;
  }
  function finish(token) {
    if (!active || token !== run) return;
    const resolve = active.resolve;
    active = null;
    stopWatcher();
    for (const animation of animations) animation.cancel();
    animations.clear();
    restoreStyles();
    revealCurrent();
    surface.setAttribute('aria-busy', 'false');
    announce();
    resolve(true);
  }
  function reset() {
    cancelEffects();
    announce();
  }
  // Dynamic getters are sampled during activity. Calling reset after a host
  // settings change also removes effects synchronously, before the next paint.
  function watchSettings() {
    if (watcher !== null || (!active && !gesture)) return;
    watcher = raf(() => {
      watcher = null;
      const expected = active?.settings || gesture?.settings;
      if (expected && !sameSettings(expected, settings())) {
        if (active) finish(run);
        else reset();
        return;
      }
      watchSettings();
    });
  }
  function animate(el, frames, duration) {
    const animation = el.animate(frames, {duration, easing:EASE, fill:'both'});
    animations.add(animation);
    // Install the rejection handler immediately; cancel() rejects finished.
    return animation.finished.catch(() => {});
  }
  function transition(oldKey, key, direction, prefs) {
    const outgoing = figures.get(oldKey);
    const incoming = figures.get(key);
    outgoing.hidden = false;
    // Only the new project is exposed to assistive technology during overlap.
    outgoing.setAttribute('aria-hidden', 'true');
    for (const el of [outgoing, incoming]) {
      el.style.position = 'absolute';
      el.style.inset = '0';
      el.style.willChange = 'transform, opacity, clip-path';
    }
    incoming.style.zIndex = '2';
    outgoing.style.zIndex = '1';
    const duration = DURATIONS[prefs.level];
    let enter, leave;
    if (prefs.level === 'calm') {
      enter = [{opacity:0, transform:`translateX(${direction * 8}px)`}, {opacity:1, transform:'translateX(0)'}];
      leave = [{opacity:1, transform:'translateX(0)'}, {opacity:0, transform:`translateX(${-direction * 8}px)`}];
    } else if (prefs.level === 'expressive') {
      const mask = direction > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
      enter = [{opacity:0.25, transform:`translateX(${direction * 20}%)`, clipPath:mask},
        {opacity:1, transform:'translateX(0)', clipPath:'inset(0 0 0 0)'}];
      leave = [{opacity:1, transform:'translateX(0)'}, {opacity:0, transform:`translateX(${-direction * 14}%)`}];
    } else {
      enter = [{opacity:0, transform:`translateX(${direction * 62}%) scale(.92) rotate(${direction * 5}deg)`},
        {opacity:1, transform:`translateX(${-direction * 2}%) scale(1.01) rotate(${-direction * .5}deg)`, offset:.78},
        {opacity:1, transform:'translateX(0) scale(1) rotate(0deg)'}];
      leave = [{opacity:1, transform:'translateX(0) scale(1) rotate(0deg)'},
        {opacity:0, transform:`translateX(${-direction * 52}%) scale(.94) rotate(${-direction * 2}deg)`}];
    }
    return [animate(outgoing, leave, duration), animate(incoming, enter, duration)];
  }

  function showProject(key, direction) {
    if (!Object.hasOwn(PROJECTS, key)) throw new RangeError(`Unknown gallery project: ${key}`);
    const oldKey = current;
    cancelEffects();
    current = key;
    const p = PROJECTS[key];
    root.dataset.project = key;
    title.innerHTML = p.title;
    category.textContent = p.category;
    description.textContent = p.description;
    role.innerHTML = p.role;
    caption.textContent = p.caption;
    link.href = p.url;
    link.setAttribute('aria-label', `${link.dataset.projectLabel}: ${p.name}`);
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.work === key));
    revealCurrent();
    const prefs = settings();
    const canAnimate = oldKey && oldKey !== key && !prefs.reduced &&
      [...figures.values()].every(el => typeof el.animate === 'function');
    let completion;
    if (canAnimate) {
      status.textContent = '';
      surface.setAttribute('aria-busy', 'true');
      const token = run;
      completion = new Promise(resolve => { active = {resolve, settings:prefs}; });
      const dir = direction === -1 ? -1 : direction === 1 ? 1 :
        (ORDER.indexOf(key) < ORDER.indexOf(oldKey) ? -1 : 1);
      try {
        Promise.all(transition(oldKey, key, dir, prefs)).then(() => finish(token));
        watchSettings();
      } catch {
        // Partial/unsupported WAAPI fails closed to the exact final state.
        finish(token);
      }
    } else {
      announce();
      completion = Promise.resolve(true);
    }
    if (oldKey !== key) onProject(key);
    return completion;
  }
  function step(delta) {
    const index = (ORDER.indexOf(current) + delta + ORDER.length) % ORDER.length;
    return showProject(ORDER[index], delta < 0 ? -1 : 1);
  }
  function moveGesture(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (!sameSettings(gesture.settings, settings())) { reset(); return; }
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture.dx = dx;
    gesture.dy = dy;
    if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
      if (Math.abs(dy) >= Math.abs(dx)) { reset(); return; }
      gesture.axis = 'horizontal';
      surface.classList.add('dragging');
      hint.dataset.dragging = 'true';
    }
    if (gesture.axis === 'horizontal') {
      if (event.cancelable) event.preventDefault();
      if (!isReduced()) {
        figures.get(current).style.transform = `translateX(${Math.max(-80, Math.min(80, dx * .45))}px)`;
      }
    }
  }
  function endGesture(event, cancelled = false) {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (!cancelled) moveGesture(event);
    if (!gesture) return;
    const old = gesture;
    const shouldStep = !cancelled && old.axis === 'horizontal' &&
      Math.abs(old.dx) >= old.threshold && Math.abs(old.dx) > Math.abs(old.dy);
    reset();
    if (shouldStep) step(old.dx < 0 ? 1 : -1);
  }
  surface.addEventListener('pointerdown', event => {
    if (gesture || event.isPrimary === false || event.button !== 0 ||
      event.target.closest?.('a, button, input, textarea, select, [contenteditable]')) return;
    reset();
    gesture = {id:event.pointerId, x:event.clientX, y:event.clientY, dx:0, dy:0,
      axis:null, threshold:Math.min(80, Math.max(45, surface.getBoundingClientRect().width * .1)), settings:settings()};
    try { surface.setPointerCapture(event.pointerId); }
    catch { reset(); return; }
    watchSettings();
  });
  surface.addEventListener('pointermove', moveGesture);
  surface.addEventListener('pointerup', event => endGesture(event));
  surface.addEventListener('pointercancel', event => endGesture(event, true));
  surface.addEventListener('lostpointercapture', event => endGesture(event, true));
  surface.addEventListener('dragstart', event => { event.preventDefault(); });
  for (const image of surface.querySelectorAll('img')) image.draggable = false;
  surface.addEventListener('keydown', event => {
    if (event.target !== surface || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  for (const button of buttons) button.addEventListener('click', () => showProject(button.dataset.work));
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  view.addEventListener('blur', reset);
  surface.ownerDocument.addEventListener('visibilitychange', () => {
    if (surface.ownerDocument.hidden) reset();
  });
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  showProject(ORDER[0]);
  return { showProject, reset, current:() => current };
}
