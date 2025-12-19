// /js/features.js
// Small module to manage video embeds on the 'Ver lo que pueden hacer' page

const SECTION_SELECTOR = '.feature';
const STORAGE_PREFIX = 'features:video:';

function isYouTube(url){ return /(?:youtube\.com\/watch\?v=|youtu\.be\/)/i.test(url); }
function isVimeo(url){ return /vimeo\.com\//i.test(url); }
function isMP4(url){ return /\.mp4(\?|$)/i.test(url); }

function toYouTubeEmbed(url){
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/);
  if(m && m[1]) return `https://www.youtube.com/embed/${m[1]}`;
  return null;
}

function toVimeoEmbed(url){
  const m = url.match(/vimeo\.com\/(\d+)/);
  if(m && m[1]) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}

function renderEmbed(container, url){
  container.innerHTML = '';
  if(!url){
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.style = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted)';
    empty.textContent = 'Sin vídeo';
    container.appendChild(empty);
    return;
  }

  if(isYouTube(url)){
    const embed = toYouTubeEmbed(url);
    const iframe = document.createElement('iframe');
    iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen','');
    iframe.src = embed || url;
    container.appendChild(iframe);
    return;
  }
  if(isVimeo(url)){
    const embed = toVimeoEmbed(url);
    const iframe = document.createElement('iframe');
    iframe.setAttribute('allow','autoplay; fullscreen; picture-in-picture');
    iframe.setAttribute('allowfullscreen','');
    iframe.src = embed || url;
    container.appendChild(iframe);
    return;
  }
  if(isMP4(url)){
    const video = document.createElement('video');
    video.controls = true; video.src = url; container.appendChild(video); return;
  }
  // fallback: try iframe
  const iframe = document.createElement('iframe');
  iframe.setAttribute('allow','autoplay; fullscreen');
  iframe.src = url;
  container.appendChild(iframe);
}

function saveFor(key, url){ localStorage.setItem(STORAGE_PREFIX + key, url || ''); }
function loadFor(key){ return localStorage.getItem(STORAGE_PREFIX + key) || ''; }

function attachControls(section){
  const key = section.dataset.key || section.id || section.getAttribute('id');
  const wrapper = section.querySelector('.video-wrapper');
  const btnEdit = section.querySelector('[data-action="edit"]');
  const btnRemove = section.querySelector('[data-action="remove"]');
  const btnOpen = section.querySelector('[data-action="open"]');

  function refresh(){ const url = loadFor(key); renderEmbed(wrapper, url); }
  refresh();

  btnEdit.addEventListener('click', ()=>{
    const current = loadFor(key) || '';
    const url = prompt('Pega la URL del vídeo (YouTube, Vimeo o MP4). Dejar vacío para cancelar.', current);
    if(url === null) return;
    const trimmed = url.trim();
    if(trimmed){ saveFor(key, trimmed); } else { saveFor(key, ''); }
    refresh();
  });

  btnRemove.addEventListener('click', ()=>{ if(confirm('Eliminar vídeo de esta sección?')){ saveFor(key,''); refresh(); } });

  btnOpen.addEventListener('click', ()=>{ const url = loadFor(key); if(!url){ alert('No hay vídeo en esta sección.'); return; } window.open(url,'_blank','noopener'); });
}

function init(){
  document.querySelectorAll(SECTION_SELECTOR).forEach(attachControls);

  const addBtn = document.getElementById('add-section');
  if(addBtn){
    addBtn.addEventListener('click', ()=>{
      const title = prompt('Título de la sección (ej: Integraciones)');
      if(!title) return;
      const key = 'custom-' + Date.now();
      const section = document.createElement('section');
      section.className = 'feature'; section.id = key; section.dataset.key = key;
      section.innerHTML = `<h3>${title}</h3><div class="meta">Descripción de la sección</div><div class="video-wrapper" aria-live="polite"><div class="empty" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted)">Sin vídeo</div></div><div class="controls"><button class="btn" data-action="edit">Agregar / Editar</button><button class="btn" data-action="remove">Eliminar</button><button class="btn" data-action="open">Abrir</button></div>`;
      document.querySelector('.grid').appendChild(section);
      attachControls(section);
      // focus on edit
      section.querySelector('[data-action="edit"]').click();
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
