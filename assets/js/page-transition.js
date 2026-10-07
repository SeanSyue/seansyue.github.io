// Runs in the head so arrival state exists before home and reading modules.
(() => {
  const root = document.documentElement;
  const pref = matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'portfolio-page-navigation';
  const replayArrival = new URL(location.href).searchParams.get('intro') === 'replay';
  let suppressArrival = replayArrival;
  let replayDeparture = false;
  const reduced = () => pref.matches || root.dataset.reduce === 'true' || storedReduced();
  function storedReduced() {
    try { return localStorage.getItem('sean-reduce-motion') === 'true'; } catch { return false; }
  }
  const opt = document.createElement('style');
  function preference() { opt.textContent = `@view-transition {navigation:${reduced() || replayDeparture || suppressArrival ? 'none' : 'auto'}}`; }
  document.head.append(opt); preference();
  let pending;
  try { pending = JSON.parse(sessionStorage.getItem(key) || 'null'); sessionStorage.removeItem(key); } catch {}
  const expected = !replayArrival && pending && Date.now()-pending.time < 15000 && pending.path === location.pathname;
  let resolve, captured = false, settled = false;
  const nativeCapable = 'onpagereveal' in window && CSS.supports('view-transition-name','root');
  root.dataset.pageTransition = expected && !reduced() && !nativeCapable ? 'pending' : 'ready';
  window.portfolioArrival = expected && !reduced() ? new Promise(r => { resolve = r; }) : Promise.resolve();
  function settle() {
    if (settled) return;
    settled = true;
    suppressArrival = false; preference();
    root.dataset.pageTransition = 'ready';
    resolve?.();
  }
  addEventListener('pagereveal', event => {
    if (!event.viewTransition || reduced() || replayArrival) {
      event.viewTransition?.skipTransition();
      if (!expected || reduced() || replayArrival) settle();
      return;
    }
    captured = true; settled = false;
    root.dataset.pageTransition = 'native';
    if (!resolve) window.portfolioArrival = new Promise(r => { resolve = r; });
    event.viewTransition.finished.catch(() => {}).then(settle);
  });
  addEventListener('pageswap', event => {
    if (reduced() || replayDeparture) event.viewTransition?.skipTransition();
  });
  addEventListener('pageshow', event => {
    replayDeparture = false; preference();
    if (event.persisted && !captured) settle();
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('motion-toggle')?.addEventListener('click', preference);
    if (!expected || reduced()) { if (!captured) settle(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (captured || settled) return;
      root.dataset.pageTransition = 'fallback';
      const main = document.querySelector('main');
      const effect = main?.animate([
        {opacity:0,transform:`translateY(${Math.min(innerHeight*.18,120)}px)`},
        {opacity:1,transform:'none'}
      ], {duration:780,easing:'cubic-bezier(.22,1,.36,1)'});
      if (effect) effect.finished.catch(() => {}).then(() => { effect.cancel(); settle(); }); else settle();
    }));
  });
  pref.addEventListener('change', preference);
  // Prevent a failed/aborted navigation from leaving the homepage waiting.
  setTimeout(settle,2500);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.download) return;
    const url = new URL(link.href,location.href);
    if (url.origin!==location.origin || url.pathname===location.pathname || !url.pathname.endsWith('/')) return;
    if (link.matches('.site-header .brand') || url.searchParams.get('intro') === 'replay') {
      replayDeparture = true; preference();
      try { sessionStorage.removeItem(key); } catch {}
      return;
    }
    try { sessionStorage.setItem(key,JSON.stringify({path:url.pathname,time:Date.now()})); } catch {}
  });
})();
