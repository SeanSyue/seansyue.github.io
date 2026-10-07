const root = document.documentElement;
if(root.dataset.sectionStudy==='d') {
  const sheets=[...document.querySelectorAll('.section-plane')];
  const header=document.querySelector('.site-header');
  const preference=matchMedia('(prefers-reduced-motion:reduce)');
  let queued=false;
  function drawStack() {
    queued=false;
    const reduced=root.dataset.reduce==='true'||preference.matches;
    const intro=document.body.classList.contains('opening-playing');
    const enabled=!reduced&&!intro&&innerWidth>700;
    const headerBottom=header.getBoundingClientRect().bottom;
    sheets.forEach((sheet,index)=>{
      // Tall sheets read in normal flow before their bottom rests and the
      // next paper covers it. The final Contact sheet reaches the viewport bottom.
      const pin=Math.min(headerBottom+index*12,innerHeight-sheet.offsetHeight-(sheet.classList.contains('plane-contact')?0:90));
      sheet.style.setProperty('--sheet-top',`${enabled?pin:headerBottom}px`);
    });
    sheets.forEach((sheet,index)=>{
      const next=sheets[index+1];
      sheet.inert=enabled&&!!next&&next.getBoundingClientRect().top<=headerBottom+index*12;
    });
    const contact=document.querySelector('.plane-contact');
    const marker=document.querySelector('#contact-chapter-start');
    if(contact&&marker) {
      const flow=marker.getBoundingClientRect().top+scrollY-(innerWidth<=700?16:24);
      contact.querySelectorAll('[data-contact-reveal]').forEach((el,index)=>{
        const ownShift=Number(el.style.getPropertyValue('--contact-shift').replace('px',''))||0;
        const offset=el.getBoundingClientRect().top-contact.getBoundingClientRect().top-ownShift;
        const value=reduced||el.contains(document.activeElement)?1:Math.max(0,Math.min(1,(scrollY+innerHeight*.96-flow-offset-index*6)/100));
        const eased=value*value*(3-2*value);
        el.style.setProperty('--contact-reveal',eased.toFixed(4));
        el.style.setProperty('--contact-shift',`${((1-eased)*20).toFixed(2)}px`);
      });
    }
  }
  function scheduleStack(){if(!queued){queued=true;requestAnimationFrame(drawStack);}}
  addEventListener('scroll',scheduleStack,{passive:true});
  addEventListener('resize',scheduleStack);
  preference.addEventListener('change',scheduleStack);
  new MutationObserver(scheduleStack).observe(root,{attributes:true,attributeFilter:['data-reduce','data-motion','data-project']});
  new ResizeObserver(scheduleStack).observe(document.querySelector('.motion-home'));
  sheets.forEach(sheet=>new ResizeObserver(scheduleStack).observe(sheet));
  document.fonts.ready.then(scheduleStack);
  function enterContact(instant=false) {
    const anchor=document.querySelector('#contact-chapter-start'); if(!anchor) return;
    window.scrollTo({top:Math.max(0,anchor.getBoundingClientRect().top+scrollY-(innerWidth<=700?16:24)-header.getBoundingClientRect().bottom-12),behavior:instant||root.dataset.reduce==='true'||preference.matches?'instant':'smooth'});
  }
  if(document.querySelector('#contact-chapter-start')) {
    document.addEventListener('click',event=>{
      const link=event.target.closest('a[href]'); if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey) return;
      const url=new URL(link.href,location.href);
      if(url.origin===location.origin&&url.pathname===location.pathname&&url.hash==='#contact') {
        event.preventDefault(); history.pushState(null,'','#contact'); enterContact();
      }
    });
    addEventListener('hashchange',()=>{if(location.hash==='#contact') enterContact();});
    document.fonts.ready.then(()=>requestAnimationFrame(()=>{if(location.hash==='#contact') enterContact(true);}));
  }
  scheduleStack();
}
