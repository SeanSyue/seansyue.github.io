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
    // labels come from the page (data-to-day / data-to-night) so they follow the page's language
    btn.setAttribute('aria-label', dark ? (btn.dataset.toDay || 'Switch to day mode') : (btn.dataset.toNight || 'Switch to night mode'));
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

// Slideshow: the row of screens scrolls and snaps on its own (swipe, trackpad,
// arrow keys when focused); the buttons and the counter are extras on top.
// The buttons keep their own index, so they never depend on scroll events.
(function () {
  document.querySelectorAll('.slideshow').forEach(function (show) {
    var track = show.querySelector('.slides');
    var slides = track.children;
    var prev = show.querySelector('.slide-prev');
    var next = show.querySelector('.slide-next');
    var count = show.querySelector('.slide-count');
    if (!slides.length || !prev || !next) return;
    var index = 0;
    function render() {
      count.textContent = (index + 1) + ' / ' + slides.length;
      prev.disabled = index === 0;
      next.disabled = index === slides.length - 1;
    }
    function go(i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: index * track.clientWidth });
      render();
    }
    prev.addEventListener('click', function () { go(index - 1); });
    next.addEventListener('click', function () { go(index + 1); });
    var timer = 0;
    track.addEventListener('scroll', function () {  // swipes and trackpads
      clearTimeout(timer);
      timer = setTimeout(function () {
        index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        render();
      }, 80);
    });
    window.addEventListener('resize', function () { track.scrollTo({ left: index * track.clientWidth }); });
    show.classList.add('is-ready');
    render();
  });
})();

// Language menu: Escape and a click outside close it; switching keeps the section you were reading.
(function () {
  document.querySelectorAll('.lang-switch').forEach(function (menu) {
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    });
    document.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    menu.querySelectorAll('.lang-menu a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (location.hash) link.href = link.href.split('#')[0] + location.hash;
      });
    });
  });
})();
