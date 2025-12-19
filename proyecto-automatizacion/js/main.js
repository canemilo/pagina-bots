// /js/main.js
// Centralized behaviors: analytics init, share buttons, subscribe form, service worker, and physics animation

// Respect reduced motion preference
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function safeGtagConfig(){
  try{ if(typeof gtag === 'function') gtag('config', 'GA_MEASUREMENT_ID'); }catch(e){}
}

function initEvents(){
  // CTA clicks
  document.querySelectorAll('.cta').forEach(btn => {
    btn.addEventListener('click', () => {
      try{ gtag('event','click', { 'event_category':'CTA', 'event_label':'Ver lo que pueden hacer' }); }catch(e){}
    });
  });

  // Share buttons
  document.querySelectorAll('.share-btn').forEach(btn=>{
    btn.addEventListener('click', function(){
      const network = this.dataset.network;
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(document.querySelector('header h1').innerText + ' — Automatización Inteligente');
      let href = '';
      if(network === 'twitter') href = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
      else if(network === 'linkedin') href = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
      const w = window.open(href, '_blank', 'noopener,noreferrer');
      try{ if (w) w.opener = null; } catch(e){}
      try{ gtag('event','share', { 'event_category':'Social', 'event_label':network }); }catch(e){}
    });
  });

  // Subscribe form using Fetch
  const form = document.getElementById('subscribe-form');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const submitBtn = form.querySelector('.subscribe-btn');
      submitBtn.disabled = true;
      const data = new FormData(form);
      fetch(form.action, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(()=>{
          const msg = document.getElementById('subscribe-msg');
          msg.textContent = '¡Gracias! Revisa tu correo para confirmar.';
          msg.style.display = 'block';
          msg.setAttribute('aria-live','polite');
          try{ gtag('event','subscribe',{ 'method':'formspree' }); }catch(e){}
          form.reset();
        }).catch(()=>{
          const msg = document.getElementById('subscribe-msg');
          msg.textContent = 'Error enviando. Por favor inténtalo de nuevo.';
          msg.style.display = 'block';
        }).finally(()=>{ submitBtn.disabled = false; });
    });
  }

  // Service worker registration
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
}

// Floating circles removed — initCircles is intentionally a no-op now.
function initCircles(){ /* removed */ }
}

// Initialize everything on DOM ready
document.addEventListener('DOMContentLoaded', function(){
  safeGtagConfig();
  initEvents();
  initSnapshotBuilder();
});

