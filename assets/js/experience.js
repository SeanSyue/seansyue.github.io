// Shared motion for the static portfolio. Content and links work without it.
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const root = document.documentElement;
const home = $('.motion-home');
const pref = matchMedia('(prefers-reduced-motion: reduce)');
const ease = 'cubic-bezier(.22,1,.36,1)';
const active = new Set();
const introAnimations = new Set();
let userReduced = false;
let openingViewport = {width:innerWidth,height:innerHeight,scale:devicePixelRatio};
try { userReduced = localStorage.getItem('sean-reduce-motion') === 'true'; } catch {}
let reduced = pref.matches || userReduced;
let gallery, opening, greeting, skip, profileMotion;
let headingStyle = null;
let run = 0, selectedCap = 'systems';
const workForCap = {systems:'aicc', delivery:null, integration:'heart', quality:'aicc', creative:'image'};
root.dataset.level = 'experimental';

function animate(el, frames, options = {}, group = active) {
  if (!el || reduced || !el.animate) return Promise.resolve();
  const {retain = false, ...timing} = options;
  const effect = el.animate(frames, {duration:850, easing:ease, ...timing});
  group.add(effect);
  return effect.finished.catch(() => {}).finally(() => {
    // Exit/docking effects stay on their last frame until the host hands off
    // visibility/layout and cancels the whole opening in the same task.
    if (!retain) { group.delete(effect); effect.cancel(); }
  });
}
function cancel(group) { group.forEach(effect => effect.cancel()); group.clear(); }
function clearDepth() {
  $$('.skill,.project-cta,.btn').forEach(el => el.style.translate = '');
  if ($('#headline')) $('#headline').style.translate = '';
}
function finishOpening(focus = false) {
  ++run;
  if (headingStyle !== null) {
    $('#headline').style.transform = headingStyle;
    headingStyle = null;
  }
  cancel(introAnimations);
  const inside = opening?.contains(document.activeElement);
  if (opening) { opening.hidden = true; opening.style.background = ''; }
  document.body.classList.remove('opening-playing', 'headline-phase');
  if (home) home.inert = false;
  if ($('.site-header')) $('.site-header').inert = false;
  root.dataset.motion = 'done';
  if (focus || inside) $('[data-intro-replay]')?.focus({preventScroll:true});
}
async function playOpening() {
  await window.portfolioArrival;
  finishOpening(); cancel(active); clearDepth(); gallery?.reset();
  if (!home || reduced || !$('#headline')?.animate) return;
  window.scrollTo({top:0, behavior:'instant'});
  const token = ++run;
  root.dataset.motion = 'greeting';
  opening.hidden = false; greeting.hidden = false;
  document.body.classList.add('opening-playing');
  home.inert = true; $('.site-header').inert = true;
  skip.focus({preventScroll:true});
  const intro = (el, frames, options) => animate(el, frames, options, introAnimations);
  await intro(greeting, [
    {opacity:0, transform:'translateY(90px) rotate(-6deg) scale(.86)', clipPath:'inset(0 0 100% 0)'},
    {opacity:1, transform:'none', clipPath:'inset(0 0 0 0)'}
  ], {duration:650, fill:'both'});
  if (token !== run) return;
  // Measure only after font metrics have settled, including first visits.
  await document.fonts.ready;
  if (token !== run) return;
  await intro(greeting, [{opacity:1}, {opacity:1}], {duration:180});
  if (token !== run) return;
  await intro(greeting, [{opacity:1,transform:'none'}, {opacity:0,transform:'translateY(-70px) rotate(5deg) scale(1.1)'}], {duration:280,fill:'both',retain:true});
  if (token !== run) return;
  greeting.hidden = true;
  const heading = $('#headline'), box = heading.getBoundingClientRect();
  const restingTransform = getComputedStyle(heading).transform;
  headingStyle = heading.style.transform;
  const scale = innerWidth < 700 ? Math.min(1.28,(innerWidth-28)/box.width) : Math.min(1.7,(innerWidth-30)/box.width);
  const tx = (innerWidth - box.width * scale)/2 - box.left;
  const ty = (innerHeight - box.height * scale)/2 - box.top;
  const center = `translate(${tx}px,${ty}px) scale(${scale})`;
  heading.style.transform = center;
  opening.style.background = 'transparent';
  document.body.classList.add('headline-phase');
  root.dataset.motion = 'headline';
  await Promise.all($$('.headline-line').map((line, index) => intro(line, [
    {opacity:0, clipPath:'inset(0 100% 0 0)', transform:`translateX(${index ? 140 : -140}px) rotate(${index ? 8 : -8}deg) skewX(-10deg)`},
    {opacity:1, clipPath:'inset(0 0 0 0)', transform:'none'}
  ], {duration:720, delay:index*180,fill:'both'})));
  if (token !== run) return;
  root.dataset.motion = 'docking';
  await intro(heading, [
    {transform:center},
    {transform:'translate(-15px,-12px) scale(.97)',offset:.82},
    {transform:restingTransform}
  ], {duration:1000,fill:'forwards',retain:true});
  if (token !== run) return;
  finishOpening();
  root.dataset.motion = 'capabilities';
  await Promise.all([
    ...$$('.hero-top,.hero-bottom,.field-label').map(el => animate(el,[{opacity:0,transform:'translateY(20px)'},{opacity:1,transform:'none'}],{duration:600,fill:'both'})),
    ...$$('.skill').map((el,i) => animate(el,[
      {opacity:0,transform:`translate(${i%2 ? 140 : -110}px,${60+i*10}px) rotate(${i%2 ? 9 : -9}deg) scale(.75)`},
      {opacity:1,transform:'none'}
    ],{duration:800,delay:i*95,fill:'both'}))
  ]);
  if (token+1 === run) root.dataset.motion = 'done';
}
function applyReduced() {
  reduced = pref.matches || userReduced;
  root.dataset.reduce = String(reduced);
  root.classList.toggle('motion-reduced',reduced);
  const toggle = $('#motion-toggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed',String(reduced));
    toggle.textContent = reduced ? toggle.dataset.reducedLabel : toggle.dataset.reduceLabel;
  }
  if (reduced) {
    finishOpening(); cancel(active); gallery?.reset(); clearDepth();
    $$('video').forEach(video => video.pause());
  }
  profileMotion?.refresh();
}
$('#motion-toggle')?.addEventListener('click', () => {
  userReduced = !reduced;
  try { localStorage.setItem('sean-reduce-motion',String(userReduced)); } catch {}
  applyReduced();
});
pref.addEventListener('change',applyReduced);
applyReduced();

