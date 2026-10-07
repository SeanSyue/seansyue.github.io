// Fade sections in once as they scroll into view, and stop looping preview
// videos for visitors who ask for reduced motion (they keep the poster frame).
// Day / night toggle. The page defaults to light and remembers an explicit choice.
(function () {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;
  var root = document.documentElement;
  var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

  function current() {
    return root.dataset.theme || 'light';
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

// A short introduction is an enhancement to the already readable home page.
// Nothing is scroll-locked, and any intent to read immediately finishes it.
(function () {
  if (document.documentElement.dataset.design === 'motion03') return;
  var hero = document.querySelector('.personal-hero');
  if (!hero) return;
  var target = hero.querySelector('[data-intro-target]');
  var replay = hero.querySelector('[data-intro-replay]');
  if (!target || !target.animate) return;
  var preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var storageKey = 'sean-intro-seen-v1';
  var timers = [], animations = [], overlay = null, active = false;
  var root = document.documentElement;
  var introWidth = 0, introHeight = 0, introScroll = 0;
  var remembered = false;
  try { remembered = sessionStorage.getItem(storageKey) === '1'; } catch (_) {}

  function later(fn, delay) { timers.push(setTimeout(function () {
    if (!active) return;
    try { fn(); } catch (_) { finish('fallback'); }
  }, delay)); }
  function animate(el, frames, options) {
    var animation = el.animate(frames, options);
    animations.push(animation);
    return animation;
  }
  function finish(reason) {
    if (!active) return;
    active = false;
    var hadFocus = overlay && overlay.contains(document.activeElement);
    timers.forEach(clearTimeout); timers = [];
    animations.forEach(function (a) { a.cancel(); }); animations = [];
    if (overlay) overlay.remove(); overlay = null;
    root.classList.remove('intro-running');
    root.classList.toggle('intro-settled', reason === 'done' && !preference.matches);
    hero.dataset.introState = reason;
    try { sessionStorage.setItem(storageKey, '1'); } catch (_) {}
    if (hadFocus && replay) replay.focus({preventScroll: true});
  }
  function begin(manual) {
    finish('interrupted');
    if (preference.matches) {
      hero.dataset.introState = 'reduced-motion';
      return;
    }
    if (!manual && (remembered || location.hash || window.scrollY > 8)) {
      hero.dataset.introState = 'bypassed';
      return;
    }
    active = true;
    introWidth = innerWidth; introHeight = innerHeight;
    introScroll = window.scrollY;
    hero.dataset.introState = 'greeting';
    root.classList.remove('intro-settled');
    overlay = document.createElement('div');
    overlay.className = 'intro-overlay';
    var greeting = document.createElement('div');
    greeting.className = 'intro-greeting';
    greeting.setAttribute('aria-hidden', 'true');
    greeting.appendChild(document.createTextNode(hero.dataset.greeting || "Hi, I’m Sean."));
    var name = document.createElement('small');
    name.textContent = '薛文鈞 / SEAN SYUE';
    greeting.appendChild(name);
    var skip = document.createElement('button');
    skip.type = 'button'; skip.className = 'intro-skip';
    skip.textContent = hero.dataset.introSkip || 'Skip introduction';
    skip.addEventListener('click', function () { finish('skipped'); });
    overlay.appendChild(greeting); overlay.appendChild(skip);
    document.body.appendChild(overlay);
    root.classList.add('intro-running');
    animate(greeting, [{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}], {duration:300,fill:'both',easing:'ease-out'});
    later(function () { animate(greeting,[{opacity:1},{opacity:0}],{duration:220,fill:'forwards'}); }, 850);
    later(function () {
      hero.dataset.introState = 'positioning';
      greeting.remove();
      var box = target.getBoundingClientRect();
      // A replay requested far down the page should never fly to an off-screen target.
      if (box.top < 0 || box.top > innerHeight || box.width === 0) { finish('bypassed'); return; }
      var style = getComputedStyle(target);
      var flight = target.cloneNode(true);
      flight.removeAttribute('id'); flight.removeAttribute('data-intro-target');
      flight.className = 'hero-position intro-flight'; flight.setAttribute('aria-hidden','true');
      Object.assign(flight.style, {left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px',font:style.font,letterSpacing:style.letterSpacing,lineHeight:style.lineHeight,color:style.color,textAlign:style.textAlign});
      flight.querySelectorAll('em').forEach(function (em) { em.style.color = getComputedStyle(target.querySelector('em')).color; });
      var scale = Math.min(1.16,(innerWidth-48)/box.width,(innerHeight*.5)/box.height);
      var dx = (innerWidth-box.width*scale)/2-box.left;
      var dy = (innerHeight-box.height*scale)/2-box.top;
      var centered = 'translate('+dx+'px,'+dy+'px) scale('+scale+')';
      flight.style.transform = centered;
      overlay.appendChild(flight);
      animate(flight,[{opacity:0},{opacity:1}],{duration:240,fill:'forwards'});
      later(function () {
        hero.dataset.introState = 'moving';
        animate(flight,[{transform:centered},{transform:'translate(0,0) scale(1)'}],{duration:650,fill:'forwards',easing:'cubic-bezier(.22,1,.36,1)'});
        animate(overlay,[{backgroundColor:getComputedStyle(overlay).backgroundColor},{backgroundColor:'transparent'}],{duration:650,fill:'forwards'});
        animate(skip,[{opacity:1},{opacity:0}],{duration:150,fill:'forwards'});
        later(function () { finish('done'); },650);
      },550);
    },1100);
    // Defensive cleanup if a browser suspends/cancels an animation midway.
    later(function () { finish('done'); },3000);
  }
  ['wheel','touchstart'].forEach(function (event) {
    window.addEventListener(event,function () { finish('skipped'); },{passive:true});
  });
  window.addEventListener('keydown',function (event) {
    if (active && event.target === replay && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
    finish('skipped');
  });
  window.addEventListener('scroll',function () {
    if (Math.abs(window.scrollY-introScroll) > 2) finish('scrolled');
  },{passive:true});
  window.addEventListener('resize',function () {
    if (innerWidth !== introWidth || innerHeight !== introHeight) finish('resized');
  });
  window.addEventListener('hashchange',function () { finish('navigated'); });
  document.addEventListener('pointerdown',function (event) {
    if (!event.target.closest('[data-intro-replay]')) finish('skipped');
  },{passive:true});
  document.addEventListener('visibilitychange',function () { if (document.hidden) finish('hidden'); });
  if (preference.addEventListener) preference.addEventListener('change',function () { finish('reduced-motion'); });
  if (replay) replay.addEventListener('click',function () {
    // Replaying intentionally returns to the introduction without changing its URL.
    window.scrollTo({top:0,behavior:'instant'});
    try { begin(true); } catch (_) { finish('fallback'); }
  });
  try { begin(false); } catch (_) { finish('fallback'); }
})();

// Stable section links and normal document scrolling use the same evidence.
// The marker follows the section nearest the top reading line, including at
// the end of a long section, where intersection-ratio heuristics tend to fail.
(function () {
  var navs = document.querySelectorAll('.capability-nav, .section-nav');
  navs.forEach(function (nav) {
    if (document.documentElement.dataset.design === 'motion03' && nav.matches('.capability-nav')) return;
    var links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    var pairs = links.map(function (link) {
      return {link:link, section:document.getElementById(link.getAttribute('href').slice(1))};
    }).filter(function (p) { return p.section; });
    if (!pairs.length) return;
    var pending = false;
    function update() {
      pending = false;
      var header = document.querySelector('.site-header');
      var readingLine = (header ? header.getBoundingClientRect().height : 72) + 90;
      var current = pairs[0];
      pairs.forEach(function (p) { if (p.section.getBoundingClientRect().top <= readingLine) current = p; });
      pairs.forEach(function (p) {
        if (p === current) p.link.setAttribute('aria-current','true');
        else p.link.removeAttribute('aria-current');
      });
    }
    function request() { if (!pending) { pending = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll',request,{passive:true});
    window.addEventListener('resize',request);
    window.addEventListener('hashchange',request);
    update();
  });
})();

(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    document.querySelectorAll('video[autoplay]').forEach(function (v) {
      v.removeAttribute('autoplay');
      v.pause();
    });
  }

  if (document.documentElement.dataset.design === 'motion03') { document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('is-in');}); return; }
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