// Snapshot Builder — genera una propuesta rápida para incentivar demo/lead
function initSnapshotBuilder(){
  const taskButtons = document.querySelectorAll('.task-choices button');
  const volumeEl = document.getElementById('snapshot-volume');
  const complexityEl = document.getElementById('snapshot-complexity');
  const budgetEl = document.getElementById('snapshot-budget');
  const emailEl = document.getElementById('snapshot-email');
  const generateBtn = document.getElementById('snapshot-generate');
  const copyBtn = document.getElementById('snapshot-copy');
  const downloadBtn = document.getElementById('snapshot-download');
  const demoLink = document.getElementById('snapshot-demo');
  const outTier = document.getElementById('snapshot-tier');
  const outDesc = document.getElementById('snapshot-desc');
  const outBullets = document.getElementById('snapshot-bullets');
  const outRegion = document.getElementById('snapshot-output');
  if(!volumeEl||!complexityEl||!outTier) return;

  const KEY = 'snapshot:inputs:v1';
  const WEIGHTS = { emails:1, scraping:1.2, files:0.9, reports:1.1, integration:1.4 };

  function getSelectedTypes(){
    return Array.from(taskButtons).filter(b=> b.classList.contains('active')).map(b=> b.dataset.type);
  }

  function load(){ try{ const s = localStorage.getItem(KEY); if(s){ const o = JSON.parse(s); (o.types||[]).forEach(t=>{ const b = document.querySelector(`.task-choices button[data-type="${t}"]`); if(b) b.classList.add('active'); }); volumeEl.value = o.volume ?? volumeEl.value; complexityEl.value = o.complexity ?? complexityEl.value; budgetEl.value = o.budget ?? budgetEl.value; emailEl.value = o.email ?? emailEl.value; } }catch(e){} }
  function save(obj){ try{ localStorage.setItem(KEY, JSON.stringify(obj)); }catch(e){} }

  function formatEUR(v){ try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v);}catch(e){ return v; } }

  function compute(){
    const types = getSelectedTypes();
    const volume = Math.max(0, Number(volumeEl.value)||0);
    const complexity = Math.max(1, Number(complexityEl.value)||1);
    const budget = Math.max(0, Number(budgetEl.value)||0);

    // score = volume factor * complexity * avg weight
    const weightAvg = types.length ? types.map(t=> WEIGHTS[t]||1).reduce((a,b)=>a+b,0)/types.length : 1;
    const score = (volume/10) * complexity * weightAvg;

    let tier = 'Starter';
    if(score >= 40) tier = 'Enterprise';
    else if(score >= 15) tier = 'Pro';

    const leadWeeks = Math.max(1, Math.ceil(complexity * 1.5));
    const estMin = Math.round((complexity * 150) + (weightAvg * 40));
    const estMax = Math.round(estMin * 2.2 + (volume*2));

    const bullets = [];
    if(types.length) bullets.push(`Casos: ${types.join(', ')}`);
    bullets.push(`Volumen estimado: ${volume} / semana`);
    bullets.push(`Complejidad: ${complexity} / 5`);
    bullets.push(`Tiempo estimado para demo: ${leadWeeks} semanas`);
    bullets.push(`Rango orientativo: ${formatEUR(estMin)} – ${formatEUR(estMax)}`);
    if(budget>0) bullets.push(`Presupuesto indicado: ${formatEUR(budget)}`);

    const description = `Propuesta ${tier}: trabajo recomendado y beneficios principales.`;

    const summary = {
      types, volume, complexity, budget, tier, leadWeeks, estMin, estMax, bullets
    };

    // render
    outTier.textContent = `${tier} · ${formatEUR(estMin)} – ${formatEUR(estMax)}`;
    outDesc.textContent = description;
    outBullets.innerHTML = '';
    bullets.forEach(b=>{ const li = document.createElement('li'); li.textContent = b; outBullets.appendChild(li); });
    outBullets.setAttribute('aria-hidden','false');

    // demo mailto prefill
    if(demoLink){
      const subject = encodeURIComponent('Solicitud de demo - Snapshot');
      const body = encodeURIComponent(`Hola,%0A%0AHe generado un snapshot:%0A- Casos: ${types.join(', ')}%0A- Volumen: ${volume}%0A- Complejidad: ${complexity}%0A- Rango estimado: ${formatEUR(estMin)} – ${formatEUR(estMax)}%0A%0AMe interesaría una demo basada en estos datos.%0AEmail de contacto: ${emailEl.value || '[no proporcionado]'}`);
      demoLink.href = `mailto:info@your-domain.com?subject=${subject}&body=${body}`;
    }

    // save
    save({ types, volume, complexity, budget, email: emailEl.value });

    try{ gtag && gtag('event','snapshot_generate',{ tier, estMin, estMax }); }catch(e){}

    return summary;
  }

  // UI events
  taskButtons.forEach(b=> b.addEventListener('click', ()=>{ b.classList.toggle('active'); compute(); }));
  [volumeEl, complexityEl, budgetEl, emailEl].forEach(el=> el.addEventListener('input', ()=>{ clearTimeout(window._snapshot_input_timer); window._snapshot_input_timer = setTimeout(compute, 220); }));

  generateBtn && generateBtn.addEventListener('click', ()=>{ compute(); try{ gtag && gtag('event','snapshot_manual_generate'); }catch(e){} });
  copyBtn && copyBtn.addEventListener('click', ()=>{ const s = compute(); const text = `Snapshot: ${s.tier} · ${formatEUR(s.estMin)}–${formatEUR(s.estMax)}\n${s.bullets.join('\n')}`; navigator.clipboard.writeText(text).then(()=>{ copyBtn.textContent = 'Copiado'; setTimeout(()=> copyBtn.textContent = 'Copiar resumen', 1200); try{ gtag && gtag('event','snapshot_copy'); }catch(e){} }); });
  downloadBtn && downloadBtn.addEventListener('click', ()=>{ const s = compute(); const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'snapshot.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); try{ gtag && gtag('event','snapshot_download'); }catch(e){} });

  load(); compute();
}