function drawDiagram(container) {
  if (!container || reduced) return;
  container.querySelectorAll('path').forEach((path,i) => {
    if (getComputedStyle(path).stroke === 'none') return;
    const length = path.getTotalLength();
    animate(path,[{strokeDasharray:`${length} ${length}`,strokeDashoffset:length},
      {strokeDasharray:`${length} ${length}`,strokeDashoffset:0}],{duration:1100,delay:Math.min(i*90,450),fill:'both'});
  });
  container.querySelectorAll('.project-diagram-node,.case-diagram-step').forEach((node,i) => {
    animate(node,[{opacity:.12,transform:'translateY(20px)'},{opacity:1,transform:'none'}],
      {duration:700,delay:i*210,fill:'both'});
  });
}
function selectCapability(key, animated = true) {
  const panel = $(`#cap-${key}`);
  if (!panel) return;
  selectedCap = key;
  home.dataset.evidenceReady = 'true';
  $$('.capability-panel').forEach(el => el.classList.toggle('is-active',el === panel));
  $$('[data-cap]').forEach(el => el.setAttribute('aria-pressed',String(el.dataset.cap === key)));
  $$('[data-cap-link]').forEach(el => {
    if (el.getAttribute('href') === `#cap-${key}`) el.setAttribute('aria-current','true');
    else el.removeAttribute('aria-current');
  });
  if (animated) animate(panel,[{opacity:.2,transform:'translateY(45px)'},{opacity:1,transform:'none'}],{duration:650,fill:'both'});
}
function goToCapabilityChapter(instant = false) {
  const anchor = $('#capability-chapter-start');
  if (!anchor) return;
  const overlap = innerWidth <= 700 ? 16 : 24;
  const headerBottom = $('.site-header').getBoundingClientRect().bottom;
  const top = anchor.getBoundingClientRect().top + scrollY - overlap - headerBottom - 12;
  window.scrollTo({top: Math.max(0,top), behavior: reduced || instant ? 'instant' : 'smooth'});
}
if (home) {
  opening = document.createElement('div');
  opening.className = 'motion-opening'; opening.id = 'opening-overlay'; opening.hidden = true;
  greeting = document.createElement('div'); greeting.className = 'greeting';
  greeting.append(document.createTextNode($('#intro').dataset.greeting));
  const name = document.createElement('small'); name.textContent = 'Sean Syue / 薛文鈞'; greeting.append(name);
  skip = document.createElement('button'); skip.type = 'button'; skip.id = 'skip-intro'; skip.textContent = $('#intro').dataset.introSkip;
  opening.append(greeting,skip); document.body.append(opening);
  skip.addEventListener('click',() => finishOpening(true));
  $('[data-intro-replay]').addEventListener('click',playOpening);
  selectCapability(location.hash.startsWith('#cap-') ? location.hash.slice(5) : 'systems',false);
  $$('[data-cap],[data-cap-link]').forEach(el => el.addEventListener('click',event => {
    event.preventDefault();
    const key = el.dataset.cap || el.getAttribute('href').slice(5);
    selectCapability(key); if (workForCap[key]) gallery?.showProject(workForCap[key]);
    history.replaceState(null,'',`#cap-${key}`);
    if (root.dataset.sectionStudy === 'd') {
      // Hero links enter the whole chapter. Within it, a choice does not
      // consume any of the scroll distance that brings paper 02 on top.
      if (el.matches('[data-cap]')) goToCapabilityChapter();
    } else {
      $(`#cap-${key}`).scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
    }
  }));
  window.addEventListener('hashchange',() => {
    if (location.hash.startsWith('#cap-')) { selectCapability(location.hash.slice(5)); if (root.dataset.sectionStudy === 'd') goToCapabilityChapter(); }
    finishOpening();
  });
  const version = new URL(import.meta.url).search;
  import(`/assets/js/gallery.js${version}`).then(async ({initGallery}) => {
    await window.portfolioArrival;
    gallery = initGallery({getLevel:()=>'experimental',isReduced:()=>reduced,onProject:key=>{
      if (gallery && workForCap[selectedCap] !== key) selectCapability({heart:'integration',aicc:'systems',image:'creative'}[key]);
      if (key === 'aicc') drawDiagram($('.aicc-visual'));
    }});
    if (workForCap[selectedCap] && gallery.current() !== workForCap[selectedCap]) gallery.showProject(workForCap[selectedCap]);
  }).catch(error => console.error('Portfolio gallery:',error));
  let visited = false;
  try { visited = sessionStorage.getItem('sean-opening-seen') === 'true'; sessionStorage.setItem('sean-opening-seen','true'); } catch {}
  const arrival = new URL(location.href);
  const replayRequested = arrival.searchParams.get('intro') === 'replay';
  const skipRequested = arrival.searchParams.get('intro') === 'skip';
  if (replayRequested || skipRequested) {
    arrival.searchParams.delete('intro'); arrival.hash = '';
    history.replaceState(null,'',arrival.href);
    window.scrollTo({top:0,behavior:'instant'});
  }
  if (skipRequested) finishOpening();
  if (!skipRequested && (replayRequested || (!visited && !location.hash)) && !reduced) playOpening();
  if (root.dataset.sectionStudy === 'd' && location.hash.startsWith('#cap-')) document.fonts.ready.then(() => requestAnimationFrame(() => {
    if (location.hash.startsWith('#cap-')) goToCapabilityChapter(true);
  }));
  $('.site-header .brand').addEventListener('click',event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const top = new URL(location.href); top.searchParams.delete('intro'); top.hash = '';
    history.replaceState(null,'',top.href);
    window.scrollTo({top:0,behavior:'instant'});
    playOpening();
  });
  $('.site-header [data-home-nav]')?.addEventListener('click',event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    finishOpening(); gallery?.reset(); clearDepth();
    const top = new URL(location.href); top.searchParams.delete('intro'); top.hash = '';
    history.replaceState(null,'',top.href);
    window.scrollTo({top:0,behavior:'instant'});
  });
  const field = $('.word-field');
  field.addEventListener('pointermove',event => {
    if (reduced || event.pointerType === 'touch' || root.dataset.motion !== 'done') return;
    const box = field.getBoundingClientRect();
    const x = (event.clientX-box.left)/box.width-.5, y = (event.clientY-box.top)/box.height-.5;
    $$('.skill').forEach((el,i) => el.style.translate = `${x*(12+i*7)}px ${y*(12+i*7)}px`);
  });
  field.addEventListener('pointerleave',clearDepth);
}

