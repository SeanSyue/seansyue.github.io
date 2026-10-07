// D: native scroll, whole-chapter navigation and sheets sized by real content.
const root = document.documentElement;
if (root.dataset.innerStudy) {
  const main = document.querySelector('.folio-shell');
  const header = document.querySelector('.site-header');
  const nav = main.querySelector('.folio-nav, .projects-tools');
  const sheets = [...main.querySelectorAll('.folio-sheet')];
  const anchors = [...main.querySelectorAll('[data-folio-anchor]')];
  const pref = matchMedia('(prefers-reduced-motion:reduce)');
  const units = [];
  const clamp = n => Math.min(1,Math.max(0,n));
  let frame=0, printing=false, pendingHash=false, initialAlign=true;
  function reduced() {return printing || pref.matches || root.dataset.reduce==='true';}
  function flowTop(el) {
    const sheet=el.closest('.folio-sheet');
    if (!sheet) return el.getBoundingClientRect().top+scrollY;
    const marker=anchors.find(a=>a.dataset.folioAnchor===sheet.dataset.folioChapter);
    return marker.getBoundingClientRect().top+scrollY+(innerWidth<=700?-16:-24)
      +el.getBoundingClientRect().top-sheet.getBoundingClientRect().top
      -(parseFloat(el.style.getPropertyValue('--folio-shift'))||0);
  }
  // Case paragraphs follow the reader, while figures stay flat and readable.
  if (root.dataset.innerStudy==='cases') {
    main.querySelectorAll('.case-section .block-head, .case-section > .lede, .case-section .stack > p').forEach(el=>{
      el.classList.add('folio-motion-unit'); units.push(el);
    });
  }
  function draw() {
    frame=0;
    const headerBottom=header.getBoundingClientRect().bottom;
    const navHeight=nav?.offsetHeight || 0;
    root.style.setProperty('--folio-nav-top',`${headerBottom}px`);
    root.style.setProperty('--folio-nav-height',`${navHeight}px`);
    root.style.setProperty('--folio-reading-top',`${headerBottom+navHeight+22}px`);
    const visible=sheets.filter(sheet=>!sheet.hidden && getComputedStyle(sheet).display!=='none');
    if (root.dataset.innerStudy==='projects') {
      sheets.forEach(sheet=>sheet.toggleAttribute('data-folio-last',sheet===visible.at(-1)));
    }
    const enabled=!reduced()&&innerWidth>700;
    visible.forEach((sheet,index)=>{
      // The terminal paper reaches the viewport bottom; an earlier paper
      // cannot show through the old 80px clearance beneath a short last sheet.
      const clearance=sheet.hasAttribute('data-folio-last')?0:80;
      const top=Math.min(headerBottom+navHeight+12+index*3,innerHeight-sheet.offsetHeight-clearance);
      sheet.style.setProperty('--folio-pin',`${top}px`);
      sheet.style.setProperty('--folio-layer',index+1);
      const next=visible[index+1];
      // Rail/links of a fully covered paper cannot receive invisible focus.
      sheet.inert=enabled&&!!next&&next.getBoundingClientRect().top<=headerBottom+navHeight+12+(index+1)*3+.5;
    });
    const links=[...main.querySelectorAll('.folio-nav a[href^="#"]')];
    let active=visible[0];
    visible.forEach(sheet=>{
      const marker=anchors.find(a=>a.dataset.folioAnchor===sheet.dataset.folioChapter);
      if (marker.getBoundingClientRect().top<=headerBottom+navHeight+60) active=sheet;
    });
    // A short final chapter may reach the document bottom before its marker
    // can reach the reading line (especially with reduced motion). Its nav
    // item must still become current when there is no more room to scroll.
    if (scrollY>0 && scrollY+innerHeight>=document.documentElement.scrollHeight-4) active=visible.at(-1);
    links.forEach(link=>{
      if (link.hash.slice(1)===active?.dataset.folioChapter) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
    units.forEach(el=>{
      const value=reduced()||el.contains(document.activeElement)?1:clamp((scrollY+innerHeight*.91-flowTop(el))/Math.min(innerHeight*.3,Math.max(130,el.offsetHeight*.75)));
      const eased=value*value*(3-2*value);
      el.style.setProperty('--folio-reveal',eased.toFixed(4));
      el.style.setProperty('--folio-shift',`${((1-eased)*24).toFixed(2)}px`);
    });
  }
  function schedule(){if(!frame) frame=requestAnimationFrame(draw);}
  document.addEventListener('portfolio:filterchange',event=>{
    if (root.dataset.innerStudy!=='projects') return;
    // Measure the normal-flow grid, never the displaced sticky paper. Align
    // immediately in the same task as filtering, before a shortened page can
    // clamp the old scroll position to its new bottom.
    draw();
    const grid=main.querySelector('#projects-grid');
    const start=grid.getBoundingClientRect().top+scrollY-(innerWidth<=700?16:24)
      -header.getBoundingClientRect().bottom-(nav?.offsetHeight||0)-12;
    window.scrollTo({top:Math.max(0,Math.min(event.detail.previousScroll,start)),behavior:'instant'});
    draw();
  });
  function chapterFor(id) {
    const target=document.getElementById(id);
    return sheets.find(sheet=>sheet.dataset.folioChapter===id) || target?.closest('.folio-sheet');
  }
  function enter(id,instant=false) {
    const sheet=chapterFor(id); if (!sheet) return false;
    const marker=anchors.find(a=>a.dataset.folioAnchor===sheet.dataset.folioChapter);
    draw();
    const top=marker.getBoundingClientRect().top+scrollY-(innerWidth<=700?16:24)
      -header.getBoundingClientRect().bottom-(nav?.offsetHeight||0)-12;
    window.scrollTo({top:Math.max(0,top),behavior:instant||reduced()?'instant':'smooth'});
    return true;
  }
  main.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    if (!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey) return;
    const id=decodeURIComponent(link.hash.slice(1));
    if (!chapterFor(id)) return;
    event.preventDefault(); history.pushState(null,'',`#${id}`); enter(id);
  });
  addEventListener('hashchange',()=>enter(decodeURIComponent(location.hash.slice(1))));
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule);
  addEventListener('pageshow',schedule);
  // Viewer controls may finish loading after fonts. Correct a deep link once
  // their height is known, and stop automatic alignment as soon as Sean acts.
  ['wheel','touchstart','keydown','pointerdown'].forEach(type=>addEventListener(type,()=>{initialAlign=false;},{passive:true}));
  addEventListener('beforeprint',()=>{printing=true;draw();});
  addEventListener('afterprint',()=>{printing=false;schedule();});
  document.addEventListener('focusin',schedule);
  pref.addEventListener('change',schedule);
  new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-reduce','data-theme']});
  new ResizeObserver(schedule).observe(main);
  if(nav) new ResizeObserver(()=>{schedule();if(initialAlign&&location.hash) requestAnimationFrame(()=>{if(initialAlign) enter(decodeURIComponent(location.hash.slice(1)),true);});}).observe(nav);
  sheets.forEach(sheet=>new ResizeObserver(schedule).observe(sheet));
  document.fonts.ready.then(()=>requestAnimationFrame(()=>{draw();if(initialAlign&&location.hash&&!pendingHash){pendingHash=true;enter(decodeURIComponent(location.hash.slice(1)),true);}}));
  draw();
}
