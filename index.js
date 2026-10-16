"use strict";
// CURSOR
const cur=document.getElementById('cur'),ring=document.getElementById('cur-ring');
let mx=window.innerWidth/2,my=window.innerHeight/2,rx=mx,ry=my;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px'});
(function lerp(){rx+=(mx-rx)*0.11;ry+=(my-ry)*0.11;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(lerp)})();
document.querySelectorAll('button,a,.scard,.fstep,.vc').forEach(el=>{
  el.addEventListener('mouseenter',()=>{ring.style.width='56px';ring.style.height='56px';ring.style.borderColor='var(--coral)'});
  el.addEventListener('mouseleave',()=>{ring.style.width='38px';ring.style.height='38px';ring.style.borderColor='rgba(255,255,255,0.35)'});
});

// NAV SCROLL
window.addEventListener('scroll',()=>document.getElementById('nav').classList.toggle('scrolled',scrollY>40));

// HERO TITLE — "Test your idea."
const lines=[
  [{t:'Test',c:''},{t:' '},{t:'your',c:''}],
  [{t:'idea',c:'hl-coral'},{t:'.',c:''}],
];
const titleEl=document.getElementById('heroTitle');
let delay=0.45;
lines.forEach(line=>{
  const d=document.createElement('div');d.style.display='block';
  line.forEach(w=>{
    if(w.t===' '){const s=document.createElement('span');s.style.display='inline-block';s.style.width='0.28em';d.appendChild(s);return}
    const ws=document.createElement('span');ws.className='word';
    w.t.split('').forEach(ch=>{
      const s=document.createElement('span');
      s.className='char'+(w.c?' '+w.c:'');
      s.textContent=ch;s.style.animationDelay=delay+'s';delay+=0.044;
      ws.appendChild(s);
    });
    d.appendChild(ws);
    delay+=0.02;
  });
  titleEl.appendChild(d);
});

// REVEAL
const revs=document.querySelectorAll('.reveal');
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:0.1});
revs.forEach(r=>io.observe(r));

// BARS
const bObs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.querySelectorAll('.d-bar').forEach(b=>b.style.width=b.dataset.w+'%');bObs.unobserve(e.target)}})},{threshold:0.3});
const dc=document.getElementById('diagramCard');if(dc)bObs.observe(dc);