// Content stays visible until an intersecting element starts its animation.
const seen = new WeakSet();
const observer = new IntersectionObserver(entries => entries.forEach(({target,isIntersecting}) => {
  if (!isIntersecting || seen.has(target) || document.body.classList.contains('opening-playing')) return;
  seen.add(target);
  const tilt = target.matches('.project-tile:not(.project-tile--image),[data-diagram-motion]') ? 0 : 1.4;
  animate(target,[{opacity:0,transform:`translateY(75px) rotate(${tilt}deg) scale(.96)`,clipPath:'inset(0 9% 0 0)'},
    {opacity:1,transform:'none',clipPath:'inset(0 0 0 0)'}],{duration:950,fill:'both'});
}),{threshold:.08});
$$('[data-motion-reveal],[data-diagram-motion]').filter(el => !el.closest('.projects-hero,.case-hero,.profile-heading') && !el.closest('.profile-page') && !(root.dataset.innerStudy === 'cases' && el.closest('.case-section') && !el.matches('[data-diagram-motion]'))).forEach(el => observer.observe(el));

// Diagram motion is independent of the deliberately static page hero.
// Replay after leaving the reading viewport without moving its host.
const diagramVisible = new WeakSet();
const diagramObserver = new IntersectionObserver(entries => entries.forEach(({target,isIntersecting}) => {
  if (!isIntersecting) { diagramVisible.delete(target); return; }
  if (diagramVisible.has(target)) return;
  diagramVisible.add(target);
  Promise.resolve(window.portfolioArrival).then(() => {
    if (diagramVisible.has(target)) drawDiagram(target);
  });
}), {rootMargin:'-18% 0px -12% 0px',threshold:.25});
$$('.project-tile-diagram,[data-diagram-motion]').forEach(el => diagramObserver.observe(el));

