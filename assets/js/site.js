// Fade sections in once as they scroll into view, and stop looping preview
// videos for visitors who ask for reduced motion (they keep the poster frame).
// Day / night toggle. No stored choice means the system decides; clicking
// picks the opposite of what is on screen and remembers it.
(function () {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;
  var root = document.documentElement;
  var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

  function current() {
    return root.dataset.theme || (systemDark && systemDark.matches ? 'dark' : 'light');
  }
  function sync() {
    var dark = current() === 'dark';
    btn.setAttribute('aria-label', dark ? 'Switch to day mode' : 'Switch to night mode');
    btn.setAttribute('aria-pressed', String(dark));
  }
  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    sync();
  });
  if (systemDark && systemDark.addEventListener) systemDark.addEventListener('change', sync);
  sync();
})();

(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    document.querySelectorAll('video[autoplay]').forEach(function (v) {
      v.removeAttribute('autoplay');
      v.pause();
    });
  }

  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) { io.observe(el); });
})();