const motionVersion = new URL(import.meta.url).search;
if ($('.profile-page')) {
  import(`/assets/js/profile-motion.js${motionVersion}`).then(({initProfileMotion}) => {
    profileMotion = initProfileMotion({isReduced:()=>reduced});
  }).catch(error => console.error('Portfolio reading motion:',error));
}
if ($('.projects-page')) {
  import(`/assets/js/project-viewer.js${motionVersion}`).then(async ({initProjectViewer}) => {
    await window.portfolioArrival;
    initProjectViewer({isReduced:()=>reduced});
  }).catch(error => console.error('Portfolio project view:',error));
}

const filters = $$('[data-project-filter]'), tiles = $$('[data-project-group]');
if (filters.length) {
  const live = document.createElement('p'); live.className = 'sr-only'; live.setAttribute('role','status');
  $('.projects-filters').after(live);
  filters.forEach(button => button.addEventListener('click',() => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    const previousScroll = scrollY;
    cancel(active);
    const group = button.dataset.projectFilter;
    filters.forEach(el => el.setAttribute('aria-pressed',String(el === button)));
    tiles.forEach(tile => {
      tile.hidden = group !== 'all' && tile.dataset.projectGroup !== group;
    });
    document.dispatchEvent(new CustomEvent('portfolio:filterchange',{detail:{group,previousScroll}}));
    tiles.filter(tile => !tile.hidden).forEach((tile,i) => {
      animate(tile,[{opacity:.35},{opacity:1}],{duration:380,delay:i*25,fill:'both'});
    });
    live.textContent = `${button.textContent}: ${tiles.filter(tile => !tile.hidden).length}`;
  }));
}
$$('.project-cta,.btn').forEach(el => {
  el.addEventListener('pointermove',event => {
    if (reduced || event.pointerType === 'touch') return;
    const box = el.getBoundingClientRect();
    el.style.translate = `${(event.clientX-box.left-box.width/2)*.1}px ${(event.clientY-box.top-box.height/2)*.15}px`;
  });
  el.addEventListener('pointerleave',() => el.style.translate = '');
});

// Preserve ordinary static-page URLs, downloads and modified clicks.
// page-transition.js/CSS own the single paper handoff, without a second wipe.
window.addEventListener('resize',() => {
  const next = {width:innerWidth,height:innerHeight,scale:devicePixelRatio};
  // A page attachment may emit resize without changing its viewport. That
  // notification must not cancel the explicit replay immediately after load.
  if (next.width === openingViewport.width && next.height === openingViewport.height && next.scale === openingViewport.scale) return;
  openingViewport = next;
  finishOpening(); gallery?.reset(); clearDepth();
});
window.addEventListener('wheel',() => {if(document.body.classList.contains('opening-playing')) finishOpening();},{passive:true});
window.addEventListener('touchmove',() => {if(document.body.classList.contains('opening-playing')) finishOpening();},{passive:true});
document.addEventListener('keydown',event => {if(event.key === 'Escape' && document.body.classList.contains('opening-playing')) finishOpening(true);});
document.addEventListener('visibilitychange',() => {if(document.hidden) {finishOpening();cancel(active);gallery?.reset();clearDepth();}});
window.addEventListener('beforeprint',() => {finishOpening();cancel(active);gallery?.reset();});
