/* =========================================================
   NUESTRO PLAN — modelo unificado de Meta
   tipos: imprevistos | invertir | sueno | personal(sistema)
   ========================================================= */

const CFG_DEF={
  nombreP1:'Persona 1',
  nombreP2:'Persona 2',
  perfil:'p1',
  nominaP1:0,
  nominaP2:0,
  gastos:0,
  planPareja:0,
  libreP1:0,
  libreP2:0,
  pctPremio:20,
  modoPremio:'igual',      // igual | proporcional | personalizado
  pctPremioP1:50,
  estrategia:'secuencial', // secuencial | simultaneo
  soloAhorroDirecto:false,
  ahorroDirecto:0,
  onboarded:false,
  modo:'pareja'            // pareja | individual
};
function metasEjemplo(){
  return [];
}
function metasPersonales(){
  return [
    {id:'personal-p1',nombre:'Personal',tipo:'personal',dueno:'p1',sistema:true,saldo:0,aportes:[]},
    {id:'personal-p2',nombre:'Personal',tipo:'personal',dueno:'p2',sistema:true,saldo:0,aportes:[]}
  ];
}

let state={config:{},metas:[],log:[],ingresos:[],gastos:[]};
let curTab=0, firstFlow=true, curMetasSubTab=1, curAhorrosFilter='all';
let mForm=null; // estado del formulario de meta en edición
let especialesPendientes=[]; // ingresos especiales pendientes de aplicar este cierre
let selectedMonth=''; // mes seleccionado en cierre de mes (inicializado dinámicamente)
let obMetaNom_temp = '', obMetaObj_temp = '', obMetaMin_temp = '';
let obMetaCreatedId = null; // id de la meta creada en onboarding, para reemplazarla (no duplicar) al navegar atrás/adelante
let _pctFlashId = null; // id de meta cuyo % se auto-ajustó; dispara flash visual en el próximo render

// Sync Firebase
let currentUser = null;       // firebase.User | null
let currentPlanId = null;     // string | null — ID del plan activo
let isOwner = false;          // true si este usuario es el owner del plan
let unsubscribeSync = null;   // función para cancelar listener de Firestore
let planMeta = null;          // Objeto con metadatos del plan (owner, partner, roles)
let unsubscribeMeta = null;   // función para cancelar listener de metadatos

const store={
  async get(){try{if(window.storage){const r=await window.storage.get('plan2');if(r&&r.value)return r.value;}}catch(e){}try{return localStorage.getItem('plan2');}catch(e){return null;}},
  async set(v){let ok=false;try{if(window.storage){await window.storage.set('plan2',v,false);ok=true;}}catch(e){}try{localStorage.setItem('plan2',v);ok=true;}catch(e){}return ok;}
};

const $=id=>document.getElementById(id);
const fmt=n=>'$'+Math.round(n||0).toLocaleString('es-CO');
const fmtK=n=>{n=Math.round(n||0);if(n>=1000000)return '$'+(n/1000000).toLocaleString('es-CO',{maximumFractionDigits:1})+'M';if(n>=1000)return '$'+Math.round(n/1000)+'k';return '$'+n;};
const parse=s=>parseInt(String(s).replace(/\D/g,''),10)||0;
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}
// Paleta categórica para donas (metas). Evita lila/rosa, reservados a bolsillos individuales (persona).
const DONUT_PALETTE=['#d9a84a','#5b9aa0','#c87a53','#7fae6e','#6f8fc7','#b5923f','#7bc0b8','#c0673f','#4c936b','#8aa84a'];
function getSVG(name, cls='', style='') {
  const icons = {
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
    target: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>',
    dollar: '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
    trending: '<polyline points="22 7 13.5 15.5 8.5 11.5 2 18"></polyline><polyline points="16 7 22 7 22 13"></polyline>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
    card: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
    lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .4 2.5 1.5 3.5.7.8 1.3 1.5 1.5 2.5M9 18h6M10 22h4"></path>',
    party: '<path d="M4 22L14 12M14 4l.01-.01M18 8l.01-.01M17 3l3 3M19 2l1.35 1.35M12 2v2M20 10h2M19 14l2.5 2.5M10 19l2.5 2.5"></path>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
    unlock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>',
    phone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>',
    drag: '<circle cx="9" cy="5" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle>',
    chevronDown: '<polyline points="6 9 12 15 18 9"></polyline>',
    info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>'
  };
  const path = icons[name] || '';
  const cAttr = cls ? ` class="${cls}"` : '';
  const sAttr = style ? ` style="${style}"` : '';
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${cAttr}${sAttr}>${path}</svg>`;
}
function flash(m){const t=$('toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),1900);}
let _undoTimer=null;
/* Toast con botón "Deshacer" que dura `ms`. onUndo() se ejecuta si el usuario alcanza a tocarlo. */
function flashUndo(m,onUndo,ms=6000){
  const prev=$('undo-toast');if(prev)prev.remove();
  if(_undoTimer){clearTimeout(_undoTimer);_undoTimer=null;}
  const el=document.createElement('div');
  el.id='undo-toast';el.className='undo-toast';
  el.innerHTML=`<span>${m}</span><button type="button" id="undo-toast-btn" class="undo-toast-btn">Deshacer</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('on'));
  const dismiss=()=>{if(_undoTimer){clearTimeout(_undoTimer);_undoTimer=null;}el.classList.remove('on');setTimeout(()=>{if(el.parentNode)el.remove();},250);};
  $('undo-toast-btn').onclick=()=>{dismiss();onUndo();};
  _undoTimer=setTimeout(dismiss,ms);
}
function showCustomModal({ title, message, type = 'alert', placeholder = '', isDestructive = false }) {
  return new Promise((resolve) => {
    let overlay = $('custom-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'custom-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }
    let buttonsHtml = '';
    let inputHtml = '';
    if (type === 'prompt') {
      inputHtml = `
        <div class="modal-input-wrapper">
          <input type="text" id="modal-input" class="sf" value="${placeholder}" autocomplete="off" />
        </div>
      `;
      buttonsHtml = `
        <button class="btn ghost" id="modal-btn-cancel">Cancelar</button>
        <button class="btn" id="modal-btn-ok">Aceptar</button>
      `;
    } else if (type === 'confirm') {
      const confirmClass = isDestructive ? 'btn danger' : 'btn';
      buttonsHtml = `
        <button class="btn ghost" id="modal-btn-cancel">Cancelar</button>
        <button class="${confirmClass}" id="modal-btn-ok">Confirmar</button>
      `;
    } else {
      buttonsHtml = `
        <button class="btn" id="modal-btn-ok">Entendido</button>
      `;
    }
    overlay.innerHTML = `
      <div class="modal-card animate-in">
        <h3 class="modal-title">${title || 'Atención'}</h3>
        <p class="modal-msg">${message}</p>
        ${inputHtml}
        <div class="modal-actions">
          ${buttonsHtml}
        </div>
      </div>
    `;
    overlay.style.display = 'flex';
    if (type === 'prompt') {
      setTimeout(() => {
        const inp = $('modal-input');
        if (inp) {
          inp.focus();
          inp.select();
        }
      }, 50);
    }
    const btnOk = $('modal-btn-ok');
    const btnCancel = $('modal-btn-cancel');
    const inputField = $('modal-input');
    const cleanup = () => {
      overlay.style.display = 'none';
      overlay.innerHTML = '';
      document.removeEventListener('keydown', handleKeydown);
    };
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(type === 'prompt' ? null : false);
      } else if (e.key === 'Enter') {
        if (document.activeElement !== btnCancel) {
          btnOk.click();
        }
      }
    };
    document.addEventListener('keydown', handleKeydown);
    btnOk.onclick = () => {
      let value = true;
      if (type === 'prompt') {
        value = inputField ? inputField.value : '';
      }
      cleanup();
      resolve(value);
    };
    if (btnCancel) {
      btnCancel.onclick = () => {
        cleanup();
        resolve(type === 'prompt' ? null : false);
      };
    }
  });
}
function customAlert(message) {
  return showCustomModal({ title: 'Atención', message, type: 'alert' });
}
function customConfirm(message, isDestructive = false) {
  return showCustomModal({ title: 'Confirmar', message, type: 'confirm', isDestructive });
}
function customPrompt(message, defaultText = '') {
  return showCustomModal({ title: 'Ingresar dato', message, type: 'prompt', placeholder: defaultText });
}
function showCustomMonthPicker(currentVal, allowClear = false) {
  return new Promise((resolve) => {
    let [year, month] = (currentVal || curMonth()).split('-').map(Number);
    let overlay = $('custom-month-picker-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'custom-month-picker-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    const renderPicker = () => {
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      let gridHtml = '';
      monthNames.forEach((name, idx) => {
        const mVal = idx + 1;
        const isSelected = (mVal === month && year === Number((currentVal || curMonth()).split('-')[0]));
        const btnClass = isSelected ? 'month-btn selected' : 'month-btn';
        gridHtml += `<button class="${btnClass}" data-m="${mVal}">${name}</button>`;
      });

      let actionsHtml = '';
      if (allowClear) {
        actionsHtml = `
          <div class="modal-actions" style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="btn ghost" id="picker-clear" style="margin: 0; padding: 10px 8px; border-color: #a23; color: #a23;">Borrar</button>
            <button class="btn ghost" id="picker-cancel" style="margin: 0; padding: 10px 8px;">Cancelar</button>
          </div>
        `;
      } else {
        actionsHtml = `
          <div class="modal-actions" style="margin-top: 16px;">
            <button class="btn ghost" id="picker-cancel">Cancelar</button>
          </div>
        `;
      }

      overlay.innerHTML = `
        <div class="modal-card month-picker-card animate-in">
          <div class="month-picker-header">
            <button class="nav-year" id="prev-year">‹</button>
            <span class="picker-year">${year}</span>
            <button class="nav-year" id="next-year">›</button>
          </div>
          <div class="month-picker-grid">
            ${gridHtml}
          </div>
          ${actionsHtml}
        </div>
      `;

      $('prev-year').onclick = (e) => { e.stopPropagation(); year--; renderPicker(); };
      $('next-year').onclick = (e) => { e.stopPropagation(); year++; renderPicker(); };

      overlay.querySelectorAll('.month-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const selectedM = String(btn.dataset.m).padStart(2, '0');
          cleanup();
          resolve(`${year}-${selectedM}`);
        };
      });

      if (allowClear) {
        const clearBtn = $('picker-clear');
        if (clearBtn) {
          clearBtn.onclick = (e) => {
            e.stopPropagation();
            cleanup();
            resolve('');
          };
        }
      }

      $('picker-cancel').onclick = (e) => {
        e.stopPropagation();
        cleanup();
        resolve(null);
      };
    };

    const cleanup = () => {
      overlay.style.display = 'none';
      overlay.innerHTML = '';
    };

    overlay.style.display = 'flex';
    renderPicker();
  });
}
let _syncTimer = null;
function showSyncStatus(msg, isError = false, sticky = false) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  if (!msg) { el.style.display = 'none'; return; }
  _syncTimer = setTimeout(() => {
    el.textContent = msg;
    el.style.background = isError ? '#7a2222' : 'var(--green)';
    el.style.display = 'block';
    if (!sticky) _syncTimer = setTimeout(() => { el.style.display = 'none'; }, 2000);
  }, sticky ? 0 : 800);
}
// Estado de conexión visible y persistente. Al volver la señal NO se escribe
// automáticamente (un write automático con datos viejos pisaría a la pareja);
// el próximo guardado natural del usuario sube los cambios.
window.addEventListener('offline', () => showSyncStatus('Sin conexión · cambios solo en este teléfono', true, true));
window.addEventListener('online', () => showSyncStatus('Conexión recuperada ✓'));
function canEditShared() {
  if (!currentUser) return true;
  if (isOwner) return true;
  return planMeta && planMeta.partnerRole !== 'viewer';
}
const MONTHS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtMes(ym){if(!ym)return'';const[y,m]=ym.split('-');return MONTHS[(+m)-1]+' '+y;}
function fmtFecha(d){if(!d)return'';const p=d.split('-');return p[2]+' '+MONTHS[(+p[1])-1]+' '+p[0];}
function curMonth(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function isMonthOpen(mes){
  const cur=curMonth();
  if(mes===cur) return true;
  const d=new Date();
  if(d.getDate()>5) return false;
  const [cy,cm]=cur.split('-').map(Number);
  const [my,mm]=mes.split('-').map(Number);
  return (cy===my&&cm===mm+1)||(cy===my+1&&cm===1&&mm===12);
}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function monthsUntil(ym){const[y,mo]=ym.split('-').map(Number);const n=new Date();return Math.max(0,(y-n.getFullYear())*12+(mo-n.getMonth()-1));}
// Meses entre una fecha de creación (YYYY-MM-DD) y un mes objetivo (YYYY-MM). Duración planeada fija.
function monthsBetweenYM(fromYMD, toYM){if(!fromYMD||!toYM)return null;const[fy,fm]=fromYMD.split('-').map(Number);const[ty,tm]=toYM.split('-').map(Number);return Math.max(0,(ty-fy)*12+(tm-fm));}
function addMonths(n){const d=new Date();d.setMonth(d.getMonth()+Math.max(0,Math.round(n)));return MONTHS[d.getMonth()]+' '+d.getFullYear();}
function perfilNombre(p){return p==='p1'?state.config.nombreP1:state.config.nombreP2;}
function libreOf(p){return p==='p1'?state.config.libreP1:state.config.libreP2;}
function shiftMonth(ym, delta) {
  let [y, m] = ym.split('-').map(Number);
  let d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

/* ---------- teclado virtual: ocultar fade ---------- */
document.addEventListener('focusin', (e) => {
  if (e.target.matches('input, textarea, select')) {
    document.body.classList.add('keyboard-open');
  }
});
document.addEventListener('focusout', () => {
  setTimeout(() => {
    const active = document.activeElement;
    if (!active || !active.matches('input, textarea, select')) {
      document.body.classList.remove('keyboard-open');
    }
  }, 150);
});

/* ---------- persistencia ---------- */
function normalize(){
  state.config=Object.assign({},CFG_DEF,state.config||{});
  if(Array.isArray(state.config.gastosFijos)){state.config.gastos=state.config.gastosFijos.reduce((s,x)=>s+(x.v||0),0);delete state.config.gastosFijos;}
  if(typeof state.config.gastos!=='number')state.config.gastos=CFG_DEF.gastos;
  if(state.config.modo==='individual'){
    state.config.perfil='p1';
    state.config.planPareja=0;
    state.config.libreP2=0;
    state.config.nominaP2=0;
  }
  if(!['p1','p2'].includes(state.config.perfil))state.config.perfil='p1';
  if(!Array.isArray(state.metas)||!state.metas.length){
    state.metas=metasEjemplo().concat(metasPersonales());
  }
  // garantizar metas personales
  ['p1','p2'].forEach(p=>{
    let m=state.metas.find(x=>x.tipo==='personal'&&x.dueno===p);
    if(!m){state.metas.push({id:'personal-'+p,nombre:'Personal',tipo:'personal',dueno:p,sistema:true,saldo:0,aportes:[]});}
    else{if(typeof m.saldo!=='number')m.saldo=0;if(!Array.isArray(m.aportes))m.aportes=[];}
  });
  state.metas.forEach(m=>{
    if(typeof m.saldo!=='number')m.saldo=0;
    if(m.tipo==='personal')return;
    // migrar modelo viejo {aporte,aporteTipo} -> {aporteFijo,aportePct}
    if(m.aporte!==undefined){
      if(m.aporteTipo==='pct')m.aportePct=m.aporte;else m.aporteFijo=m.aporte;
      delete m.aporte;delete m.aporteTipo;
    }
    if(typeof m.aporteFijo!=='number')m.aporteFijo=0;
    if(typeof m.aportePct!=='number')m.aportePct=0;
    if(typeof m.objetivo!=='number')m.objetivo=0;
    if(m.tipo==='deuda') {
      if(typeof m.pagoMinimo!=='number')m.pagoMinimo=0;
    }
  });
  state.log=Array.isArray(state.log)?state.log:[];
  state.ingresos=Array.isArray(state.ingresos)?state.ingresos:[];
  state.gastos=Array.isArray(state.gastos)?state.gastos:[];

  // Alinear aportes y saldo de los bolsillos principales del sistema con el log
  const perfilActive = state.config.perfil;
  const perActive = state.metas.find(x => x.tipo === 'personal' && x.dueno === perfilActive && x.sistema === true);
  if (perActive) {
    state.log.forEach(entry => {
      if (entry.aplicado && entry.reparto) {
        const val = perfilActive === 'p1' ? entry.reparto.gustosP1 : entry.reparto.gustosP2;
        const ya = perActive.aportes.find(x => x.mes === entry.mes);
        if (!ya) {
          perActive.saldo += val;
          perActive.aportes.push({ mes: entry.mes, monto: val });
        } else if (ya.monto !== val) {
          perActive.saldo += val - ya.monto;
          ya.monto = val;
        }
      }
    });

    if (!Array.isArray(perActive.inmediatosAplicados)) perActive.inmediatosAplicados = [];
    state.log.forEach(entry => {
      (entry.especiales || []).forEach(ep => {
        if (ep.aplicadoInmediato && ep.id) {
          if (!perActive.inmediatosAplicados.includes(ep.id)) {
            const pctR = ep.pctRetener || 0;
            const ret = (pctR / 100) * ep.monto;
            let share = 0;
            if (ep.persona === perfilActive) share = ret;
            else if (ep.persona === 'ambos') share = ret * 0.5;
            
            if (share > 0) {
              const { dist, rem } = distribuirAhorroIndividual(perfilActive, share, true);
              Object.keys(dist).forEach(id => {
                const m = metaById(id);
                if (m) {
                  if (m.tipo === 'deuda') {
                    m.saldo = Math.max(0, m.saldo - dist[id]);
                  } else {
                    m.saldo += dist[id];
                  }
                }
              });
              perActive.saldo += rem;
            }
            perActive.inmediatosAplicados.push(ep.id);
          }
        }
      });
    });
  }
}

// --- Firebase Sync Helpers ---
let unsubscribeBolsillos = null;

function getPlanId() {
  const params = new URLSearchParams(window.location.search);
  const urlPlan = params.get('plan');
  if (urlPlan) {
    localStorage.setItem('planId', urlPlan);
    window.history.replaceState({}, '', window.location.pathname);
    return urlPlan;
  }
  let id = localStorage.getItem('planId');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('planId', id);
  }
  return id;
}

async function syncLoadShared(planId) {
  const doc = await db.collection('planes').doc(planId).collection('shared').doc('data').get();
  if (!doc.exists) return null;
  return doc.data();
}

async function syncSaveShared(planId, stateToSave) {
  const { config, metas, log, ingresos, gastos } = stateToSave;
  const configSinPerfil = { ...config };
  delete configSinPerfil.perfil;
  const metasSinBolsillo = metas.filter(m => m.tipo !== 'personal');
  await db.collection('planes').doc(planId)
    .collection('shared').doc('data')
    .set({
      config: configSinPerfil,
      metas: metasSinBolsillo,
      log,
      ingresos,
      gastos,
      lastEditBy: stateToSave.config.perfil || 'p1',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function syncRegisterOwner(planId, uid) {
  await db.collection('meta').doc(planId).set({
    ownerUid: uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function syncCheckOwner(planId, uid) {
  const doc = await db.collection('meta').doc(planId).get();
  if (!doc.exists) return false;
  return doc.data().ownerUid === uid;
}

let _lastEditNotif = 0;
let _firstSyncSnapshot = true;
function syncSubscribe(planId) {
  _firstSyncSnapshot = true;
  if (unsubscribeSync) unsubscribeSync();
  unsubscribeSync = db.collection('planes').doc(planId)
    .collection('shared').doc('data')
    .onSnapshot(doc => {
      if (!doc.exists) return;
      const remote = doc.data();
      // Aviso "tu pareja editó": ignora el eco de escrituras propias.
      const esEco = (doc.metadata && doc.metadata.hasPendingWrites) || remote.lastEditBy === state.config.perfil;
      const remoteUpdatedMs = (remote.updatedAt && remote.updatedAt.toMillis) ? remote.updatedAt.toMillis() : 0;
      if (_firstSyncSnapshot) {
        // Primera carga de la sesión: ¿hubo cambios del otro mientras no estabas?
        _firstSyncSnapshot = false;
        const lastSeen = Number(localStorage.getItem('lastSeenUpdate') || 0);
        if (remote.lastEditBy && !esEco && remoteUpdatedMs > lastSeen) {
          _lastEditNotif = Date.now();
          flash('✎ ' + perfilNombre(remote.lastEditBy) + ' actualizó el plan mientras no estabas');
        }
      } else if (remote.lastEditBy && !esEco && Date.now() - _lastEditNotif > 8000) {
        // Cambio en vivo con la app abierta.
        _lastEditNotif = Date.now();
        flash('✎ ' + perfilNombre(remote.lastEditBy) + ' actualizó el plan');
      }
      // Marca como visto el último estado sincronizado.
      if (remoteUpdatedMs) { try { localStorage.setItem('lastSeenUpdate', String(remoteUpdatedMs)); } catch(_){} }
      const perfilLocal = state.config.perfil;
      const personalesLocales = state.metas.filter(m => m.tipo === 'personal');
      const remoteMetas = remote.metas || [];
      
      state.config = { ...remote.config, perfil: perfilLocal };
      state.metas = remoteMetas.concat(personalesLocales.filter(pl => !remoteMetas.some(rm => rm.id === pl.id)));
      state.log = remote.log || [];
      state.ingresos = remote.ingresos || [];
      state.gastos = remote.gastos || [];
      normalize();
      saveLocalOnly();
      scheduleRerender();
    });

  if (unsubscribeMeta) unsubscribeMeta();
  unsubscribeMeta = db.collection('meta').doc(planId)
    .onSnapshot(doc => {
      if (!doc.exists) return;
      planMeta = doc.data();
      let changed = false;
      if (planMeta.ownerName && planMeta.ownerName !== 'Usuario' && state.config.nombreP1 !== planMeta.ownerName) {
        state.config.nombreP1 = planMeta.ownerName;
        changed = true;
      }
      if (planMeta.partnerName && planMeta.partnerName !== 'Usuario' && state.config.nombreP2 !== planMeta.partnerName) {
        state.config.nombreP2 = planMeta.partnerName;
        changed = true;
      }
      if (changed) {
        saveLocalOnly();
      }
      rerenderPlanKeepOpen();
      scheduleRerender();
    });

  if (unsubscribeBolsillos) unsubscribeBolsillos();
  if (currentUser) {
    unsubscribeBolsillos = db.collection('planes').doc(planId).collection('bolsillos').doc(currentUser.uid)
      .onSnapshot(doc => {
        if (!doc.exists) return;
        const remoteBolsillo = doc.data().meta;
        if (remoteBolsillo && remoteBolsillo.dueno) {
          const idx = state.metas.findIndex(m => m.tipo === 'personal' && m.dueno === remoteBolsillo.dueno);
          if (idx !== -1) {
            state.metas[idx].saldo = remoteBolsillo.saldo;
            state.metas[idx].aportes = remoteBolsillo.aportes || [];
            state.metas[idx].nombre = remoteBolsillo.nombre || state.metas[idx].nombre;
          }
        }
        saveLocalOnly();
        scheduleRerender();
      }, e => {
        console.warn("Error subscribing to pocket:", e.message);
      });
  }
}

async function syncSaveBolsillo(planId, uid, bolsilloMeta) {
  await db.collection('planes').doc(planId)
    .collection('bolsillos').doc(uid)
    .set({
      meta: bolsilloMeta,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function load(){
  const raw=await store.get();
  if(raw){try{state=JSON.parse(raw);}catch(e){try{localStorage.setItem('plan2.bak',raw);}catch(_){}console.error('Estado corrupto, respaldado en plan2.bak',e);}}
  normalize();
}
async function saveLocalOnly(){
  const ok=await store.set(JSON.stringify(state));
  if(!ok)$('banner').style.display='block';
}
async function save(){
  const ok=await store.set(JSON.stringify(state));
  if(!ok)$('banner').style.display='block';
  
  if (currentUser && currentPlanId && canEditShared()) {
    syncSaveShared(currentPlanId, state)
      .then(() => {
        showSyncStatus('Sincronizado ✓');
      })
      .catch(e => {
        console.warn('Firestore shared save failed, local only:', e.message);
        showSyncStatus('Solo local (sin conexión)', true);
      });
  }

  if (currentUser && currentPlanId) {
    const miBolsillo = state.metas.find(m => m.tipo === 'personal' && m.dueno === state.config.perfil);
    if (miBolsillo) {
      syncSaveBolsillo(currentPlanId, currentUser.uid, miBolsillo)
        .then(() => {
          if (!isOwner) {
            showSyncStatus('Bolsillo sincronizado ✓');
          }
        })
        .catch(e => {
          console.warn('Bolsillo sync failed, local only:', e.message);
          if (!isOwner) {
            showSyncStatus('Bolsillo local (sin conexión)', true);
          }
        });
    }
  }
}

/* ---------- selectores de metas ---------- */
function metaById(id){return state.metas.find(m=>m.id===id);}
function metasCompartidas(){return state.metas.filter(m=>m.tipo!=='personal'&&!m.dueno);}
function metasIndividuales(p){return state.metas.filter(m=>m.dueno===p&&m.tipo!=='personal');}
function metaPersonal(p){return state.metas.find(m=>m.tipo==='personal'&&m.dueno===p);}
function metasVisiblesEnFondos(){
  // todas las compartidas + la personal del perfil de este teléfono + individuales de este teléfono
  return metasCompartidas().concat([metaPersonal(state.config.perfil)]).concat(metasIndividuales(state.config.perfil)).filter(Boolean);
}
function tipoLabel(t){return t==='imprevistos'?'Imprevistos':t==='invertir'?'Inversión':t==='sueno'?'Sueño':'Personal';}

/* ---------- motor de cálculo (preserva la esencia) ---------- */
function gastosFijosTotal(){return state.config.gastos||0;}
function aportesFijosTotal(){return metasCompartidas().filter(m=>m.tipo!=='imprevistos').reduce((s,m)=>s+(m.aporteFijo||0),0);}
/* Colchón de emergencia sugerido: 3 meses de gastos fijos; si el usuario solo declara
   ahorro mensual (sin gastos fijos), ~6 meses de ese ahorro como punto de partida editable.
   Devuelve 0 cuando no hay datos para inferirlo. */
function colchonSugerido(){
  const g=gastosFijosTotal();
  if(g>0)return Math.round(g*3);
  const c=state.config;
  if(c.soloAhorroDirecto && (c.ahorroDirecto||0)>0)return Math.round((c.ahorroDirecto||0)*6);
  return 0;
}
function sumaPct(){
  const c=state.config;
  if(c.estrategia==='cascada')return 0;
  return metasCompartidas().filter(m=>c.estrategia==='simultaneo'||m.tipo!=='imprevistos').reduce((s,m)=>s+(m.aportePct||0),0);
}
function chequearDistribucionAhorro() {
  const c = state.config;
  if (c.estrategia === 'cascada') return { ok: true };
  const totalPct = sumaPct();
  if (totalPct >= 100) return { ok: true };
  
  const inv = inversionAbierta();
  if (inv) return { ok: true }; // El sobrante se va a inversión abierta
  
  const faltante = 100 - totalPct;
  return { ok: false, faltante };
}
function repartoFijo(){const c=state.config;return c.planPareja+c.libreP1+c.libreP2;}
function computeBase(){const c=state.config;return c.soloAhorroDirecto ? (c.ahorroDirecto||0) : (c.nominaP1+c.nominaP2-gastosFijosTotal()-repartoFijo());}
function avgVar(){if(!state.log.length)return 0;return state.log.reduce((s,e)=>s+e.p1+e.p2,0)/state.log.length;}
function computeTotal(){
  const p = state.config.perfil;
  const mp = metaPersonal(p);
  return metasCompartidas().filter(m=>m.tipo!=='deuda').reduce((s,m)=>s+m.saldo,0) + (mp?mp.saldo:0) + metasIndividuales(p).filter(m=>m.tipo!=='deuda').reduce((s,m)=>s+m.saldo,0);
}
function emergencias(){return state.metas.filter(m=>m.tipo==='imprevistos').sort((a,b)=>(a.prioridad||0)-(b.prioridad||0));}
function emergenciaPrincipal(){return emergencias()[0]||null;}
// Inversión activa preferida; si no hay ninguna sin colocar, cae a la colocada como último
// destino del sobrante (no perder la plata). Distribuir avisa cuando esto pasa.
function inversionAbierta(){return state.metas.find(m=>m.tipo==='invertir'&&!m.colocado)||state.metas.find(m=>m.tipo==='invertir');}
function getMetaFalta(m, resAlloc) {
  const currentAlloc = resAlloc[m.id] || 0;
  if (m.tipo === 'deuda') {
    return Math.max(0, m.saldo - currentAlloc);
  }
  if (m.objetivo > 0) {
    return Math.max(0, m.objetivo - (m.saldo + currentAlloc));
  }
  return Infinity;
}
function getMetaPrioritaria(){
  const comp=metasCompartidas();
  const sorted=comp.slice().sort((a,b)=>(a.prioridad||0)-(b.prioridad||0));
  return sorted.find(m=>{
    if (m.tipo === 'deuda') return m.saldo > 0;
    return m.objetivo>0&&m.saldo<m.objetivo;
  })||null;
}

function premioSplitFactor(p,e){
  const c=state.config;
  if(c.modo==='individual')return p==='p1'?1:0;
  if(c.modoPremio==='igual')return 0.5;
  if(c.modoPremio==='proporcional'){if(!e)return 0.5;const sum=e.p1+e.p2;if(sum===0)return 0.5;return p==='p1'?e.p1/sum:e.p2/sum;}
  return p==='p1'?c.pctPremioP1/100:(100-c.pctPremioP1)/100;
}

/* Registro del último sobrante repartido por colocarSobrante (para avisar al usuario). */
let _ultimoSobrante = [];
/* Coloca el ahorro no asignado con una cascada inteligente, en vez de mandarlo
   ciegamente a inversión:
     (1) completa el colchón del fondo de emergencia (solo si tiene objetivo definido y le falta),
     (2) el resto a la inversión abierta,
     (3) si no hay inversión, el fondo de emergencia actúa de sumidero,
     (4) en último caso, la meta prioritaria.
   Muta `res` y registra en _ultimoSobrante a dónde fue cada parte. */
function colocarSobrante(rem, res){
  const placements=[];
  const push=(m,monto)=>{
    if(monto<=0.5)return;
    const ex=placements.find(p=>p.id===m.id);
    if(ex)ex.monto+=monto;else placements.push({id:m.id,nombre:m.nombre,monto});
  };
  const e=emergenciaPrincipal();
  // (1) colchón del fondo de emergencia (solo si definió objetivo y aún le falta)
  if(e && e.objetivo>0){
    const add=Math.min(rem,getMetaFalta(e,res));
    if(add>0.5){res[e.id]+=add;rem-=add;push(e,add);}
  }
  // (2) inversión abierta: sumidero natural del excedente (sin tope, es meta abierta)
  if(rem>0.5){
    const inv=inversionAbierta();
    if(inv){res[inv.id]+=rem;push(inv,rem);rem=0;}
  }
  // (3) sin inversión: repartir el resto en cascada por prioridad entre las demás metas con cupo,
  //     cortando en su objetivo. Evita sobrellenar una sola meta dejando otras vacías.
  if(rem>0.5){
    const resto=metasCompartidas().filter(m=>!m.colocado).sort((a,b)=>(a.prioridad||0)-(b.prioridad||0));
    for(let i=0;i<resto.length;i++){
      if(rem<=0.5)break;
      const m=resto[i];
      const falta=getMetaFalta(m,res);
      if(falta===Infinity){res[m.id]+=rem;push(m,rem);rem=0;break;}
      const add=Math.min(rem,falta);
      if(add>0.5){res[m.id]+=add;rem-=add;push(m,add);}
    }
  }
  // (4) último recurso: todas las metas llenas y sin sumidero abierto → queda en emergencia.
  if(rem>0.5 && e){res[e.id]+=rem;push(e,rem);rem=0;}
  _ultimoSobrante=placements;
  return placements;
}

/* Reparto del ahorro entre metas compartidas.
   Orden: (1) deudas y aportes fijos en $ (prioridad máxima),
          (2) prioritaria primero si es secuencial (recibe el remanente tras fijos),
          (3) cada meta toma su % del resto (post-fijos y post-prioritaria),
          (4) lo que sobre -> inversión abierta. */
function distribuirAhorro(monto, esEspecial = false){
  const c=state.config,res={};
  _ultimoSobrante=[];
  state.metas.forEach(m=>res[m.id]=0);
  if(monto<=0)return res;
  let rem=monto;
  // Excluir metas marcadas "ya colocado": no admiten reparto nuevo (p.ej. CDT ya constituido).
  // Orden por prioridad = el mismo que ve el usuario en pantalla; así, con %>100, las últimas
  // metas (menor prioridad) son las que reciben menos, de forma predecible, no según orden de array.
  const comp=metasCompartidas().filter(m=>!m.colocado).sort((a,b)=>(a.prioridad||0)-(b.prioridad||0));

  if(c.estrategia==='cascada'){
    const sorted=comp.slice().sort((a,b)=>(a.prioridad||0)-(b.prioridad||0));
    for(let i=0;i<sorted.length;i++){
      const m=sorted[i];
      const falta=getMetaFalta(m, res);
      if(falta === Infinity) {
        res[m.id]+=rem;rem=0;
      } else {
        const add=Math.min(rem,falta);res[m.id]+=add;rem-=add;
      }
      if(rem<=0.5)break;
    }
    if(rem>0.5){colocarSobrante(rem,res);}
    return res;
  }

  // (1) prioritaria primero si es secuencial
  if(c.estrategia==='secuencial'){
    const prio=getMetaPrioritaria();
    if(prio){
      const falta=getMetaFalta(prio, res);
      const add=Math.min(rem,falta);res[prio.id]+=add;rem-=add;
    }
    if(rem<=0.5)return res;
  }

  // (2) cada meta toma su % del resto (base fija = remanente)
  const baseRem=rem;
  comp.filter(m=>(m.aportePct||0)>0&&(c.estrategia==='simultaneo'||m.tipo!=='imprevistos')).forEach(m=>{
    let add=baseRem*m.aportePct/100;
    const falta=getMetaFalta(m, res);
    add=Math.min(add,falta,rem);res[m.id]+=add;rem-=add;
  });
  if(rem<=0.5)return res;

  // (3) sobrante -> colocar en fondo de emergencias / inversión
  colocarSobrante(rem,res);
  return res;
}

function distribuirAhorroIndividual(perfil, monto, esEspecial = false) {
  const res = {};
  const indivs = metasIndividuales(perfil).filter(m => !m.colocado);
  indivs.forEach(m => res[m.id] = 0);
  if (monto <= 0 || indivs.length === 0) return { dist: res, rem: monto };
  
  let rem = monto;
  
  // Aportes porcentuales
  const baseRem = rem;
  indivs.filter(m => (m.aportePct||0) > 0).forEach(m => {
    let add = (baseRem * m.aportePct) / 100;
    const falta = getMetaFalta(m, res);
    add = Math.min(add, falta, rem);
    res[m.id] += add;
    rem -= add;
  });
  
  return { dist: res, rem };
}

// Mantiene la suma de % en 100 entre las metas elegibles. La meta editada toma
// newPct (topada para que las demás no queden negativas); la última elegible
// absorbe el resto. Devuelve el id de la meta compensada (para feedback visual).
function rebalancePct(eligible, editedId, newPct) {
  eligible = eligible.slice().sort((a,b) => (a.prioridad||0) - (b.prioridad||0));
  const edited = eligible.find(m => m.id === editedId);
  if (!edited) return null;
  if (eligible.length === 1) {
    edited.aportePct = Math.max(0, Math.min(100, newPct));
    return null;
  }
  // target = última elegible distinta de la editada (absorbe el remanente)
  let target = eligible[eligible.length - 1];
  if (target.id === editedId) target = eligible[eligible.length - 2];
  // suma de las metas que quedan fijas (ni editada ni target)
  let sumFijas = 0;
  eligible.forEach(m => { if (m.id !== editedId && m.id !== target.id) sumFijas += (m.aportePct || 0); });
  const maxEdit = Math.max(0, 100 - sumFijas);
  const val = Math.max(0, Math.min(maxEdit, newPct));
  edited.aportePct = val;
  target.aportePct = Math.max(0, 100 - sumFijas - val);
  return target.id;
}

// Conjunto de metas que participan del reparto por % (mismo criterio que el motor).
// Compartidas: en secuencial se exime la prioritaria (recibe el remanente). Individuales: las del perfil.
function eligiblesPct(meta) {
  const c = state.config;
  if (meta.dueno) {
    return metasIndividuales(meta.dueno).filter(m =>
      m.tipo !== 'deuda' && m.tipo !== 'personal' && !m.colocado);
  }
  const isPrio = (m) => getMetaPrioritaria()?.id === m.id;
  return metasCompartidas().filter(m => {
    if (m.tipo === 'deuda' || m.tipo === 'personal' || m.colocado) return false;
    if (c.estrategia === 'secuencial' && isPrio(m)) return false;
    return true;
  });
}

// Mantiene keepId en su % y escala las demás proporcionalmente para que la suma sea 100.
// Usado al crear/editar una meta vía formulario (respeta el % que el usuario acaba de poner).
function rebalancePctProporcional(eligible, keepId) {
  const keep = eligible.find(m => m.id === keepId);
  if (!keep) return;
  const keepPct = Math.max(0, Math.min(100, keep.aportePct || 0));
  keep.aportePct = keepPct;
  const others = eligible.filter(m => m.id !== keepId);
  if (others.length === 0) return;
  const restante = 100 - keepPct;
  const sumOthers = others.reduce((s, m) => s + (m.aportePct || 0), 0);
  if (sumOthers <= 0) {
    const each = Math.floor(restante / others.length);
    others.forEach(m => m.aportePct = each);
  } else {
    others.forEach(m => m.aportePct = Math.round((m.aportePct || 0) / sumOthers * restante));
  }
  // Corrige el redondeo en la última para que el total cuadre exacto en 100.
  const total = eligible.reduce((s, m) => s + (m.aportePct || 0), 0);
  if (total !== 100) {
    const last = others[others.length - 1];
    last.aportePct = Math.max(0, last.aportePct + (100 - total));
  }
}

function autoAdjustPercentages(editedId, newPct) {
  if (state.config.estrategia === 'cascada') return null;
  const m = metaById(editedId);
  return m ? rebalancePct(eligiblesPct(m), editedId, newPct) : null;
}

function autoAdjustIndividualPercentages(perfil, editedId, newPct) {
  const m = metaById(editedId);
  return m ? rebalancePct(eligiblesPct(m), editedId, newPct) : null;
}


/* =========================================================
   MOVIMIENTOS UNIFICADOS — helpers
   ========================================================= */
// Aporta monto directo a una meta. Muta saldo. Devuelve el sobrante si la meta se llena.
// Deudas: aporta = abona (saldo es lo que falta por pagar); sobrante = lo que excede la deuda.
function aplicarAporteDirecto(m, monto){
  if(monto<=0) return 0;
  if(m.tipo==='deuda'){
    const aplicado=Math.min(monto, m.saldo);
    m.saldo=Math.max(0, m.saldo-aplicado);
    return monto-aplicado;
  }
  const obj=m.objetivo||0;
  if(obj<=0){ m.saldo+=monto; return 0; }       // meta abierta: nunca sobra
  const falta=Math.max(0, obj-m.saldo);
  const aplicado=Math.min(monto, falta);
  m.saldo+=aplicado;
  const sobra=monto-aplicado;
  if(sobra<=0.5){ m.saldo+=sobra; return 0; }    // residuo de redondeo: dentro
  return sobra;
}
// Reverso exacto de un aporte directo (para deshacer ingresos).
function revertirAporteDirecto(m, monto){
  if(monto<=0) return;
  if(m.tipo==='deuda') m.saldo+=monto;
  else m.saldo=Math.max(0, m.saldo-monto);
}
// ¿La meta destino es del terreno personal del perfil activo?
// Cubre bolsillo (tipo personal) y metas individuales: ambas llevan dueno.
function esDestinoPersonal(metaId){
  const m=metaById(metaId);
  return !!(m && m.dueno===state.config.perfil);
}
// Pregunta qué hacer con el sobrante cuando un aporte directo llena la meta.
// Resuelve {accion:'motor'|'meta'|'bolsillo'|'pendiente', metaId?}.
function openModalSobrante(monto, metaLlena){
  return new Promise(resolve=>{
    const c=state.config;
    const otras=metasVisiblesEnFondos().filter(m=>m.id!==metaLlena.id && m.tipo!=='personal');
    const opts=otras.map(m=>`<option value="${m.id}">${m.nombre} (${tipoLabel(m.tipo)})</option>`).join('');
    const ov=document.createElement('div');
    ov.className='modal-overlay'; ov.style.display='flex';
    ov.innerHTML=`
      <div class="modal-card animate-in" style="max-width:400px;">
        <h3 class="modal-title" style="font-size:18px;">¡${metaLlena.nombre} quedó completa!</h3>
        <div class="hint" style="margin:0;">Sobran <b>${fmt(monto)}</b>. ¿Qué hacemos con ese dinero?</div>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
          <button class="btn sm" id="sobMotor" style="margin:0;">Repartir con el motor (según tu plan)</button>
          <div style="display:flex; gap:8px;">
            <select class="sf" id="sobMetaSel" style="flex:1; margin:0;">${opts}</select>
            <button class="btn sm" id="sobMeta" style="margin:0; flex-shrink:0;">Enviar</button>
          </div>
          <button class="btn ghost sm" id="sobPendiente" style="margin:0;">Dejarlo pendiente (decido luego)</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const done=r=>{ov.remove();resolve(r);};
    ov.querySelector('#sobMotor').onclick=()=>done({accion:'motor'});
    ov.querySelector('#sobMeta').onclick=()=>done({accion:'meta',metaId:ov.querySelector('#sobMetaSel').value});
    ov.querySelector('#sobPendiente').onclick=()=>done({accion:'pendiente'});
    ov.onclick=e=>{if(e.target===ov)done({accion:'pendiente'});};

    if(otras.length===0){ov.querySelector('#sobMeta').disabled=true;ov.querySelector('#sobMetaSel').disabled=true;}
  });
}
// Ejecuta la decisión del modal. Muta saldos. Devuelve descriptor para el registro del ingreso.
function aplicarDecisionSobrante(dec, monto){
  const c=state.config;
  if(dec.accion==='motor'){
    const dist=distribuirAhorro(monto,true);
    state.metas.forEach(m=>{
      if(m.tipo!=='personal'&&!m.dueno&&(dist[m.id]||0)>0.5){
        if(m.tipo==='deuda') m.saldo=Math.max(0,m.saldo-dist[m.id]); else m.saldo+=dist[m.id];
      }
    });
    return {tipo:'motor',dist:Object.assign({},dist)};
  }
  if(dec.accion==='meta'){
    const m=metaById(dec.metaId);
    if(m){aplicarAporteDirecto(m,monto);return {tipo:'meta',metaId:dec.metaId};}
    return {tipo:'pendiente'};
  }
  if(dec.accion==='bolsillo'){
    const per=metaPersonal(c.perfil);
    if(per){per.saldo+=monto;return {tipo:'bolsillo',perfil:c.perfil};}
    return {tipo:'pendiente'};
  }
  return {tipo:'pendiente'};
}

// Sobrantes sin asignar viven en state.ingresos con flag sinAsignar (persisten y sincronizan).
function registrarSobrantePendiente(monto, origenNombre){
  state.ingresos.unshift({id:uid(),mes:selectedMonth||curMonth(),nombre:'Sobrante de '+origenNombre,monto:monto,meta:'sinAsignar',sinAsignar:true,persona:state.config.perfil});
}
function sobrantesPendientes(){return state.ingresos.filter(i=>i.sinAsignar);}

// Especiales visibles para el perfil activo: oculta movimientos privados de la pareja.
function especialesVisibles(arr){
  return (arr||[]).filter(ep=>!ep.privado||ep.duenoPriv===state.config.perfil);
}

/* Retiro = movimiento espejo: ¿de dónde? ¿cuánto? ¿a dónde? */
function openRetiroDinero(){
  if(!canEditShared()){flash('No tienes permisos para esto');return;}
  const c=state.config;
  const conSaldo=m=>m&&(m.saldo||0)>0;
  const origenes=metasCompartidas().filter(m=>m.tipo!=='deuda'&&conSaldo(m))
    .concat(metasIndividuales(c.perfil).filter(m=>m.tipo!=='deuda'&&conSaldo(m)));
  if(origenes.length===0){flash('No hay metas con saldo para retirar');return;}
  const ov=document.createElement('div');
  ov.className='modal-overlay'; ov.style.display='flex';
  const origOpts=origenes.map(m=>`<option value="${m.id}">${m.nombre} — ${fmt(m.saldo)}</option>`).join('');
  ov.innerHTML=`
    <div class="modal-card animate-in" style="max-width:400px;">
      <h3 class="modal-title" style="font-size:20px;">Retirar dinero</h3>
      <div><label class="lbl">¿De dónde sale?</label><select class="sf" id="rtOrigen">${origOpts}</select></div>
      <div><label class="lbl">Monto</label><div style="display:flex;gap:8px;align-items:stretch;width:100%;box-sizing:border-box;"><input class="sf money" id="rtMonto" inputmode="numeric" placeholder="$0" style="flex:1 1 auto;min-width:0;width:auto;margin:0;"><button class="btn ghost sm" id="rtTodo" type="button" style="flex:0 0 auto;width:auto;margin:0;padding:0 16px;">Todo</button></div></div>
      <div><label class="lbl">¿A dónde va?</label><select class="sf" id="rtDestino"></select></div>
      <div><label class="lbl">Nota (opcional)</label><input class="sf" id="rtNota" placeholder="Ej: compra del viaje, imprevisto"></div>
      <div style="display:flex; gap:10px; margin-top:8px;">
        <button class="btn ghost sm" id="rtCancel" style="flex:1;margin:0;">Cancelar</button>
        <button class="btn sm" id="rtOk" style="flex:1;margin:0;">Retirar</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const selO=ov.querySelector('#rtOrigen'), selD=ov.querySelector('#rtDestino');
  const fillDestinos=()=>{
    const oid=selO.value;
    const comp=metasCompartidas().filter(m=>m.id!==oid&&!m.colocado&&m.tipo!=='deuda');
    const indiv=metasIndividuales(c.perfil).filter(m=>m.id!==oid&&!m.colocado&&m.tipo!=='deuda');
    const og=(lbl,arr)=>arr.length?`<optgroup label="${lbl}">${arr.map(m=>`<option value="${m.id}">${m.nombre} (${tipoLabel(m.tipo)})</option>`).join('')}</optgroup>`:'';
    selD.innerHTML=`<option value="fuera">Fuera del plan (gasto real)</option>`
      +og('Metas comunes',comp)+og('Mis metas (privadas)',indiv);
  };
  fillDestinos(); selO.onchange=fillDestinos;
  const mi=ov.querySelector('#rtMonto');
  mi.addEventListener('input',e=>{const d=e.target.value.replace(/\D/g,'');e.target.value=d?'$'+Number(d).toLocaleString('es-CO'):'';});
  ov.querySelector('#rtTodo').onclick=()=>{const o=metaById(selO.value);if(o&&o.saldo>0)mi.value='$'+Math.round(o.saldo).toLocaleString('es-CO');};
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  ov.querySelector('#rtCancel').onclick=()=>ov.remove();
  ov.querySelector('#rtOk').onclick=()=>{
    const o=metaById(selO.value), monto=parse(mi.value), nota=ov.querySelector('#rtNota').value.trim();
    if(!o||monto<=0){flash('Pon un monto válido');return;}
    if(monto>o.saldo){flash('Saldo insuficiente en el origen');return;}
    const dval=selD.value;
    if(dval==='fuera'){
      o.saldo-=monto;
      state.gastos.push({id:uid(),meta:o.id,fecha:today(),monto:monto,mov:'salida',nota:nota||'Retiro del plan',creadoPor:c.perfil});
      flash('Retiro registrado ✓');
    }else{
      const d=metaById(dval);
      if(!d){flash('Destino inválido');return;}
      o.saldo-=monto;
      if(d.tipo==='deuda') d.saldo=Math.max(0,d.saldo-monto); else d.saldo+=monto;
      const tId=uid();
      const cruzaTerreno=!o.dueno&&o.tipo!=='personal'&&(d.dueno||d.tipo==='personal');
      state.gastos.push({id:uid(),meta:o.id,fecha:today(),monto:monto,mov:'transfer-out',transferId:tId,aTerrenoPersonal:cruzaTerreno||undefined,nota:nota||('Transferencia a '+(cruzaTerreno?'lo personal':d.nombre)),creadoPor:c.perfil});
      state.gastos.push({id:uid(),meta:d.id,fecha:today(),monto:monto,entrada:true,mov:'transfer-in',transferId:tId,nota:nota||('Transferencia desde '+o.nombre),creadoPor:c.perfil});
      flash('Transferencia realizada ✓');
    }
    save();ov.remove();rerender();
  };
}

/* ---------- navegación ---------- */
const RENDER=[renderInicio,renderMetas,renderMiMes,renderAprender,renderPlan];
function go(t){
  curTab=t;
  if(t===2 && !selectedMonth) {
    selectedMonth = curMonth();
  }
  $('mainnav').classList.remove('hide');
  document.querySelectorAll('.nt').forEach(b => {
    const tVal = b.dataset.t;
    b.classList.toggle('on', tVal !== undefined && +tVal === t);
  });
  ['s0','s1','s2','s3','s4','sd','sf','sh'].forEach(id=>$(id).classList.remove('on'));
  $('s'+t).classList.add('on');
  RENDER[t]();
  $('s'+t).scrollTop=0;
}
function rerender(){const sec=$('s'+curTab);const st=sec?sec.scrollTop:0;RENDER[curTab]();if(sec)sec.scrollTop=st;}
let _rerenderTimer;
function scheduleRerender(){clearTimeout(_rerenderTimer);_rerenderTimer=setTimeout(rerender,60);}
$('mainnav').addEventListener('click', e => {
  const b = e.target.closest('[data-t]');
  if (b) {
    const t = +b.dataset.t;
    go(t);
    return;
  }
  const act = e.target.closest('[data-action]');
  if (act && act.dataset.action === 'menu') {
    showActionMenu();
  }
});
let actionSheetOpen = false;
function closeActionMenu(){
  const ov = $('action-sheet-overlay');
  actionSheetOpen = false;
  if(!ov) return;
  if(!ov.classList.contains('open')){ ov.style.display='none'; ov.innerHTML=''; return; }
  ov.classList.remove('open');
  const card = ov.querySelector('.sheet-card');
  const done = ()=>{ if(actionSheetOpen) return; ov.style.display='none'; ov.innerHTML=''; };
  if(card){
    let finished=false;
    const onEnd=(e)=>{ if(e && e.propertyName && e.propertyName!=='transform') return; if(finished) return; finished=true; card.removeEventListener('transitionend', onEnd); done(); };
    card.addEventListener('transitionend', onEnd);
    setTimeout(onEnd, 520);
  } else { done(); }
}
function showActionMenu(){
  let ov = $('action-sheet-overlay');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'action-sheet-overlay';
    ov.className = 'sheet-overlay';
    document.body.appendChild(ov);
  }
  const items = [
    { svg:'plus',     label:'Añadir dinero',    sub:'Aporta al plan y decide a dónde va',  act:()=>openAsistenteIngresoExtra() },
    { svg:'trending', label:'Retirar dinero',   sub:'Saca o mueve dinero entre metas',     act:()=>openRetiroDinero() },
    { svg:'calendar', label:'Ver Mi Mes',       sub:'Gráficos y distribución del mes',     act:()=>go(2) },
    { svg:'target',   label:'Crear nueva meta', sub:'Define un objetivo o una deuda',      act:()=>openMetaForm() },
  ];
  const chev = '<svg class="sheet-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  const rows = items.map((it,i)=>`
    <button class="sheet-row" data-act="${i}">
      <span class="sheet-ic">${getSVG(it.svg,'','width:20px;height:20px;')}</span>
      <span class="sheet-txt"><b>${it.label}</b><small>${it.sub}</small></span>
      ${chev}
    </button>`).join('');
  ov.innerHTML = `<div class="sheet-card">
    <div class="sheet-handle"></div>
    <div class="sheet-title">¿Qué quieres hacer?</div>
    ${rows}
  </div>`;
  ov.style.display = 'flex';
  ov.classList.remove('open');
  actionSheetOpen = true;
  ov.onclick = (e)=>{ if(e.target===ov) closeActionMenu(); };
  ov.querySelectorAll('[data-act]').forEach(btn=>{
    btn.onclick = ()=>{ const i = +btn.dataset.act; closeActionMenu(); items[i].act(); };
  });
  void ov.offsetWidth; // force reflow so the enter transition runs from initial state
  requestAnimationFrame(()=>{ ov.classList.add('open'); });
}
// Formato de miles en vivo en los campos de plata (clase .money)
document.addEventListener('input',e=>{
  const el=e.target;
  if(!el||!el.classList||!el.classList.contains('money'))return;
  const d=el.value.replace(/\D/g,'');
  el.value=d?'$'+Number(d).toLocaleString('es-CO'):'';
});
document.addEventListener('focusin',e=>{
  const el=e.target;
  if(!el||!el.classList||!el.classList.contains('money'))return;
  const val=parse(el.value);
  el.value=val?String(val):'';
  el.select();
});
document.addEventListener('focusout',e=>{
  const el=e.target;
  if(!el||!el.classList||!el.classList.contains('money'))return;
  const d=el.value.replace(/\D/g,'');
  el.value=d?'$'+Number(d).toLocaleString('es-CO'):'';
});

/* =========================================================
   INICIO (solo lectura)
   ========================================================= */
let openExtraFormOnLoad = false;

function renderInicio(){
  const c=state.config;
  const perfil=c.perfil;
  const esPareja = c.modo !== 'individual';
  // Compartido: lo de la pareja (sin dueño). Idéntico en ambos teléfonos.
  const ahorrosCompartidos = state.metas.filter(m => m.tipo !== 'deuda' && m.tipo !== 'personal' && !m.dueno).reduce((s,m)=>s+m.saldo,0);
  // Mi parte: bolsillo personal + metas individuales propias. Privada.
  const miBolsillo = (metaPersonal(perfil)?.saldo||0)
    + state.metas.filter(m => m.tipo !== 'deuda' && m.tipo !== 'personal' && m.dueno === perfil).reduce((s,m)=>s+m.saldo,0);

  // Pareja: el número grande es SOLO lo compartido (mismo en ambos teléfonos).
  // Individual: una sola persona, se suma todo.
  const patrimonioNeto = esPareja
    ? ahorrosCompartidos
    : (ahorrosCompartidos + miBolsillo);
  const bolsilloColor = perfil === 'p1' ? '#c87a53' : '#a36a84';

  const headerHtml = c.modo === 'individual'
    ? `<header><div class="ey">${esc(c.nombreP1)}</div><h1>Mi plan</h1></header>`
    : `<header><div class="ey">${esc(c.nombreP1)} &amp; ${esc(c.nombreP2)}</div><h1>Nuestro plan</h1></header>`;

  // 1. Patrimonio Neto Card
  const patColor = patrimonioNeto >= 0 ? 'var(--green)' : '#e06c75';
  // ¿Hay metas de ahorro creadas? (compartidas no-deuda o individuales propias)
  const hayMetasAhorro = metasCompartidas().some(m => m.tipo !== 'deuda')
    || metasIndividuales(perfil).some(m => m.tipo !== 'deuda');
  const desgloseHtml = esPareja
    ? `<div style="margin-top:10px; padding-top:8px; border-top:1px dashed rgba(246,241,230,.12); display:flex; justify-content:space-between; align-items:center; font-size:12.5px;">
        <span class="muted"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#3fcf8e; margin-right:4px;"></span>Compartido: <b>${fmt(ahorrosCompartidos)}</b></span>
        <span class="muted"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${bolsilloColor}; margin-right:4px;"></span>Individual: <b>${fmt(miBolsillo)}</b></span>
      </div>
      <div style="margin-top:6px;font-size:11px;color:rgba(246,241,230,.45);">Tus ahorros individuales son privados y no entran en el total de la pareja.</div>`
    : `<div style="margin-top:10px; padding-top:8px; border-top:1px dashed rgba(246,241,230,.12); display:flex; justify-content:space-between; align-items:center; font-size:12.5px;">
        <span class="muted"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#3fcf8e; margin-right:4px;"></span>Ahorros: <b>${fmt(ahorrosCompartidos + miBolsillo)}</b></span>
      </div>`;
  const patHtml = hayMetasAhorro
    ? `
    <div class="card dark" style="border-left: 4px solid ${patColor};">
      <div class="k">${esPareja ? 'Nuestros ahorros e inversiones' : 'Mis ahorros e inversiones'}</div>
      <div class="num big" style="color:var(--cream);">${fmt(patrimonioNeto)}</div>
      ${desgloseHtml}
    </div>
  `
    : `
    <div class="card dark" style="border-left: 4px solid var(--gold); text-align:center; padding:22px 18px;">
      <div style="display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:12px;background:rgba(217,168,74,.12);margin:0 auto 12px;">${getSVG('target', '', 'width:24px;height:24px;color:var(--gb);')}</div>
      <div class="k" style="margin-bottom:4px;">${esPareja ? 'Su plan está listo para empezar' : 'Tu plan está listo para empezar'}</div>
      <div style="font-size:12.5px; color:rgba(246,241,230,.7); line-height:1.45; max-width:300px; margin:0 auto 14px;">Crea ${esPareja ? 'su' : 'tu'} primera meta y empieza a separar el ahorro. Aquí ${esPareja ? 'verán' : 'verás'} crecer ${esPareja ? 'sus' : 'tus'} ahorros e inversiones.</div>
      <button class="btn gold" id="btnCrearPrimeraMeta" style="margin:0; width:100%; max-width:280px; display:inline-flex; align-items:center; justify-content:center; gap:6px;">${getSVG('plus')} Crear ${esPareja ? 'nuestra' : 'mi'} primera meta</button>
    </div>
  `;

  // 2. Panel de Accesos Rápidos
  const shortcutsHtml = `
    <div class="stitle">¿Qué quieres hacer hoy?</div>
    <div class="card" style="padding: 14px;">
      <div class="shortcuts-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <button class="btn sm gold" id="btnGoAddExtra" style="margin: 0; padding: 12px 6px; font-size: 13px; font-weight:700; grid-column: span 2; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">${getSVG('plus')} Añadir Dinero</button>
        <button class="btn sm ghost" id="btnGoMiMes" style="margin: 0; padding: 12px 6px; font-size: 13px; font-weight:700; border: 1.5px solid var(--green) !important; color: var(--green) !important; background: rgba(28,58,44,0.05) !important; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">${getSVG('calendar')} Ver Mi Mes</button>
        <button class="btn sm ghost" id="btnGoAddMeta" style="margin: 0; padding: 12px 6px; font-size: 13px; font-weight:700; border: 1.5px solid var(--green) !important; color: var(--green) !important; background: rgba(28,58,44,0.05) !important; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">${getSVG('target')} Nueva Meta</button>
      </div>
    </div>
  `;

  // 3. Tarjeta Educativa Dinámica "¿Qué hacemos hoy?"
  // Rotación diaria: índice basado en día del año
  const _dayIdx = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const _ind = c.modo === 'individual';
  const _svgTip = (icon) => getSVG(icon, '', 'vertical-align:middle;margin-right:6px;color:var(--gold);');

  const metasActivas = metasCompartidas().filter(m => m.tipo !== 'deuda');
  const currentLog = state.log.find(e => e.mes === curMonth());

  let tipPool = [];

  if (metasActivas.length === 0) {
    tipPool = [
      {
        t: _svgTip('target') + ' Crea tu primera meta',
        d: `Aún no ${_ind?'tienes':'tienen'} metas de ahorro. Empieza con un <b>fondo de emergencias</b>: 3 meses de gastos fijos guardados. Es el colchón que evita que una crisis se convierta en deuda.`,
        a: 'Crear mi primera meta',
        fn: () => { go(1); setTimeout(() => openMetaForm(null, 'sueno'), 50); }
      },
      {
        t: _svgTip('target') + (totalDeudas > 0 ? ' Las deudas también son metas' : ' Cada sueño merece su meta'),
        d: totalDeudas > 0
          ? `${_ind?'Tienes':'Tienen'} deudas activas. Crea una <b>meta de tipo Deuda</b> para hacerle seguimiento y enfocarte en pagarla más rápido con cada distribución mensual.`
          : `Cada objetivo merece su propia meta: un viaje, un carro, la universidad. Sepáralos y verás el progreso de cada uno sin mezclarlos.`,
        a: 'Crear mi primera meta',
        fn: () => { go(1); setTimeout(() => openMetaForm(null, 'sueno'), 50); }
      },
      {
        t: _svgTip('target') + (_ind ? 'Tu bolsillo personal' : 'Metas individuales'),
        d: _ind
          ? `Además del plan general, puedes crear <b>metas individuales</b> que salen de tu bolsillo personal mensual — para tus ahorros o gastos propios sin mezclarlos con el plan.`
          : `Cada uno puede tener <b>metas individuales</b> que salen de su bolsillo personal. Así cada quien ahorra para sus cosas sin afectar el plan compartido.`,
        a: 'Ir a Metas',
        fn: () => go(1)
      },
      {
        t: _svgTip('shield') + ' El poder del hábito',
        d: `No importa el monto: ahorrar <b>$50.000 al mes</b> con constancia supera ahorrar $500.000 una sola vez. Lo que construye tu ahorro es la regularidad, no el tamaño del aporte.`,
        a: 'Crear mi primera meta',
        fn: () => { go(1); setTimeout(() => openMetaForm(null, 'sueno'), 50); }
      },
    ];
  } else if (!currentLog || !currentLog.aplicado) {
    tipPool = [
      {
        t: _svgTip('calendar') + ' Confirma tu aporte',
        d: `Aún no ${_ind?'has':'han'} confirmado el aporte de <b>${fmtMes(curMonth())}</b>. Hazlo al inicio del mes para que vaya directo a ${_ind?'tus':'sus'} metas — el dinero que no se mueve, se gasta.`,
        a: 'Confirmar aporte',
        fn: () => go(2)
      },
      {
        t: _svgTip('calendar') + ' Primero págate a ti mismo',
        d: `El secreto del ahorro: aparta el dinero <b>antes</b> de gastar, no lo que sobra al final. Distribúyelo hoy y el resto del mes ya tiene dueño.`,
        a: 'Ir a Mi Mes',
        fn: () => go(2)
      },
      {
        t: _svgTip('calendar') + ' Consistencia supera cantidad',
        d: `Distribuir aunque sea el mínimo cada mes vale más que un aporte grande una vez. La constancia es lo que convierte ${_ind?'tus':'sus'} metas en realidad.`,
        a: 'Ir a Mi Mes',
        fn: () => go(2)
      },
    ];
  } else {
    tipPool = [
      {
        t: _svgTip('trending') + ' Hora de Invertir y Crecer',
        d: `¡${_ind?'Felicidades':'Felicitaciones'}! ${_ind?'Tienes':'Tienen'} el mes al día. Es el momento ideal para que ${_ind?'tu':'su'} dinero trabaje solo. Explora${_ind?'':'n'} plataformas de inversión recomendadas.`,
        a: 'Ver dónde invertir',
        fn: () => go(3)
      },
      {
        t: _svgTip('target') + ' ¿Ya tienen metas?',
        d: _ind
          ? `El plan va bien. ¿Ya tienes metas claras? Úsalas para organizar tus ahorros sin mezclarlos.`
          : `El plan va genial. ¿Ya tienen sus metas claras? Son perfectas para organizar sus ahorros.`,
        a: 'Ver metas',
        fn: () => go(1)
      },
      {
        t: _svgTip('trending') + ' Sube el porcentaje de ahorro',
        d: `Es el mejor momento para aumentar el porcentaje de ahorro. Incluso un <b>2% más</b> del ingreso tiene un impacto enorme a largo plazo gracias al interés compuesto.`,
        a: 'Configurar plan',
        fn: () => go(2)
      },
      {
        t: _svgTip('trending') + ' Revisa y ajusta tus metas',
        d: `Un plan vivo es mejor que uno perfecto en papel. Revisa ${_ind?'tus':'sus'} metas: ¿siguen siendo relevantes? ¿El objetivo es el correcto? Ajustarlas a la realidad de hoy las hace más alcanzables.`,
        a: 'Ver metas',
        fn: () => go(1)
      },
      {
        t: _svgTip('shield') + ' Protege lo que has construido',
        d: `Con tus ahorros creciendo, considera un seguro de vida o de salud si no ${_ind?'tienes':'tienen'} uno. Proteger el ingreso es tan importante como hacer crecer el ahorro.`,
        a: 'Ver inversiones',
        fn: () => go(3)
      },
    ];
  }

  const _tip = tipPool[_dayIdx % tipPool.length];
  const tipTitle = _tip.t;
  const tipDesc = _tip.d;
  const tipActionText = _tip.a;
  const tipActionFn = _tip.fn;

  const tipHtml = `
    <div class="stitle">Consejo del día</div>
    <div class="card" style="background: rgba(246,241,230,.03); border-color: var(--line); display:flex; flex-direction:column; gap:8px;">
      <div style="font-weight: 700; font-size: 14px; color: var(--gold);">${tipTitle}</div>
      <div style="font-size: 13px; color: rgba(246,241,230,.85); line-height: 1.4;">${tipDesc}</div>
      <button class="btn sm" id="btnTipAction" style="margin: 6px 0 0 0; width:100%; font-size:12px; font-weight:700; background:rgba(246,241,230,.06); border: 1px solid var(--line); color: var(--cream);">${tipActionText}</button>
    </div>
  `;

  $('r0').innerHTML=`
    ${headerHtml}
    ${patHtml}
    ${shortcutsHtml}
    ${tipHtml}
  `;

  // Asignar clics
  $('btnGoMiMes').onclick = () => go(2);
  $('btnGoAddMeta').onclick = () => openMetaForm(null);
  $('btnGoAddExtra').onclick = () => openAsistenteIngresoExtra();
  $('btnTipAction').onclick = tipActionFn;
  const btnPrimeraMeta = $('btnCrearPrimeraMeta');
  if (btnPrimeraMeta) btnPrimeraMeta.onclick = () => openMetaForm(null);
}
function heroMeta(m){
  const obj=m.objetivo||0,pct=obj?Math.min(100,m.saldo/obj*100):0,falta=Math.max(0,obj-m.saldo);
  if(!obj){
    return `<div class="card dark"><div class="k">${m.nombre}</div><div class="num big">${fmt(m.saldo)}</div>
      <div class="muted sm" style="margin-top:4px">${tipoLabel(m.tipo)} · meta abierta</div></div>`;
  }
  return `<div class="card dark"><div class="k">${m.nombre}</div><div class="num big">${fmt(m.saldo)}</div>
    <div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div>
    <div style="display:flex;justify-content:space-between;font-size:12.5px;color:rgba(246,241,230,.8)"><b>${pct.toFixed(0)}%</b><span>${falta>0?'faltan '+fmt(falta):'¡meta cumplida!'}</span></div></div>`;
}

function drawSavingsDonut() {
  const perfil = state.config.perfil;
  const metasConSaldo = state.metas.filter(m => {
    if (m.tipo === 'deuda') return false;
    if (m.tipo === 'personal') return false;
    // Privacidad: nada del otro perfil (ni su bolsillo ni sus metas individuales).
    if (m.dueno && m.dueno !== perfil) return false;
    return true;
  }).map(m => {
    let nombre = m.nombre;
    if (m.dueno) {
      nombre = `${m.nombre} (Individual)`;
    }
    return {
      id: m.id,
      nombre: nombre,
      saldo: m.saldo,
      tipo: m.tipo,
      dueno: m.dueno
    };
  }).filter(m => m.saldo > 0);

  const total = metasConSaldo.reduce((s, m) => s + m.saldo, 0);

  if (total === 0 || metasConSaldo.length === 0) {
    return `<div class="card dark" style="padding:18px 16px;">
      <div class="k" style="margin-bottom:12px;">Distribución de Ahorros</div>
      <div style="display:flex; align-items:center; gap:20px;">
        <div style="width:128px; height:128px; flex-shrink:0;">
          <svg viewBox="0 0 100 100" style="width:100%; height:100%; overflow:visible;">
            <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(246,241,230,.08)" stroke-width="11" />
            <text x="50" y="53" text-anchor="middle" font-family="var(--sans)" font-size="8" fill="rgba(246,241,230,.3)" font-weight="600">Vacío</text>
          </svg>
        </div>
        <div style="flex:1; color:rgba(246,241,230,.5); font-size:12.5px; line-height:1.4;">
          Aún no hay ahorros acumulados. Los saldos que agreguen a sus metas aparecerán aquí.
        </div>
      </div>
    </div>`;
  }

  const segments = [];
  let accumPct = 0;
  
  metasConSaldo.sort((a,b) => b.saldo - a.saldo);

  metasConSaldo.forEach((m, i) => {
    const pct = (m.saldo / total) * 100;
    const color = DONUT_PALETTE[i % DONUT_PALETTE.length];

    segments.push({
      ...m,
      pct,
      color,
      startAngle: (accumPct / 100) * 360 - 90
    });
    accumPct += pct;
  });

  const C = 219.91;
  let svgCircles = '';
  segments.forEach(seg => {
    const offset = C - (seg.pct / 100) * C;
    svgCircles += `<circle cx="50" cy="50" r="35" fill="none" stroke="${seg.color}" stroke-width="11" stroke-dasharray="${C} ${C}" stroke-dashoffset="${offset}" transform="rotate(${seg.startAngle} 50 50)" stroke-linecap="butt" />`;
  });

  const legend = segments.map(seg => `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12.5px; color:rgba(246,241,230,.85)">
      <div style="display:flex; align-items:center; gap:6px; min-width:0; flex:1;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${seg.color}; flex-shrink:0;"></span>
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0;">${seg.nombre}</span>
      </div>
      <div style="font-variant-numeric:tabular-nums; flex-shrink:0;">
        <b style="color:var(--cream);">${fmtK(seg.saldo)}</b>
        <span style="font-size:10px; color:rgba(246,241,230,.45); margin-left:2px;">(${Math.round(seg.pct)}%)</span>
      </div>
    </div>
  `).join('');

  return `<div class="card dark" style="padding:18px 16px;">
    <div class="k" style="margin-bottom:12px;">Distribución de Ahorros</div>
    <div style="display:flex; align-items:center; gap:20px;">
      <div style="width:128px; height:128px; flex-shrink:0;">
        <svg viewBox="0 0 100 100" style="width:100%; height:100%; overflow:visible;">
          ${svgCircles}
          <text x="50" y="46" text-anchor="middle" font-family="var(--sans)" font-size="7" fill="rgba(246,241,230,.5)" font-weight="700" letter-spacing="0.05em">TOTAL</text>
          <text x="50" y="58" text-anchor="middle" font-family="var(--serif)" font-size="13" fill="var(--cream)" font-weight="600">${fmtK(total)}</text>
        </svg>
      </div>
      <div style="flex:1; display:flex; flex-direction:column; gap:7px; overflow:hidden;">
        ${legend}
      </div>
    </div>
  </div>`;
}

function drawDistribucionPreview() {
  const r = computeReparto(0, 0);
  if (r.ahorro <= 0) return '';
  const dist = r.dist || {};
  const entries = Object.keys(dist).map(id => ({ m: metaById(id), monto: dist[id] })).filter(x => x.m && x.monto > 0.5);
  if (entries.length === 0) {
    return `<div class="card dark" style="padding:14px 16px; margin-top:12px;">
      <div class="k" style="margin-bottom:4px;">Distribución estimada</div>
      <div class="muted sm">Ninguna meta tiene asignación de %. Ve a Metas → Ahorros para configurar la distribución.</div>
    </div>`;
  }
  const rows = entries.map(x => {
    return `<div class="lrow">
      <div>
        <div class="lm">${x.m.nombre}</div>
        <div class="ls">${tipoLabel(x.m.tipo)}</div>
      </div>
      <span class="num" style="font-size:16px; color:var(--gb);">${fmt(x.monto)}</span>
    </div>`;
  }).join('');
  return `<div class="card dark" style="padding:14px 16px; margin-top:12px;">
    <div class="k" style="margin-bottom:10px;">Distribución estimada · <span style="color:var(--gold)">${fmt(r.ahorro)}</span></div>
    ${rows}
  </div>`;
}

const MIMES_INCOME_KEY = 'np_miMes_incomeOpen';

function miMesIncomeOpen() {
  const c = state.config;
  const stored = localStorage.getItem(MIMES_INCOME_KEY);
  if (stored === '1') return true;
  if (stored === '0') return false;
  // Sin preferencia guardada: expandido si aún no hay ingresos seteados.
  const sinDatos = !c.nominaP1 && !c.nominaP2 && !c.ahorroDirecto;
  return sinDatos;
}

function setMiMesIncomeOpen(open) {
  localStorage.setItem(MIMES_INCOME_KEY, open ? '1' : '0');
}

function drawIncomeSummaryLine() {
  const c = state.config;
  const sep = '<span class="is-sep">·</span>';
  if (c.soloAhorroDirecto) {
    return `Ahorro fijo ${fmt(c.ahorroDirecto || 0)}`;
  }
  const totalIng = c.modo === 'individual' ? (c.nominaP1 || 0) : ((c.nominaP1 || 0) + (c.nominaP2 || 0));
  const base = computeBase();
  return `Ingresos ${fmt(totalIng)}${sep}Gastos ${fmt(c.gastos || 0)}${sep}Ahorro base ${fmt(base)}`;
}

function drawWarningsChip() {
  const warnings = getDistribucionAdvertencia();
  if (warnings.length === 0) return '';
  const panel = warnings.map(w => `<div style="background:rgba(192,138,45,0.06); border:1px solid rgba(192,138,45,0.3); padding:10px 12px; border-radius:8px; font-size:12.5px; color:rgba(246,241,230,.9); line-height:1.4; margin-bottom:8px;">${w}</div>`).join('');
  const label = warnings.length === 1 ? '1 aviso' : `${warnings.length} avisos`;
  return `
    <button type="button" class="warn-chip" id="btnWarnChip">⚠ ${label}</button>
    <div class="warn-panel" id="warnPanel">${panel}</div>
  `;
}

function drawStickyCTA(canEdit) {
  const r = computeReparto(0, 0);
  const ahorro = r.ahorro || 0;
  let label, disabled, cls = 'btn gold';
  if (!canEdit) {
    label = 'Confirmar aporte del mes';
    disabled = 'disabled style="opacity:0.65;pointer-events:none;"';
  } else if (ahorro < 0) {
    label = `Cubrir mes en rojo · ${fmt(-ahorro)}`;
    disabled = '';
    cls = 'btn danger';
  } else if (ahorro === 0) {
    label = 'Sin ahorro para distribuir';
    disabled = 'disabled';
  } else {
    label = `Confirmar aporte de ${fmt(ahorro)}`;
    disabled = '';
  }
  return `<div class="mimes-cta" id="mimesCta">
    <button class="${cls}" id="btnApplyPreSave" ${disabled}>${label}</button>
  </div>`;
}

function drawFixedBudgetCard() {
  const c = state.config;
  const isIndiv = c.modo === 'individual';
  if (c.soloAhorroDirecto) {
    return `<div class="card dark" style="padding:18px 16px;">
      <div class="k">Ahorro Fijo Mensual</div>
      <div class="num big" style="font-size:24px; margin-top:2px;">${fmt(c.ahorroDirecto)}</div>
      <div class="muted sm" style="margin-top:2px;">${isIndiv ? 'Monto base destinado a mis metas' : 'Monto base destinado a las metas compartidas'}</div>
    </div>`;
  }
  const totalIngresos = isIndiv ? c.nominaP1 : (c.nominaP1 + c.nominaP2);
  if (totalIngresos <= 0) return '';

  const pGas = (c.gastos / totalIngresos) * 100;
  const pL1 = (c.libreP1 / totalIngresos) * 100;
  const baseAhorro = computeBase();
  const pBase = (baseAhorro / totalIngresos) * 100;

  let stackHtml = '';
  let itemsHtml = '';

  if (isIndiv) {
    stackHtml = `
      <span class="st-seg" style="width:${pGas.toFixed(1)}%; background:#8a7f70;"></span>
      <span class="st-seg st-seg-p1" style="width:${pL1.toFixed(1)}%"></span>
      <span class="st-seg" style="flex:1; background:#3d8c64;"></span>
    `;
    itemsHtml = `
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="width:7px; height:7px; border-radius:50%; background:#8a7f70; flex-shrink:0;"></span>Mis gastos fijos</div>
        <b style="color:var(--cream);">${fmt(c.gastos)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pGas)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-p1" style="width:7px; height:7px; border-radius:50%;"></span>Tu dinero personal</div>
        <b style="color:var(--cream);">${fmt(c.libreP1)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pL1)}%)</span></b>
      </div>
    `;
  } else {
    const pPP = (c.planPareja / totalIngresos) * 100;
    const pL2 = (c.libreP2 / totalIngresos) * 100;
    stackHtml = `
      <span class="st-seg" style="width:${pGas.toFixed(1)}%; background:#8a7f70;"></span>
      <span class="st-seg st-seg-pp" style="width:${pPP.toFixed(1)}%"></span>
      <span class="st-seg st-seg-p1" style="width:${pL1.toFixed(1)}%"></span>
      <span class="st-seg st-seg-p2" style="width:${pL2.toFixed(1)}%"></span>
      <span class="st-seg" style="flex:1; background:#3d8c64;"></span>
    `;
    itemsHtml = `
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="width:7px; height:7px; border-radius:50%; background:#8a7f70; flex-shrink:0;"></span>Gastos del hogar</div>
        <b style="color:var(--cream);">${fmt(c.gastos)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pGas)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-pp" style="width:7px; height:7px; border-radius:50%;"></span>Para los dos</div>
        <b style="color:var(--cream);">${fmt(c.planPareja)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pPP)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-p1" style="width:7px; height:7px; border-radius:50%;"></span>Personal de ${c.nombreP1}</div>
        <b style="color:var(--cream);">${fmt(c.libreP1)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pL1)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-p2" style="width:7px; height:7px; border-radius:50%;"></span>Personal de ${c.nombreP2}</div>
        <b style="color:var(--cream);">${fmt(c.libreP2)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pL2)}%)</span></b>
      </div>
    `;
  }

  return `<div class="card dark" style="padding:18px 16px;">
    <div class="k">Presupuesto Fijo Mensual</div>
    <div class="num big" style="font-size:24px; margin-top:2px;">${fmt(totalIngresos)}</div>
    <div class="muted sm" style="margin-top:2px;">${isIndiv ? `Nómina de ${c.nombreP1}` : `Nóminas de ${c.nombreP1} y ${c.nombreP2}`}</div>
    
    <div class="stack" style="margin-top:14px; margin-bottom:14px; background:rgba(246,241,230,.06);">
      ${stackHtml}
    </div>
    
    <div style="display:flex; flex-direction:column; gap:6.5px; font-size:12.5px;">
      ${itemsHtml}
      <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px solid rgba(246,241,230,.12); padding-top:7px; margin-top:2px;">
        <div style="display:flex; align-items:center; gap:6px; font-weight:700; color:rgba(246,241,230,.9)"><span class="dot" style="width:7px; height:7px; border-radius:50%; background:#3d8c64; flex-shrink:0;"></span>Ahorro base</div>
        <b style="color:var(--gb); font-family:var(--sans); font-size:14px;">${fmt(baseAhorro)} <span style="font-size:10px; color:rgba(246,241,230,.5); font-weight:normal; margin-left:3px;">(${Math.round(pBase)}%)</span></b>
      </div>
    </div>
  </div>`;
}

function ahorroDeMes(e){
  if (e.reparto && typeof e.reparto.ahorro === 'number') {
    return e.reparto.ahorro + especialesVisibles(e.especiales).reduce((s, ep) => s + ep.monto, 0);
  }
  const base = computeBase();
  const comb = (e.p1 || 0) + (e.p2 || 0);
  return base + comb * (1 - state.config.pctPremio / 100);
}

// Meses con datos para los KPI. El "confirmar mes" ya no existe: los indicadores
// se alimentan de los movimientos registrados (state.ingresos), uniendo además
// los meses cerrados del modelo legacy (state.log) para no perder histórico viejo.
function mesesConDatosUI(){
  const set = {};
  especialesVisibles(state.ingresos).forEach(i => { if (i.mes && !i.sinAsignar) set[i.mes] = true; });
  (state.log || []).forEach(e => { if (e.mes) set[e.mes] = true; });
  return Object.keys(set).sort();
}
// Ahorro visible de un mes: suma los movimientos del mes (excluye sobrantes sin asignar,
// ya contados en su ingreso de origen); si el mes no tiene movimientos, cae al cierre legacy.
function ahorroMesUI(mes){
  const ing = especialesVisibles(state.ingresos.filter(i => i.mes === mes && !i.sinAsignar));
  if (ing.length) return ing.reduce((s, i) => s + i.monto, 0);
  const e = (state.log || []).find(x => x.mes === mes);
  return e ? ahorroDeMes(e) : 0;
}

function drawStatsBI(){
  const c = state.config;
  const meses = mesesConDatosUI();
  const n = meses.length;
  if (n === 0) return '';
  const ahorros = meses.map(ahorroMesUI);
  const totalAhorrado = ahorros.reduce((s, v) => s + v, 0);
  const avgAhorro = totalAhorrado / n;

  // Ingreso extra prom.: parte no-base de los movimientos visibles, por mes.
  const extras = meses.map(m =>
    especialesVisibles(state.ingresos.filter(i => i.mes === m && !i.sinAsignar && !i.esAporteBase))
      .reduce((s, i) => s + i.monto, 0));
  const avgExtra = extras.reduce((s, v) => s + v, 0) / n;

  let bestIdx = 0;
  ahorros.forEach((v, i) => { if (v > ahorros[bestIdx]) bestIdx = i; });

  const ingresoMensual = c.soloAhorroDirecto ? 0 : ((c.nominaP1 || 0) + (c.nominaP2 || 0));
  const tasa = ingresoMensual > 0 ? Math.round(Math.max(0, Math.min(100, avgAhorro / ingresoMensual * 100))) : null;

  const mesAnterior = (mes) => {
    const [y, m] = mes.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  let racha = n ? 1 : 0;
  for (let i = meses.length - 1; i > 0; i--) {
    if (mesAnterior(meses[i]) === meses[i - 1]) racha++; else break;
  }

  const lastAhorro = ahorros[n - 1];
  let trend = '';
  if (avgAhorro > 0 && n >= 2) {
    const diff = Math.round((lastAhorro - avgAhorro) / avgAhorro * 100);
    if (diff !== 0) {
      const up = diff > 0;
      trend = `<span style="font-size:11px;font-weight:700;color:${up ? '#0f8f2c' : '#c0673f'};margin-left:6px;">${up ? '↑' : '↓'} ${Math.abs(diff)}%</span>`;
    }
  }

  const tile = (label, value, sub) => `
    <div style="background:rgba(246,241,230,.04); border-radius:10px; padding:11px 12px;">
      <div style="font-size:9.5px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--gb); margin-bottom:4px;">${label}</div>
      <div style="font-family:var(--serif); font-size:19px; font-weight:600; color:var(--cream); line-height:1.1;">${value}</div>
      ${sub ? `<div style="font-size:10.5px; color:rgba(246,241,230,.45); margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  let tiles = '';
  tiles += tile('Ahorro mensual prom.', `${fmtK(avgAhorro)}${trend}`, '');
  tiles += tile('Ingreso extra prom.', fmtK(avgExtra), '');
  tiles += tile('Total ahorrado', fmtK(totalAhorrado), '');
  tiles += tile('Mejor mes', fmtK(ahorros[bestIdx]), fmtMes(meses[bestIdx]));
  if (tasa !== null) tiles += tile('Tasa de ahorro', `${tasa}%`, 'del ingreso');
  tiles += tile('Constancia', `${n} ${n === 1 ? 'mes' : 'meses'}`, racha > 1 ? `racha de ${racha}` : '');

  return `<div class="card dark" style="padding:18px 16px; margin-bottom:12px;">
    <div class="k" style="margin-bottom:14px;">Estadísticas</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:9px;">
      ${tiles}
    </div>
  </div>`;
}

function drawSavingsHistoryCard() {
  const mesesUI = mesesConDatosUI();
  if (mesesUI.length === 0) {
    return `<div class="card dark" style="padding:18px 16px; border: 1px dashed rgba(246,241,230,.15); background: transparent;">
      <div class="k" style="color:rgba(246,241,230,.5)">Evolución del Ahorro</div>
      <div style="font-size:12.5px; color:rgba(246,241,230,.5); line-height:1.45; text-align:center; padding:12px 6px;">
        El gráfico de ahorro mensual se activará cuando agregues tu primer movimiento en <b>Mi Mes</b>.
      </div>
    </div>`;
  }

  const historyData = mesesUI.slice(-6).map(m => ({
    mesLabel: fmtMes(m),
    ahorro: ahorroMesUI(m)
  }));

  const maxVal = Math.max(...historyData.map(d => d.ahorro), 500000);
  const avgVal = historyData.reduce((s, d) => s + d.ahorro, 0) / historyData.length;
  const N = historyData.length;
  
  const graphWidth = 250;
  const startX = 35;
  const startY = 130;
  const plotH = 100;
  const colWidth = graphWidth / N;
  const barWidth = Math.min(26, colWidth * 0.5);

  let barElements = '';
  historyData.forEach((d, i) => {
    const barHeight = Math.max(4, (d.ahorro / maxVal) * plotH);
    const x = startX + i * colWidth + (colWidth - barWidth) / 2;
    const y = startY - barHeight;

    barElements += `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${d.ahorro >= avgVal ? 'var(--gb)' : 'rgba(246,241,230,.25)'}" rx="3" ry="3" />
      <text x="${x + barWidth/2}" y="${y - 6}" text-anchor="middle" font-family="var(--sans)" font-size="9" fill="var(--cream)" font-weight="600">${fmtK(d.ahorro)}</text>
      <text x="${x + barWidth/2}" y="${startY + 16}" text-anchor="middle" font-family="var(--sans)" font-size="8.5" fill="rgba(246,241,230,.4)" font-weight="600">${d.mesLabel.split(' ')[0]}</text>
    `;
  });

  const avgY = (startY - Math.min(plotH, (avgVal / maxVal) * plotH)).toFixed(1);

  return `<div class="card dark" style="padding:18px 16px;">
    <div class="k" style="margin-bottom:14px;">Evolución del Ahorro <span style="color:rgba(246,241,230,.4); font-weight:600;">· prom ${fmtK(avgVal)}</span></div>
    <div style="height:172px; width:100%;">
      <svg viewBox="0 0 300 170" style="width:100%; height:100%; overflow:visible;">
        <line x1="${startX - 10}" y1="${startY}" x2="${startX + graphWidth + 10}" y2="${startY}" stroke="rgba(246,241,230,.12)" stroke-width="1" />
        <line x1="${startX - 10}" y1="${avgY}" x2="${startX + graphWidth + 10}" y2="${avgY}" stroke="rgba(246,241,230,.4)" stroke-width="1" stroke-dasharray="3 3" />
        ${barElements}
      </svg>
    </div>
  </div>`;
}

/* =========================================================
   METAS (lista unificada + crear/editar)
   ========================================================= */
/* ---------- estimador de tiempo de metas ---------- */
function calcularTiempoRestante(m) {
  if (!m.objetivo || m.saldo >= m.objetivo) return null;
  const falta = m.objetivo - m.saldo;
  const aporteMes = aporteMensualEstimado(m);
  if (aporteMes <= 0) return null;
  return Math.ceil(falta / aporteMes);
}

// Aporte mensual estimado a una meta según el ahorro distribuido por la estrategia actual.
// Cae al aporteFijo si la distribución no le asigna nada.
function aporteMensualEstimado(m){
  const est = Math.max(0, computeBase() + avgVar() * (1 - state.config.pctPremio / 100));
  const dist = distribuirAhorro(est);
  let aporteMes = dist[m.id] || 0;
  if (aporteMes <= 0 && m.aporteFijo > 0) aporteMes = m.aporteFijo;
  return aporteMes;
}

function metaSub(m){
  if(m.tipo==='personal')return 'Individual';
  
  let s=[];
  const isCompleted = m.objetivo > 0 && m.saldo >= m.objetivo;
  
  if(state.config.estrategia==='secuencial'){
    const prio = getMetaPrioritaria();
    if(prio && prio.id === m.id){
      s.push('<span style="color:var(--gold);font-weight:600">Prioritaria primero</span>');
    }
  } else if(m.tipo==='imprevistos'){
    s.push('Se llena primero');
  }

  if(m.objetivo)s.push('meta '+fmtK(m.objetivo));

  if(isCompleted){
    s.push('completada');
  }

  if(m.tipo==='invertir'&&!m.objetivo&&!(m.aportePct||0)){
    const sp=sumaPct();
    const rest=Math.max(0,100-sp);
    s.push(`recibe el sobrante (${rest}% del resto)`);
  }

  if(!isCompleted && m.objetivo){
    const meses = calcularTiempoRestante(m);
    if(meses !== null && meses > 0){
      let tiempoStr;
      if(meses < 12){
        tiempoStr = `~${meses} mes${meses!==1?'es':''}`;
      } else {
        const a = Math.floor(meses/12), r = meses%12;
        tiempoStr = `~${a} año${a!==1?'s':''}${r>0?' '+r+'m':''}`;
      }
      s.push(`<span style="color:var(--gs);font-weight:500">${tiempoStr}</span>`);
    }
  }

  return s.join(' · ');
}
function renderMetas(){
  const isIndiv = state.config.modo === 'individual';
  const canEdit = canEditShared();

  // Empty-state CTA: el botón global del nav existe, pero un estado vacío sin acción
  // es un callejón. Aquí enseñamos dónde crear. tipo = defaultTipo para openMetaForm.
  const emptyMetaCTA = (tipo, msg) => {
    const isDebt = tipo === 'deuda';
    const accent = isDebt ? '#e06c75' : 'var(--green)';
    const bg = isDebt ? 'rgba(224,108,117,0.08)' : 'rgba(28,58,44,0.06)';
    const label = isDebt ? 'Registrar una deuda' : 'Crear primera meta';
    return `<div class="card" style="text-align:center;padding:22px 16px;">
      <div class="empty" style="${canEdit?'margin-bottom:14px;':'margin:0;'}">${msg}</div>
      ${canEdit ? `<button class="btn" data-addmeta="${tipo}" style="margin:0;border:1.5px solid ${accent};color:${accent};background:${bg};display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:14px;padding:12px 18px;">${getSVG('target')} ${label}</button>` : ''}
    </div>`;
  };

  if (curMetasSubTab === 2) curMetasSubTab = 1;
  let subTabsHtml = `
    <div class="seg dark-seg" style="margin-bottom:16px;">
      <button id="btnTabDist" class="${curMetasSubTab===0?'on':''}">Distribución</button>
      <button id="btnTabAhorros" class="${curMetasSubTab===1?'on':''}">Ahorros</button>
    </div>
  `;
  
  let contentHtml = '';
  
  if (curMetasSubTab === 0) {
    contentHtml = `
      ${drawSavingsDonut()}
      <div style="height:12px;"></div>
      ${drawStatsBI()}
      ${drawSavingsHistoryCard()}
      <div style="height:72px;"></div>
    `;
  } else if (curMetasSubTab === 1) {
    const card=(m)=>{
      const obj=m.objetivo||0,pct=obj?Math.min(100,m.saldo/obj*100):null;
      const isPersonal = m.tipo === 'personal';
      const dragHandle = isPersonal ? '' : `<span class="drag-handle" style="cursor:grab;padding:4px 0;display:inline-flex;align-items:center;color:var(--gs);touch-action:none;user-select:none;margin-right:8px">${getSVG('drag', '', 'opacity:0.6;')}</span>`;

      const strat = state.config.estrategia;
      const isPrio = getMetaPrioritaria()?.id === m.id;
      const showPct = m.tipo !== 'personal' && (
        (strat === 'simultaneo') ||
        (strat === 'secuencial' && !isPrio)
      );
      
      const flashCls = (m.id === _pctFlashId) ? ' pct-flash' : '';
      const pctBadge = (canEdit && showPct && m.tipo !== 'personal')
        ? `<div class="inline-pct-container${flashCls}" title="Toca para editar el % del ahorro">
             <input type="number" class="inline-pct-input" min="0" max="100" value="${m.aportePct||0}" data-pctmid="${m.id}" aria-label="Porcentaje del ahorro para ${esc(m.nombre)}">
             <span class="pct-sign">%</span>
           </div>`
        : (showPct && m.tipo !== 'personal' ? `<span class="pill${flashCls}" style="margin-left:6px;">${m.aportePct||0}%</span>` : '');

      return `<div class="card" data-mid="${m.id}" style="display:flex;align-items:center;gap:6px">
        ${dragHandle}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span class="k" style="margin:0">${m.nombre}</span>
            ${m.tipo!=='personal'?'<span class="pill">'+tipoLabel(m.tipo)+'</span>':''}
            ${pctBadge?`<span style="flex:1"></span>${pctBadge}`:''}
          </div>
          <div class="num med">${fmt(m.saldo)}</div>
          ${pct!=null?`<div class="bar light" style="margin:8px 0 4px"><i style="width:${pct.toFixed(1)}%"></i></div>`:''}
          <div class="muted" style="font-size:12px">${metaSub(m)}</div>
        </div>
        ${canEdit && m.tipo !== 'personal' ? `<button class="btn-card-edit" data-editmid="${m.id}" aria-label="Editar meta" style="background:none;border:none;color:var(--gs);cursor:pointer;padding:4px;display:inline-flex;align-items:center;justify-content:center;transition:color .2s;opacity:0.6;margin-left:4px;margin-right:2px;">${getSVG('edit', '', 'width:14px;height:14px;pointer-events:none;')}</button>` : ''}
        </div>`;
    };

    const strat = state.config.estrategia;
    let adviceHtml = '';
    if (strat !== 'cascada') {
      const sp = sumaPct();
      const over = sp > 100;
      const inv = inversionAbierta();
      const em = emergenciaPrincipal();
      const colchonPend = em && em.objetivo > 0 && em.saldo < em.objetivo;
      const targetName = inv
        ? (colchonPend ? `tu fondo de emergencia y luego ${inv.nombre}` : inv.nombre)
        : (em ? em.nombre : 'el fondo de emergencias');
      
      let hintText = '';
      if (over) {
        hintText = 'Te pasaste de 100%: las últimas metas recibirán menos de lo que indica su %.';
      } else if (sp < 100) {
        hintText = `El ${100-sp}% restante va a ${targetName}.`;
      } else {
        hintText = 'Repartes el 100% de tu ahorro mensual.';
      }
      
      adviceHtml = `
        <div class="card" style="background:${over?'rgba(224,108,117,.12)':'rgba(246,241,230,.03)'}; border-color:${over?'#e06c75':'var(--line)'}; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="k" style="margin:0; color:${over?'#e06c75':'var(--cream)'}">Distribución del Ahorro</span>
            <span class="num" style="font-size:20px; font-weight:800; color:${over?'#e06c75':'var(--gb)'}">${sp}%</span>
          </div>
          <div class="hint" style="margin-top:6px; color:rgba(246,241,230,.7);">${hintText}</div>
        </div>
      `;
    }

    let chipsHtml = '';
    if (isIndiv) {
      chipsHtml = `
        <div class="filter-chips">
          <button class="chip ${curAhorrosFilter==='all'?'on':''}" data-f="all">Todas</button>
          <button class="chip ${curAhorrosFilter==='goals'?'on':''}" data-f="goals">Mis Metas</button>
        </div>
      `;
    } else {
      chipsHtml = `
        <div class="filter-chips">
          <button class="chip ${curAhorrosFilter==='all'?'on':''}" data-f="all">Todas</button>
          <button class="chip ${curAhorrosFilter==='shared'?'on':''}" data-f="shared">Compartidas</button>
          <button class="chip ${curAhorrosFilter==='individual'?'on':''}" data-f="individual">Individuales</button>
        </div>
      `;
    }

    let listHtml = '';
    const nonDebtShared = metasCompartidas().filter(m => m.tipo !== 'deuda').sort((a,b)=>(a.prioridad||0)-(b.prioridad||0));
    const showShared = (isIndiv && (curAhorrosFilter === 'all' || curAhorrosFilter === 'goals')) || (!isIndiv && (curAhorrosFilter === 'all' || curAhorrosFilter === 'shared'));
    if (showShared) {
      if (nonDebtShared.length > 0) {
        listHtml = `<div class="stitle" style="display:flex;align-items:center;gap:6px">
          ${isIndiv ? 'Mis metas de ahorro' : 'Metas compartidas'}
          <span id="helpPrioBtn" style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:rgba(246,241,230,.15);color:var(--cream);font-size:9.5px;font-weight:bold;cursor:pointer;user-select:none">?</span>
        </div>
        <div id="prioHint" class="hint" style="display:none;background:rgba(192,138,45,.08);border:1px solid rgba(192,138,45,.2);border-radius:10px;padding:10px 12px;margin:2px 0 10px;color:rgba(246,241,230,.8);line-height:1.45">
          El orden de esta lista define la prioridad de ahorro si usan la estrategia <b>Prioritaria primero</b> o <b>En cascada</b>. Mantén presionado y arrastra las barras de agarre para ordenarlas.
        </div>
        <div id="sharedMetasContainer">`;
        nonDebtShared.forEach(m=>listHtml+=card(m));
        listHtml+='</div>';
      } else if (curAhorrosFilter !== 'all') {
        listHtml = `
          <div class="stitle">${isIndiv ? 'Mis metas de ahorro' : 'Metas compartidas'}</div>
          ${emptyMetaCTA('sueno', isIndiv ? 'Aún no tienes metas de ahorro.' : 'No tienes metas comunes creadas.')}
        `;
      }
    }

    let indivHtml = '';
    const showIndiv = !isIndiv && (curAhorrosFilter === 'all' || curAhorrosFilter === 'individual');
    if (showIndiv) {
      const indivs = metasIndividuales(state.config.perfil).filter(m => m.tipo !== 'deuda');
      if (indivs.length > 0) {
        indivHtml += `<div class="stitle">Mis metas individuales (Privadas)</div>`;
        indivs.forEach(m => indivHtml += card(m));
      } else if (curAhorrosFilter === 'individual') {
        indivHtml += `
          <div class="stitle">Mis metas individuales (Privadas)</div>
          ${emptyMetaCTA('sueno', 'No tienes metas individuales privadas creadas.')}
        `;
      }
    }

    let personalHtml = '';

    // Filtro "Todas" sin ninguna meta creada:
    // sin esto el usuario nuevo ve la vista vacía sin acción.
    let allEmptyCTA = '';
    const indivCount = isIndiv ? 0 : metasIndividuales(state.config.perfil).filter(m => m.tipo !== 'deuda').length;
    if (curAhorrosFilter === 'all' && nonDebtShared.length === 0 && indivCount === 0) {
      allEmptyCTA = emptyMetaCTA('sueno', isIndiv
        ? 'Aún no tienes metas de ahorro. Crea la primera para empezar a repartir tu ahorro mensual.'
        : 'Aún no tienen metas de ahorro. Crea la primera para empezar a repartir el ahorro mensual.');
    }

    contentHtml = `
      ${adviceHtml}
      ${chipsHtml}
      ${allEmptyCTA}
      ${listHtml}
      ${indivHtml}
      ${personalHtml}
      ${!canEdit ? '<div style="text-align:center;font-size:12.5px;color:rgba(246,241,230,.7);font-weight:600;background:rgba(246,241,230,.06);border:1px solid rgba(246,241,230,.15);border-radius:10px;padding:12px;margin-top:8px;">Rol: Lector (Solo Lectura)</div>' : ''}
      <div style="height:24px;flex-shrink:0;"></div>
    `;
  } else if (curMetasSubTab === 2) {
    const card=(m)=>{
      const obj=m.objetivo||0;
      const pagado = Math.max(0, obj - m.saldo);
      const pct = obj ? Math.min(100, (pagado / obj) * 100) : 0;
      const isPersonal = m.tipo === 'personal';
      const dragHandle = isPersonal ? '' : `<span class="drag-handle" style="cursor:grab;padding:4px 0;display:inline-flex;align-items:center;color:var(--gs);touch-action:none;user-select:none;margin-right:8px">${getSVG('drag', '', 'opacity:0.6;')}</span>`;

      return `<div class="card tap" data-mid="${m.id}" style="display:flex;align-items:center;gap:6px">
        ${dragHandle}
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span class="k" style="margin:0">${m.nombre}</span>
            <span class="pill" style="background:rgba(224,108,117,0.15);color:#e06c75;border:1px solid rgba(224,108,117,0.3);">Deuda</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <div class="num med">${fmt(m.saldo)}</div>
            ${obj > 0 ? `<div style="font-size:11px;color:var(--gs);">Original: ${fmt(obj)}</div>` : ''}
          </div>
          ${obj > 0 ? `<div class="bar light" style="margin:8px 0 4px;background:rgba(224,108,117,0.12);"><i style="width:${pct.toFixed(1)}%;background:#e06c75;"></i></div>` : ''}
          <div class="muted" style="font-size:12px">${metaSub(m)}</div>
        </div>
        ${canEdit && m.tipo !== 'personal' ? `<button class="btn-card-edit" data-editmid="${m.id}" aria-label="Editar deuda" style="background:none;border:none;color:var(--gs);cursor:pointer;padding:8px;display:inline-flex;align-items:center;justify-content:center;transition:color .2s;opacity:0.6;margin-left:4px;margin-right:2px;">${getSVG('edit', '', 'width:18px;height:18px;pointer-events:none;')}</button>` : ''}
        <span class="chev">›</span></div>`;
    };

    const debtsShared = metasCompartidas().filter(m => m.tipo === 'deuda').sort((a,b)=>(a.prioridad||0)-(b.prioridad||0));
    const totalDebts = debtsShared.reduce((s,m)=>s+m.saldo,0) + (isIndiv ? 0 : metasIndividuales(state.config.perfil).filter(m => m.tipo === 'deuda').reduce((s,m)=>s+m.saldo,0));
    
    let listHtml = `<div id="sharedMetasContainer">`;
    debtsShared.forEach(m=>listHtml+=card(m));
    listHtml+='</div>';

    let indivHtml = '';
    if (!isIndiv) {
      const indivs = metasIndividuales(state.config.perfil).filter(m => m.tipo === 'deuda');
      if (indivs.length > 0) {
        indivHtml += `<div class="stitle">Mis deudas individuales (Privadas)</div>`;
        indivs.forEach(m => indivHtml += card(m));
      }
    }

    const summaryCard = `
      <div class="card dark" style="background:#5a1d1d; border-left: 4px solid #e06c75; margin-bottom:12px;">
        <div class="k" style="color:#e06c75">Total Deudas Pendientes</div>
        <div class="num big" style="color:var(--cream);">${fmt(totalDebts)}</div>
        <div class="hint" style="margin-top:6px;color:rgba(246,241,230,.75)">Pagar deudas de alto interés de forma proactiva es la mejor inversión que pueden hacer hoy.</div>
      </div>
    `;

    contentHtml = `
      ${summaryCard}
      <div class="stitle" style="display:flex;align-items:center;gap:6px">
        ${isIndiv ? 'Mis deudas' : 'Deudas compartidas'}
        <span id="helpPrioBtn" style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:rgba(246,241,230,.15);color:var(--cream);font-size:9.5px;font-weight:bold;cursor:pointer;user-select:none">?</span>
      </div>
      <div id="prioHint" class="hint" style="display:none;background:rgba(192,138,45,.08);border:1px solid rgba(192,138,45,.2);border-radius:10px;padding:10px 12px;margin:2px 0 10px;color:rgba(246,241,230,.8);line-height:1.45">
        El orden define qué deudas abona con prioridad el motor de cascada/secuencial. Arrastra las barras de agarre para ordenar.
      </div>
      ${listHtml}
      ${indivHtml}
      ${debtsShared.length === 0 && (isIndiv || indivHtml === '') ? `<div class="card" style="text-align:center;padding:22px 16px;"><div class="empty" style="display:flex;align-items:center;justify-content:center;gap:8px;${canEdit?'margin-bottom:14px;':''}">¡Sin deudas activas! Excelente salud financiera. ${getSVG('party')}</div>${canEdit?`<button class="btn" data-addmeta="deuda" style="margin:0;border:1.5px solid #e06c75;color:#e06c75;background:rgba(224,108,117,0.08);display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:13px;padding:11px 16px;">${getSVG('target')} Registrar una deuda</button>`:''}</div>` : ''}
      ${!canEdit ? '<div style="text-align:center;font-size:12.5px;color:rgba(246,241,230,.7);font-weight:600;background:rgba(246,241,230,.06);border:1px solid rgba(246,241,230,.15);border-radius:10px;padding:12px;margin-top:8px;">Rol: Lector (Solo Lectura)</div>' : ''}
      <div style="height:24px;flex-shrink:0;"></div>
    `;
  }

  let h = `<header>
    <div class="ey">${isIndiv ? 'Mis' : 'Nuestras'}</div>
    <h1>Metas y Deudas</h1>
  </header>`;

  $('r1').innerHTML = `
    ${h}
    ${subTabsHtml}
    ${contentHtml}
  `;

  const tabDist = $('btnTabDist');
  const tabAhorros = $('btnTabAhorros');
  if (tabDist) tabDist.onclick = () => { curMetasSubTab = 0; rerender(); };
  if (tabAhorros) tabAhorros.onclick = () => { curMetasSubTab = 1; rerender(); };

  const helpBtn = $('helpPrioBtn');
  if(helpBtn){
    helpBtn.onclick=(e)=>{
      e.stopPropagation();
      const hint = $('prioHint');
      if(hint) hint.style.display = hint.style.display==='none'?'block':'none';
    };
  }

  // Attach change listener to inline percentage inputs
  $('r1').querySelectorAll('.inline-pct-input').forEach(input => {
    input.onchange = (e) => {
      const mid = input.dataset.pctmid;
      const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
      const m = metaById(mid);
      if (m) {
        const adjustedId = m.dueno
          ? autoAdjustIndividualPercentages(m.dueno, mid, val)
          : autoAdjustPercentages(mid, val);
        _pctFlashId = adjustedId;
        save();
        rerender();
        setTimeout(() => { _pctFlashId = null; }, 60);
      }
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    };
  });

  $('r1').querySelectorAll('.btn-card-edit').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openMetaForm(btn.dataset.editmid);
    };
  });

  // filter chips click handlers
  $('r1').querySelectorAll('.filter-chips .chip').forEach(btn => {
    btn.onclick = () => {
      curAhorrosFilter = btn.dataset.f;
      rerender();
    };
  });

  // empty-state CTA -> abrir formulario de nueva meta/deuda
  $('r1').querySelectorAll('[data-addmeta]').forEach(btn => {
    btn.onclick = () => openMetaForm(null, btn.dataset.addmeta);
  });

  initReorder();
}

function initReorder(){
  if (!canEditShared()) return;
  const container=$('sharedMetasContainer');
  if(!container)return;
  let draggedEl=null,startY=0,grabOffsetY=0,hasDragged=false;

  const onPointerMove=e=>{
    if(!draggedEl)return;
    const deltaY=e.clientY-startY;
    if(Math.abs(deltaY)>5){
      hasDragged=true;
      draggedEl.classList.add('dragged');
    }
    const siblings=[...container.querySelectorAll('.card[data-mid]:not(.dragging)')];
    const target=siblings.find(sibling=>{
      const box=sibling.getBoundingClientRect();
      return e.clientY<box.top+box.height/2;
    })||null;

    const orderChanged = target ? draggedEl.nextElementSibling!==target
                                : container.lastElementChild!==draggedEl;
    if(orderChanged){
      // FLIP: snapshot sibling positions, reorder, animate delta to 0
      const firstTop=new Map();
      siblings.forEach(s=>firstTop.set(s,s.getBoundingClientRect().top));
      if(target)container.insertBefore(draggedEl,target);
      else container.appendChild(draggedEl);
      siblings.forEach(s=>{
        const dy=firstTop.get(s)-s.getBoundingClientRect().top;
        if(!dy)return;
        s.style.transition='none';
        s.style.transform=`translateY(${dy}px)`;
        requestAnimationFrame(()=>{
          s.style.transition='transform .18s ease';
          s.style.transform='';
        });
      });
    }

    // dragged card glued to pointer regardless of reflow
    draggedEl.style.transition='none';
    draggedEl.style.transform='none';
    const natTop=draggedEl.getBoundingClientRect().top;
    draggedEl.style.transform=`translateY(${e.clientY-grabOffsetY-natTop}px)`;
  };

  const onPointerUp=e=>{
    if(!draggedEl)return;
    document.removeEventListener('pointermove',onPointerMove);
    document.removeEventListener('pointerup',onPointerUp);
    document.removeEventListener('pointercancel',onPointerUp);

    draggedEl.classList.remove('dragging');
    container.querySelectorAll('.card[data-mid]').forEach(s=>{s.style.transform='';s.style.transition='';});
    if(hasDragged){
      const cards=[...container.querySelectorAll('.card[data-mid]')];
      cards.forEach((card,idx)=>{
        const m=metaById(card.dataset.mid);
        if(m)m.prioridad=idx;
      });
      save();
      rerender();
      flash('Prioridades actualizadas ✓');
    }else{
      draggedEl.classList.remove('dragged');
    }
    draggedEl=null;
  };

  container.addEventListener('pointerdown',e=>{
    const handle=e.target.closest('.drag-handle');
    if(!handle)return;
    const card=handle.closest('.card[data-mid]');
    if(!card)return;
    draggedEl=card;
    startY=e.clientY;
    grabOffsetY=e.clientY-card.getBoundingClientRect().top;
    hasDragged=false;
    card.classList.add('dragging');
    
    document.addEventListener('pointermove',onPointerMove);
    document.addEventListener('pointerup',onPointerUp);
    document.addEventListener('pointercancel',onPointerUp);
    
    e.preventDefault();
  });
}

function openMetaForm(id, defaultTipo = 'sueno'){
  if (!canEditShared()) {
    flash('No tienes permisos de editor');
    return;
  }
  const existing=id?metaById(id):null;
  mForm=existing?JSON.parse(JSON.stringify(existing)):{id:uid(),nombre:'',tipo:defaultTipo,saldo:0,objetivo:0,aporteFijo:0,aportePct:0,fecha:null,creado:today(),prioridad:metasCompartidas().length,reparto:null};
  ['s0','s1','s2','s3','s4','sd','sf','sh'].forEach(x=>$(x).classList.remove('on'));
  $('sf').classList.add('on');$('sf').scrollTop=0;
  $('mainnav').classList.add('hide');
  renderMetaForm(!!existing);
}

function renderMetaForm(editing){
  const m=mForm;
  const tipoBtns=`<div class="seg" style="display:flex;flex-wrap:wrap;gap:4px">
    <button data-tipo="imprevistos" class="${m.tipo==='imprevistos'?'on':''}">Para imprevistos</button>
    <button data-tipo="invertir" class="${m.tipo==='invertir'?'on':''}">Para invertir</button>
    <button data-tipo="sueno" class="${m.tipo==='sueno'?'on':''}">Para un sueño</button>
  </div>`;
  
  let visHtml = '';
  if (state.config.modo === 'pareja' && m.tipo !== 'personal') {
    visHtml = `
      <div class="stitle" style="color:rgba(246,241,230,.65)">¿Quién ahorra para esto?</div>
      <div class="card">
        <div class="mode-cards" id="fVisibilidadSeg">
          <div data-vis="compartida" class="mode-card ${!m.dueno?'on':''}">
            <span class="icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            <span class="title">Compartida</span>
          </div>
          <div data-vis="individual" class="mode-card ${m.dueno?'on':''}">
            <span class="icon"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
            <span class="title">Individual (Privada)</span>
          </div>
        </div>
        <div class="hint" id="fVisHint" style="margin-top:10px;">
          ${m.dueno ? '<b>Meta Individual (Privada):</b> Solo tú verás esta meta y la financiarás desde tu bolsillo personal.' : '<b>Meta Compartida:</b> Ambos verán la meta y aportarán a ella desde el ahorro colectivo.'}
        </div>
      </div>
    `;
  }

  let fields='';
  if(m.tipo==='imprevistos'){
    const prio = getMetaPrioritaria();
    const isPrio = prio && prio.id === m.id;
    const showAporte = state.config.estrategia === 'simultaneo' || !isPrio;
    const sug = colchonSugerido();
    const objVal = m.objetivo ? fmt(m.objetivo) : (!editing && sug>0 ? fmt(sug) : '');
    fields=`<div class="card"><label class="lbl">¿Cuánto quieren tener guardado?</label>
      <input class="amt money" id="fObj" inputmode="numeric" value="${objVal}" placeholder="$0">
      ${sug>0 ? `<div class="hint" style="margin-top:6px">Colchón sugerido: <b>${fmt(sug)}</b> (${gastosFijosTotal()>0?'3 meses de tus gastos fijos':'~6 meses de tu ahorro mensual'}). Ajústalo a tu realidad. El ahorro sobrante completa este colchón antes de ir a inversión.</div>` : ''}
      ${showAporte ? `<label class="lbl" style="margin-top:14px">Aporte al mes (opcional)</label>${aporteFields()}` : `<div class="hint" style="margin-top:14px">Estrategia actual: Prioritaria primero. Esta es la meta de máxima prioridad y se llena de primero automáticamente.</div>`}
      <div class="deriv" id="fDeriv" style="margin-top:14px"></div></div>`;
  }else{
    const prio = getMetaPrioritaria();
    const isPrio = prio && prio.id === m.id;
    const showAporte = state.config.estrategia !== 'secuencial' || !isPrio;
    fields=`<div class="card">
      <label class="lbl">Meta (opcional)</label>
      <input class="amt money" id="fObj" inputmode="numeric" value="${m.objetivo?fmt(m.objetivo):''}" placeholder="$0">
      <label class="lbl" style="margin-top:14px">¿Para cuándo? (opcional)</label>
      <div class="sf" id="fFechaTrigger" data-val="${m.fecha||''}" style="margin-top:4px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
        <span id="fFechaText">${m.fecha ? fmtMes(m.fecha) : 'Seleccionar mes'}</span>
        <span style="color:var(--gs); display:inline-flex; align-items:center;">${getSVG('chevronDown', '', 'width:12px; height:12px;')}</span>
      </div>
      ${showAporte ? `<label class="lbl" style="margin-top:14px">Aporte al mes (opcional)</label>${aporteFields()}` : `<div class="hint" style="margin-top:14px">Estrategia actual: Prioritaria primero. Esta es la meta de máxima prioridad y se llena de primero automáticamente.</div>`}
      <div class="deriv" id="fDeriv"></div>
    </div>`;
  }
  $('rf').innerHTML=`
<button class="bk" id="fBack">‹ Cancelar</button>
<header style="padding-top:6px"><div class="ey">${editing?'Editar':'Nueva'} meta</div><h1>${editing?m.nombre||'Objetivo':'¿Qué quieren lograr?'}</h1></header>
<div class="card"><label class="lbl">Nombre</label><input class="sf" id="fNom" value="${(m.nombre||'').replace(/"/g,'&quot;')}" placeholder="Viaje a Japón, Carro, Fondo imprevistos…"></div>
${m.tipo!=='personal'?'<div class="stitle" style="color:rgba(246,241,230,.65)">¿Para qué es?</div><div class="card">'+tipoBtns+'</div>':''}
${visHtml}
${fields}
${m.tipo!=='personal' ? `<div class="card"><label class="lbl">¿Ya tienes algo guardado aquí? (opcional)</label><input class="amt money" id="fSaldo" inputmode="numeric" value="${m.saldo?fmt(m.saldo):''}" placeholder="$0"></div>` : ''}
${m.tipo==='invertir' ? `<div class="card" id="fColocado" style="cursor:pointer;display:flex;align-items:center;gap:12px">
  <div style="width:22px;height:22px;border-radius:6px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;border:2px solid ${m.colocado?'var(--green)':'var(--line)'};background:${m.colocado?'var(--green)':'transparent'}">${m.colocado?'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--cream)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>':''}</div>
  <div style="flex:1;min-width:0">
    <div style="font-size:13.5px;font-weight:700;color:var(--ink)">Este dinero ya está invertido</div>
    <div class="hint" style="margin:0">Lo registro solo para control. No me sugieras moverlo.</div>
  </div>
</div>` : ''}
<button class="btn" id="fSave">${editing?'Guardar cambios':'Crear'}</button>
${editing&&m.tipo!=='imprevistos'?'<button class="btn danger" id="fDel">Eliminar</button>':''}`;
  attachMetaForm(editing);
  $('mainnav').classList.add('hide');}

function aporteFields(){
  const m=mForm;
  return `<input class="sf" id="fPct" inputmode="numeric" value="${m.aportePct||''}" placeholder="0 %">
    <div class="hint">Define qué porcentaje del ahorro mensual se destinará a esta meta.</div>`;
}
function repartoEditor(){
  const r=(mForm.reparto||[]);
  let h=r.map((x,i)=>`<div class="grow"><input data-rn="${i}" value="${(x.n||'').replace(/"/g,'&quot;')}" style="flex:1;font-family:var(--sans)"><input data-rp="${i}" inputmode="numeric" value="${x.pct}" style="width:56px;text-align:center"><button class="del" data-rdel="${i}">×</button></div>`).join('');
  h+=`<button class="btn sm ghost" id="repAdd">+ Agregar categoría</button>`;
  const sum=r.reduce((s,x)=>s+(+x.pct||0),0);
  h+=`<div class="hint">Suma: ${sum}% ${sum!==100&&r.length?'· idealmente 100%':''}</div>`;
  return h;
}
function readMetaForm(){
  const m=mForm;
  m.nombre=($('fNom')?$('fNom').value.trim():m.nombre);
  if($('fObj'))m.objetivo=parse($('fObj').value);
  if($('fFechaTrigger'))m.fecha=$('fFechaTrigger').dataset.val||null;
  m.aporteFijo=0;
  if($('fPct'))m.aportePct=Math.max(0,Math.min(100,parse($('fPct').value)));
  if($('fSaldo'))m.saldo=parse($('fSaldo').value);
  if(state.config.estrategia==='secuencial'){
    const prio = getMetaPrioritaria();
    const isPrio = prio && prio.id === m.id;
    if(isPrio){
      m.aporteFijo=0;m.aportePct=0;
    }
  }
  if(m.tipo==='imprevistos'){
    m.fecha=null;
  }
  if(m.tipo!=='invertir'){
    m.colocado=false;
  }
}
function updateDeriv(){
  const el=$('fDeriv');if(!el)return;
  const c=state.config;
  const p=c.perfil;
  const obj=$('fObj')?parse($('fObj').value):0;const fecha=$('fFechaTrigger')?$('fFechaTrigger').dataset.val:'';
  const pct=$('fPct')?Math.min(100,parse($('fPct').value)):0;
  const saldo=$('fSaldo')?parse($('fSaldo').value):0;

  let pctMes = 0;
  const est=Math.max(0,computeBase()+avgVar()*(1-c.pctPremio/100));
  if (mForm.dueno) {
    const avgV_total = avgVar();
    const prem = avgV_total * c.pctPremio / 100;
    const pf = premioSplitFactor(p, state.log.length ? {
      p1: state.log.reduce((s,e)=>s+e.p1,0)/state.log.length,
      p2: state.log.reduce((s,e)=>s+e.p2,0)/state.log.length
    } : null);
    const libre = p === 'p1' ? c.libreP1 : c.libreP2;
    const estPocket = c.soloAhorroDirecto ? (prem * pf) : (libre + prem * pf);

    pctMes = estPocket * pct / 100;
  } else {
    pctMes=est*pct/100;
  }

  const aporteMes=pctMes;
  const apTxt=()=>pct>0 ? '~'+fmt(pctMes)+' ('+pct+'% del ahorro)' : '';

  let txt='';
  const strat = c.estrategia;

  if (mForm.dueno) {
    if(obj&&fecha){
      const meses=Math.max(1,monthsUntil(fecha));const need=Math.ceil((obj-saldo)/meses);
      txt=`Para llegar a <b>${fmt(obj)}</b> en ${fmtMes(fecha)} necesitas <b>${fmt(need)}/mes</b>.`;
      if(aporteMes>0){const m2=Math.ceil((obj-saldo)/aporteMes);txt+=` Con ${apTxt()} (~${fmt(aporteMes)}/mes) llegarías en ${addMonths(m2)}.`;}
    }else if(obj&&aporteMes>0){
      const meses=Math.ceil((obj-saldo)/aporteMes);
      txt=`Aportando ${apTxt()} (~${fmt(aporteMes)}/mes), llegas a <b>${fmt(obj)}</b> en <b>${addMonths(meses)}</b> (~${meses} mes${meses!==1?'es':''}).`;
    }else if(aporteMes>0&&!obj){
      txt=`Meta abierta: sumas ${apTxt()} (~${fmt(aporteMes)}/mes), sin fecha de cierre.`;
    }else if(obj){
      txt=`Meta de <b>${fmt(obj)}</b> sin aporte mensual definido. Se financiará mediante aportes manuales desde tu bolsillo.`;
    }else{
      txt='Define un monto, un aporte (fijo y/o %) o ambos y te digo cuánto tardas.';
    }
  } else if (strat === 'cascada') {
    if (obj) {
      const falta = Math.max(0, obj - saldo);
      txt = `Estrategia actual: <b>En cascada</b>. Esta meta se llenará al 100% con todo el ahorro disponible (según prioridad) hasta completar los <b>${fmt(obj)}</b> (faltan ${fmt(falta)}).`;
    } else {
      txt = `Estrategia actual: <b>En cascada</b>. Esta meta abierta absorberá todo el ahorro sobrante una vez se completen las metas de mayor prioridad.`;
    }
  } else if (strat === 'secuencial') {
    const prio = getMetaPrioritaria();
    const isPrio = prio && prio.id === mForm.id;
    if (isPrio) {
      const falta = Math.max(0, obj - saldo);
      const fijosOtros = metasCompartidas().filter(m => m.id !== prio.id && m.tipo !== 'imprevistos').reduce((s, m) => s + (m.aporteFijo || 0), 0);
      const estPrio = Math.max(0, est - fijosOtros);
      const meses = estPrio > 0 ? Math.ceil(falta / estPrio) : '—';
      if (fijosOtros > 0) {
        txt = `Estrategia actual: <b>Prioritaria primero</b>. Esta meta recibe el ahorro base restante de <b>${fmt(estPrio)}/mes</b> (tras cubrir aportes fijos de otras metas). Lista en <b>~${meses} mes${meses!==1?'es':''}</b> (faltan ${fmt(falta)}).`;
      } else {
        txt = `Estrategia actual: <b>Prioritaria primero</b>. Todo el ahorro base de <b>${fmt(est)}/mes</b> va a esta meta primero por ser la de máxima prioridad. Lista en <b>~${meses} mes${meses!==1?'es':''}</b> (faltan ${fmt(falta)}).`;
      }
    } else {
      const prioNom = prio ? prio.nombre : 'la meta principal';
      if(obj&&fecha){
        const meses=Math.max(1,monthsUntil(fecha));const need=Math.ceil((obj-saldo)/meses);
        txt=`Para llegar a <b>${fmt(obj)}</b> en ${fmtMes(fecha)} necesitas <b>${fmt(need)}/mes</b>.`;
        if(aporteMes>0){const m2=Math.ceil((obj-saldo)/aporteMes);txt+=` Con ${apTxt()} (~${fmt(aporteMes)}/mes) llegarías en ${addMonths(m2)}.`;}
      }else if(obj&&aporteMes>0){
        const meses=Math.ceil((obj-saldo)/aporteMes);
        txt=`Aportando ${apTxt()} (~${fmt(aporteMes)}/mes), llegas a <b>${fmt(obj)}</b> en <b>${addMonths(meses)}</b> (~${meses} mes${meses!==1?'es':''}).`;
      }else if(aporteMes>0&&!obj){
        txt=`Meta abierta: sumas ${apTxt()} (~${fmt(aporteMes)}/mes), sin fecha de cierre.`;
      }else if(obj){
        txt=`Meta de <b>${fmt(obj)}</b> sin aporte definido: recibe lo que sobre del ahorro mensual.`;
      }else{
        txt='Define un monto, un aporte (fijo y/o %) o ambos y te digo cuánto tardas.';
      }
      txt += ` <br><span style="opacity:0.8; font-size:11px;">Nota: Recibirá aportes en paralelo una vez se complete <b>${prioNom}</b> o si sobra ahorro mensual.</span>`;
    }
  } else {
    if(obj&&fecha){
      const meses=Math.max(1,monthsUntil(fecha));const need=Math.ceil((obj-saldo)/meses);
      txt=`Para llegar a <b>${fmt(obj)}</b> en ${fmtMes(fecha)} necesitas <b>${fmt(need)}/mes</b>.`;
      if(aporteMes>0){const m2=Math.ceil((obj-saldo)/aporteMes);txt+=` Con ${apTxt()} (~${fmt(aporteMes)}/mes) llegarías en ${addMonths(m2)}.`;}
    }else if(obj&&aporteMes>0){
      const meses=Math.ceil((obj-saldo)/aporteMes);
      txt=`Aportando ${apTxt()} (~${fmt(aporteMes)}/mes), llegas a <b>${fmt(obj)}</b> en <b>${addMonths(meses)}</b> (~${meses} mes${meses!==1?'es':''}).`;
    }else if(aporteMes>0&&!obj){
      txt=`Meta abierta: sumas ${apTxt()} (~${fmt(aporteMes)}/mes), sin fecha de cierre.`;
    }else if(obj){
      txt=`Meta de <b>${fmt(obj)}</b> sin aporte definido: recibe lo que sobre del ahorro mensual.`;
    }else{
      txt='Define un monto, un aporte (fijo y/o %) o ambos y te digo cuánto tardas.';
    }
  }
  el.innerHTML=txt;
}
function attachMetaForm(editing){
  $('fBack').onclick=()=>{mForm=null;go(1);};
  $('rf').querySelectorAll('[data-tipo]').forEach(b=>b.onclick=()=>{readMetaForm();mForm.tipo=b.dataset.tipo;renderMetaForm(editing);});

  const visSeg = $('fVisibilidadSeg');
  if (visSeg) {
    visSeg.querySelectorAll('.mode-card').forEach(card => {
      card.onclick = () => {
        readMetaForm();
        const vis = card.dataset.vis;
        if (vis === 'individual') {
          mForm.dueno = state.config.perfil;
        } else {
          mForm.dueno = null;
        }
        renderMetaForm(editing);
      };
    });
  }
  const colBtn = $('fColocado');
  if (colBtn) colBtn.onclick = () => { readMetaForm(); mForm.colocado = !mForm.colocado; renderMetaForm(editing); };

  ['fObj','fPct','fSaldo'].forEach(id=>{const el=$(id);if(el)el.addEventListener('input',updateDeriv);});
  const fTrigger = $('fFechaTrigger');
  if(fTrigger) {
    fTrigger.onclick = async () => {
      const currentVal = fTrigger.dataset.val || '';
      const newVal = await showCustomMonthPicker(currentVal, true);
      if(newVal !== null) {
        fTrigger.dataset.val = newVal;
        const textEl = $('fFechaText');
        if(textEl) textEl.textContent = fmtMes(newVal) || 'Seleccionar mes';
        updateDeriv();
      }
    };
  }
  $('fSave').onclick=async ()=>{
    readMetaForm();
    if(!mForm.nombre){flash('Ponle un nombre a la meta');return;}
    // Evita nombres repetidos (case-insensitive, sin importar espacios) para no confundir el reparto.
    const nombreNorm=mForm.nombre.trim().toLowerCase().replace(/\s+/g,' ');
    const dup=state.metas.some(x=>x.id!==mForm.id&&x.tipo!=='personal'&&(x.nombre||'').trim().toLowerCase().replace(/\s+/g,' ')===nombreNorm);
    if(dup){flash('Ya tienes una meta con ese nombre. Usa uno distinto para no confundirte.');return;}
    // En simultáneo una meta sin fijo ni % no participa del reparto y queda en $0. Forzar uno u otro.
    // La inversión abierta es sumidero del sobrante, así que se exime.
    if(state.config.estrategia==='simultaneo'&&!mForm.dueno&&mForm.tipo!=='invertir'&&!mForm.colocado&&!((mForm.aporteFijo||0)>0)&&!((mForm.aportePct||0)>0)){
      flash('En modo simultáneo define un aporte fijo o un % para esta meta; sin uno de los dos quedaría en $0.');return;
    }
    const idx=state.metas.findIndex(x=>x.id===mForm.id);
    if(idx>=0)state.metas[idx]=mForm;else state.metas.push(mForm);
    // Si los % superan 100, ofrecer reajustar las demás proporcionalmente (respetando el % de esta meta).
    if(state.config.estrategia!=='cascada' && (mForm.aportePct||0)>0){
      const elig=eligiblesPct(mForm);
      const sum=elig.reduce((s,x)=>s+(x.aportePct||0),0);
      if(sum>100){
        const ok=await customConfirm(`Con esta meta, tus porcentajes suman ${sum}% (más de 100%). ¿Reajusto las demás metas para que sumen 100% y se respete el ${mForm.aportePct}% de "${esc(mForm.nombre)}"?`);
        if(ok) rebalancePctProporcional(elig, mForm.id);
      }
    }
    mForm=null;save();go(1);flash(editing?'Meta actualizada ✓':'Meta creada ✓');
  };
  const del=$('fDel');
  if(del)del.onclick=async()=>{
    const saldo=mForm.saldo||0;
    let msg='¿Eliminar esta meta?';
    if(saldo>0.5){
      msg=mForm.tipo==='deuda'
        ? `Esta deuda tiene un saldo pendiente de ${fmt(saldo)}. Al borrarla desaparecerá de tu patrimonio (tu patrimonio neto subirá sin haberla pagado). ¿Continuar?`
        : `Esta meta tiene ${fmt(saldo)} acumulados. Al borrarla ese saldo se quitará de tu patrimonio sin dejar registro. ¿Continuar?`;
    }
    if(!await customConfirm(msg,true))return;
    // Snapshot para deshacer; limpia gastos huérfanos de la meta.
    const metaSnap=JSON.parse(JSON.stringify(mForm));
    const gastosSnap=state.gastos.filter(g=>g.meta===metaSnap.id);
    state.gastos=state.gastos.filter(g=>g.meta!==metaSnap.id);
    state.metas=state.metas.filter(x=>x.id!==metaSnap.id);
    mForm=null;save();go(1);
    flashUndo('Meta eliminada',()=>{
      // Restaura de forma idempotente (por si el sync ya la trajo de vuelta).
      if(!state.metas.some(x=>x.id===metaSnap.id))state.metas.push(metaSnap);
      const faltantes=gastosSnap.filter(g=>!state.gastos.some(x=>x.id===g.id));
      if(faltantes.length)state.gastos=state.gastos.concat(faltantes);
      save();go(1);flash('Eliminación deshecha ✓');
    });
  };
}


function gastosDe(id){return state.gastos.filter(g=>g.meta===id);}
function obtenerRecomendacionInversion(m) {
  if (m.tipo === 'deuda') {
    return `<strong>Prioridad de Pago:</strong> Tienes esta deuda pendiente. Pagar una deuda que cobra intereses (como tarjetas de crédito o créditos de consumo) equivale a obtener una inversión con rentabilidad garantizada equivalente a su tasa de interés, libre de impuestos y de riesgo. Se recomienda abonar todo lo posible aquí antes de comenzar a ahorrar o invertir a largo plazo.`;
  }
  if (m.colocado) {
    const mr = horizonteMeses(m);
    let ideal = 'el instrumento que ya elegiste';
    if (mr !== null && mr > 0) ideal = mr < 6 ? 'una cuenta de alto rendimiento' : (mr <= 18 ? 'un CDT a término' : 'fondos o ETFs');
    return `<strong>Dinero ya colocado:</strong> Registras esta meta solo para control, así que no te sugerimos moverla. Para su plazo lo habitual es <strong>${ideal}</strong>; si ya está ahí, perfecto — solo déjalo seguir su curso hasta que lo necesites.`;
  }
  if (m.tipo === 'personal' || m.tipo === 'imprevistos') {
    return `<strong>Bolsillo de Emergencias / Corto Plazo:</strong> Para este tipo de fondos, la prioridad número uno es la <strong>liquidez y seguridad</strong>. Recomendamos usar <strong>Cajitas Nu</strong> (que ofrecen actualmente un 13% E.A. con disponibilidad 24/7) o la cuenta de ahorros de alto rendimiento de <strong>Lulo Bank</strong>.`;
  }
  const mr = horizonteMeses(m);
  if (mr === null || mr <= 0) {
    return `<strong>Inversión Flexible sugerida:</strong> Aún no hay fecha objetivo ni un aporte mensual que permita estimar el plazo. Te sugerimos una opción híbrida: mantén el saldo en <strong>Cajitas Nu</strong> si crees que lo usarás pronto, o abre una cuenta en <strong>Tyba</strong> (fondos colectivos) para realizar aportes recurrentes con miras a mediano plazo.`;
  }
  const plazoTxt = m.fecha
    ? `plazo planeado ~${mr} mes${mr !== 1 ? 'es' : ''}`
    : `horizonte estimado ~${mr} mes${mr !== 1 ? 'es' : ''}`;
  // ¿Sigues juntando esta meta mes a mes? Entonces un CDT (que no admite aportes) no encaja:
  // abrir uno por cada aporte es absurdo. Mientras acumulas conviene una cuenta líquida.
  const falta = m.objetivo > 0 ? Math.max(0, m.objetivo - m.saldo) : Infinity;
  const acumulando = falta > 0 && aporteMensualEstimado(m) > 0;
  if (mr < 6) {
    return `<strong>Corto Plazo (${plazoTxt}):</strong> Tu meta está muy cerca. Recomendamos mantener el dinero en <strong>Cajitas Nu</strong> (13% E.A., liquidez inmediata) o <strong>Lulo Bank</strong> para evitar la volatilidad del mercado y garantizar que el dinero esté disponible cuando lo necesites. La cuenta de alto rendimiento acepta tus aportes mes a mes sin bloquearlos.`;
  } else if (mr <= 18) {
    if (acumulando) {
      return `<strong>Mediano Plazo (${plazoTxt}):</strong> Como estás juntando esta meta mes a mes, <strong>no abras un CDT por cada aporte</strong>: cada uno quedaría bloqueado con un vencimiento distinto. Mientras acumulas, deja el dinero en una <strong>cuenta de alto rendimiento</strong> (Nu Cajitas, Lulo ~13% E.A.), que acepta depósitos y se mantiene líquida. Cuando ya tengas el grueso reunido y la fecha cerca, muévelo a un <strong>CDT</strong> que venza alrededor de esa fecha para asegurar la tasa (o arma una escalera de CDTs).`;
    }
    return `<strong>Mediano Plazo (${plazoTxt}):</strong> Ya tienes el capital reunido para esta meta. La mejor opción es congelar una tasa fija con un <strong>CDT Digital</strong> a término que venza cerca de cuando uses la plata (MejorCDT, Tuya, Lulo o Bancolombia): 10–12% E.A. y protege tu capital de las caídas del mercado.`;
  } else {
    return `<strong>Largo Plazo (${plazoTxt}):</strong> Al ser una meta a más de año y medio, el tiempo juega a tu favor para superar la inflación. Recomendamos portafolios indexados a acciones/ETFs de bajo costo: <strong>Tyba</strong> (fondos de bajo costo) o <strong>trii</strong> (ETFs globales como el CSPX, S&P 500). Aquí sí puedes <strong>aportar mes a mes</strong> sin problema: los fondos y ETFs aceptan aportes recurrentes y promediar el precio de entrada juega a tu favor.`;
  }
}

// Resumen compacto del horizonte de una meta para las filas del coach (texto largo: obtenerRecomendacionInversion).
// Mismos cortes que el motor de recomendación para mantener coherencia.
// Meses de horizonte de una meta = cuándo usarás la plata, para elegir instrumento.
// Con fecha objetivo: meses hasta esa fecha.
// Sin fecha: DURACIÓN TOTAL del plan (objetivo / aporte mensual), NO lo que falta.
// Clave: usar el total evita que el plazo se acorte a medida que llenas la meta
// (si no, un CDT a 1 año pasaría a "corto plazo" al ir aportando, lo cual es absurdo).
function horizonteMeses(m){
  if (m.tipo === 'deuda') return null;
  if (m.fecha) {
    // Duración PLANEADA original (creación -> fecha objetivo), fija. Así no se reclasifica
    // a corto plazo con el paso del tiempo: la plata en un CDT a 1 año sigue siendo "medio".
    if (m.creado) {
      const span = monthsBetweenYM(m.creado, m.fecha);
      if (span && span > 0) return span;
    }
    return monthsUntil(m.fecha); // metas viejas sin fecha de creación
  }
  if (!m.objetivo) return null;
  const aporteMes = aporteMensualEstimado(m);
  if (aporteMes <= 0) return null;
  return Math.ceil(m.objetivo / aporteMes);
}

function clasificarHorizonte(m){
  if (m.tipo === 'deuda')
    return {nivel:'deuda', etiqueta:'Deuda', instrumento:'Pagar primero', color:'#c0532d'};
  if (m.colocado)
    return {nivel:'colocado', etiqueta:'Ya colocado', instrumento:'Registrado para control', color:'var(--gs)'};
  if (m.tipo === 'imprevistos' || m.tipo === 'personal')
    return {nivel:'corto', etiqueta:'Liquidez', instrumento:'Cuenta alto rendimiento', color:'#14cb3c'};
  const mr = horizonteMeses(m);
  if (mr === null || mr <= 0)
    return {nivel:'flexible', etiqueta:'Flexible', instrumento:'Cuenta líquida o fondo', color:'#1a8cc3'};
  if (mr < 6)   return {nivel:'corto', etiqueta:'Corto', instrumento:'Cuenta alto rendimiento', color:'#14cb3c'};
  if (mr <= 18) {
    const falta = m.objetivo > 0 ? Math.max(0, m.objetivo - m.saldo) : Infinity;
    const acum = falta > 0 && aporteMensualEstimado(m) > 0;
    return {nivel:'medio', etiqueta:'Medio', instrumento: acum ? 'Cuenta líquida → luego CDT' : 'CDT (tasa fija)', color:'var(--gold)'};
  }
  return               {nivel:'largo', etiqueta:'Largo', instrumento:'ETFs / fondos',            color:'#4a90e2'};
}

function obtenerRecomendacionInversionCard(m) {
  const text = obtenerRecomendacionInversion(m);
  return `
    <div class="card recommendation-card" style="margin-top:16px; border: 1px solid var(--gold); background: rgba(192, 138, 45, 0.05); padding: 14px; border-radius: 8px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <div style="font-weight:700; color:var(--gold); font-size:13.5px; font-family:var(--sans);">Recomendación Nuestro Plan</div>
      </div>
      <div style="font-size:12.5px; color:rgba(246,241,230,.9); line-height:1.45;">
        ${text}
      </div>
    </div>
  `;
}

/* =========================================================
   CERRAR MES (cascada)
   ========================================================= */
function computeReparto(g,a){
  const c=state.config,base=computeBase(),comb=g+a;
  const prem=comb*c.pctPremio/100;
  const ahorroVar=comb*(1-c.pctPremio/100);
  const ahorro=base+ahorroVar;
  const gastosDia=c.soloAhorroDirecto ? 0 : gastosFijosTotal();
  const pf1=premioSplitFactor('p1',{p1:g,p2:a});
  const pf2=1-pf1;
  const gustosPareja=c.soloAhorroDirecto ? 0 : c.planPareja;
  const gustosP1=c.soloAhorroDirecto ? (prem*pf1) : (c.libreP1+prem*pf1);
  const gustosP2=c.soloAhorroDirecto ? (prem*pf2) : (c.libreP2+prem*pf2);
  const gustos=gustosPareja+gustosP1+gustosP2;
  const dist=distribuirAhorro(ahorro);
  const sobrante=_ultimoSobrante.slice();
  return {base,comb,prem,ahorro,gastosDia,gustos,gustosPareja,gustosP1,gustosP2,dist,sobrante,nom:c.soloAhorroDirecto ? 0 : (c.nominaP1+c.nominaP2),entra:c.soloAhorroDirecto ? (base+comb) : (c.nominaP1+c.nominaP2+comb)};
}
function getDistribucionAdvertencia() {
  const c = state.config;
  const warnings = [];
  const sharedGoals = metasCompartidas();
  
  if (c.estrategia !== 'cascada') {
    const pctSum = sharedGoals.filter(m => (m.aportePct||0) > 0 && (c.estrategia === 'simultaneo' || m.tipo !== 'imprevistos')).reduce((s, m) => s + m.aportePct, 0);
    if (pctSum < 100) {
      const deudas = sharedGoals.filter(m => m.tipo === 'deuda' && m.saldo > 0);
      const sugerencia = deudas.length > 0 
        ? "Sugerencia: aumenta la asignación para amortizar tus deudas más rápido." 
        : "Sugerencia: asigna el 100% para que no quede dinero libre sin rumbo.";
      warnings.push(`<strong>Metas Comunes:</strong> Solo tienes distribuido el <strong>${pctSum}%</strong> del ahorro común. El ${100 - pctSum}% restante se reparte solo: primero completa el colchón de tu fondo de emergencia (si le falta) y el resto va a tu inversión abierta. ${sugerencia}`);
    } else if (pctSum > 100) {
      warnings.push(`<strong>Metas Comunes:</strong> Tus metas comunes asignadas suman el <strong>${pctSum}%</strong> (supera el 100%). Ajusta la distribución.`);
    }
    // Red de seguridad: metas que reciben $0 por no tener fijo ni %. En secuencial se exime la
    // prioritaria (recibe el remanente automáticamente); la inversión abierta es sumidero del sobrante.
    const prioSec = c.estrategia === 'secuencial' ? getMetaPrioritaria() : null;
    const prioSecId = prioSec ? prioSec.id : null;
    const sinAporte = sharedGoals.filter(m =>
      m.tipo !== 'invertir' && !m.colocado && m.id !== prioSecId &&
      !((m.aporteFijo || 0) > 0) && !((m.aportePct || 0) > 0)
    );
    if (sinAporte.length > 0) {
      const nombres = sinAporte.map(m => `"${esc(m.nombre)}"`).join(', ');
      const plural = sinAporte.length > 1;
      warnings.push(`<strong>Metas sin aporte:</strong> ${nombres} ${plural ? 'no tienen' : 'no tiene'} aporte fijo ni %, así que ${plural ? 'recibirán' : 'recibirá'} $0 este mes${c.estrategia === 'secuencial' ? ' (salvo lo que sobre tras la meta prioritaria)' : ''}. Asígnale${plural ? 's' : ''} un fijo o un % en Metas → Ahorros.`);
    }
    // Sin meta de inversión abierta, una meta sin objetivo termina actuando como sumidero del excedente.
    if (!inversionAbierta()) {
      const sumidero = sharedGoals
        .filter(m => m.tipo !== 'deuda' && !m.colocado && (m.objetivo || 0) <= 0)
        .sort((a, b) => (a.prioridad || 0) - (b.prioridad || 0))[0];
      if (sumidero) {
        warnings.push(`<strong>Sin meta de inversión:</strong> el excedente del mes (lo que sobre tras llenar tus metas con objetivo) se acumulará en "${esc(sumidero.nombre)}", que no tiene objetivo y actúa como sumidero. Si prefieres un destino dedicado para el sobrante, crea una meta de inversión.`);
      }
    }
  } else {
    // Cascada: una meta no-inversión sin objetivo devuelve falta=Infinity y absorbe TODO el
    // ahorro, dejando sin nada a las metas de menor prioridad. Avisar para que definan objetivo.
    const sinObjetivo = sharedGoals.filter(m =>
      m.tipo !== 'invertir' && m.tipo !== 'deuda' && !m.colocado && (m.objetivo || 0) <= 0
    );
    if (sinObjetivo.length > 0) {
      const nombres = sinObjetivo.map(m => `"${esc(m.nombre)}"`).join(', ');
      const plural = sinObjetivo.length > 1;
      warnings.push(`<strong>Cascada sin meta definida:</strong> ${nombres} ${plural ? 'no tienen' : 'no tiene'} un objetivo de ahorro. En cascada, una meta sin objetivo absorbe <strong>todo</strong> el ahorro disponible (base y extras) y las metas de menor prioridad nunca reciben nada. Defínele un objetivo para que la cascada baje correctamente.`);
    }
  }

  // Individual warnings
  const perfil = c.perfil;
  const indivGoals = metasIndividuales(perfil);
  if (indivGoals.length > 0) {
    const indivPctSum = indivGoals.reduce((s, m) => s + (m.aportePct||0), 0);
    if (indivPctSum < 100) {
      warnings.push(`<strong>Metas Individuales:</strong> Solo tienes distribuido el <strong>${indivPctSum}%</strong> de tu bolsillo. El ${100 - indivPctSum}% restante quedará libre en tu bolsillo personal.`);
    } else if (indivPctSum > 100) {
      warnings.push(`<strong>Metas Individuales:</strong> Tus metas individuales suman el <strong>${indivPctSum}%</strong> (supera el 100%). Ajusta los porcentajes.`);
    }
  }

  // Sobrante cayendo en una inversión "ya colocada" por falta de otra activa.
  const inv = inversionAbierta();
  if (inv && inv.colocado) {
    warnings.push(`<strong>Inversión ya colocada:</strong> "${esc(inv.nombre)}" está marcada como ya invertida, pero es tu único destino de inversión, así que el sobrante del mes entrará ahí. Verifica que ese instrumento admita nuevos aportes (un CDT, por ejemplo, no): si no, crea otra meta de inversión activa o mueve ese dinero a mano.`);
  }

  return warnings;
}

function drawLockedBudgetStack(entry) {
  const c = Object.assign({}, state.config, entry.config || {});
  const r = entry.reparto;
  const isIndiv = c.modo === 'individual';
  const total = r.entra;
  if (!total) return '';
  
  const pGas = (r.gastosDia / total) * 100;
  
  if (isIndiv) {
    const pL1 = (r.gustosP1 / total) * 100;
    return `
      <span class="st-seg" style="width:${pGas.toFixed(1)}%; background:#8a7f70;"></span>
      <span class="st-seg st-seg-p1" style="width:${pL1.toFixed(1)}%"></span>
      <span class="st-seg" style="flex:1; background:#3d8c64;"></span>
    `;
  } else {
    const pPP = (r.gustosPareja / total) * 100;
    const pL1 = (r.gustosP1 / total) * 100;
    const pL2 = (r.gustosP2 / total) * 100;
    return `
      <span class="st-seg" style="width:${pGas.toFixed(1)}%; background:#8a7f70;"></span>
      <span class="st-seg st-seg-pp" style="width:${pPP.toFixed(1)}%"></span>
      <span class="st-seg st-seg-p1" style="width:${pL1.toFixed(1)}%"></span>
      <span class="st-seg st-seg-p2" style="width:${pL2.toFixed(1)}%"></span>
      <span class="st-seg" style="flex:1; background:#3d8c64;"></span>
    `;
  }
}

function drawLockedBudgetLegend(entry) {
  const c = Object.assign({}, state.config, entry.config || {});
  const r = entry.reparto;
  const isIndiv = c.modo === 'individual';
  const total = r.entra;
  if (!total) return '';
  
  const pGas = (r.gastosDia / total) * 100;
  
  if (isIndiv) {
    const pL1 = (r.gustosP1 / total) * 100;
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="width:7px; height:7px; border-radius:50%; background:#8a7f70;"></span>Mis gastos fijos</div>
        <b>${fmt(r.gastosDia)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pGas)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-p1" style="width:7px; height:7px; border-radius:50%;"></span>Tu dinero personal</div>
        <b>${fmt(r.gustosP1)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pL1)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="width:7px; height:7px; border-radius:50%; background:#3d8c64;"></span>Ahorro e inversión</div>
        <b>${fmt(r.ahorro)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(100 - pGas - pL1)}%)</span></b>
      </div>
    `;
  } else {
    const pPP = (r.gustosPareja / total) * 100;
    const pL1 = (r.gustosP1 / total) * 100;
    const pL2 = (r.gustosP2 / total) * 100;
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="width:7px; height:7px; border-radius:50%; background:#8a7f70;"></span>Gastos del hogar</div>
        <b>${fmt(r.gastosDia)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pGas)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-pp" style="width:7px; height:7px; border-radius:50%;"></span>Para los dos</div>
        <b>${fmt(r.gustosPareja)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pPP)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-p1" style="width:7px; height:7px; border-radius:50%;"></span>Personal de ${c.nombreP1}</div>
        <b>${fmt(r.gustosP1)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pL1)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-p2" style="width:7px; height:7px; border-radius:50%;"></span>Personal de ${c.nombreP2}</div>
        <b>${fmt(r.gustosP2)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pL2)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot" style="width:7px; height:7px; border-radius:50%; background:#3d8c64;"></span>Ahorro e inversión</div>
        <b>${fmt(r.ahorro)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(100 - pGas - pPP - pL1 - pL2)}%)</span></b>
      </div>
    `;
  }
}

function drawActiveSavedDistributionList(entry) {
  const unifiedDist = {};
  
  if (entry.reparto && entry.reparto.dist) {
    Object.keys(entry.reparto.dist).forEach(id => {
      const m = metaById(id);
      if (m) {
        unifiedDist[id] = { m, base: entry.reparto.dist[id], extra: 0 };
      }
    });
  }
  
  especialesVisibles(entry.especiales).forEach(ep => {
    const toSave = ep.monto * (1 - (ep.pctRetener || 0) / 100);
    if (toSave > 0.5) {
      if (ep.meta === 'distribuir') {
        // Usa el snapshot real aplicado (ep.dist); recalcular aquí mentiría porque los saldos ya cambiaron.
        const distEsp = ep.dist || distribuirAhorro(toSave, true);
        state.metas.forEach(m => {
          if (m.tipo !== 'personal' && !m.dueno && (distEsp[m.id] || 0) > 0.5) {
            if (!unifiedDist[m.id]) unifiedDist[m.id] = { m, base: 0, extra: 0 };
            unifiedDist[m.id].extra += distEsp[m.id];
          }
        });
      } else if (ep.meta === 'distribuir-individual') {
        const distEsp = ep.dist || distribuirAhorroIndividual(ep.duenoPriv || state.config.perfil, toSave, true).dist;
        state.metas.forEach(m => {
          if (m.dueno === ep.duenoPriv && (distEsp[m.id] || 0) > 0.5) {
            if (!unifiedDist[m.id]) unifiedDist[m.id] = { m, base: 0, extra: 0 };
            unifiedDist[m.id].extra += distEsp[m.id];
          }
        });
        const allocatedSum = Object.values(distEsp).reduce((a, b) => a + b, 0);
        const rem = Math.max(0, toSave - allocatedSum);
        if (rem > 0.5) {
          const pocket = metaPersonal(ep.duenoPriv || state.config.perfil);
          if (pocket) {
            if (!unifiedDist[pocket.id]) unifiedDist[pocket.id] = { m: pocket, base: 0, extra: 0 };
            unifiedDist[pocket.id].extra += rem;
          }
        }
      } else {
        const md = metaById(ep.meta);
        if (md) {
          if (!unifiedDist[ep.meta]) unifiedDist[ep.meta] = { m: md, base: 0, extra: 0 };
          unifiedDist[ep.meta].extra += toSave;
        }
      }
    }
  });

  const list = Object.values(unifiedDist).filter(x => (x.base + x.extra) > 0.5);
  if (list.length === 0) {
    return `<div class="leg-row" style="font-size:12px;color:var(--gs);margin-top:6px">No hubo ahorros distribuidos este mes.</div>`;
  }

  const totalAh = Math.max(1, list.reduce((s, x) => s + x.base + x.extra, 0));
  const mh = list.map(x => {
    const tot = x.base + x.extra;
    return `<div class="meta-lvl"><div class="lvl-row"><span class="lvl-name">${x.m.nombre} <span class="lvl-tag">· ${tipoLabel(x.m.tipo)}</span></span><span class="lvl-val num">${fmt(tot)}</span></div><div class="lvl-bar"><i style="width:${Math.max(3, Math.min(100, tot / totalAh * 100)).toFixed(1)}%"></i></div>${x.extra > 0 ? `<div style="font-size:11px;color:var(--gs);margin-top:3px;padding-left:2px">↳ incluye +${fmt(x.extra)} de ingresos adicionales</div>` : ''}</div>`;
  }).join('');
  return `<div class="meta-block"><div class="mt-title">A dónde fue el ahorro</div>${mh}</div>`;
}

function updatePlanningSummary() {
  const c = state.config;
  if ($('ahorroDirecto_input')) c.ahorroDirecto = parse($('ahorroDirecto_input').value);
  if ($('nominaP1_input')) c.nominaP1 = parse($('nominaP1_input').value);
  if ($('nominaP2_input')) c.nominaP2 = parse($('nominaP2_input').value);
  if ($('gastos_input')) c.gastos = parse($('gastos_input').value);
  if ($('planPareja_input')) c.planPareja = parse($('planPareja_input').value);
  if ($('libreP1_input')) c.libreP1 = parse($('libreP1_input').value);
  if ($('libreP2_input')) c.libreP2 = parse($('libreP2_input').value);
  
  save();
  
  const container = $('planningStackContainer');
  if (container) {
    container.innerHTML = drawFixedBudgetCard();
  }
  
  const warnContainer = $('planningWarningsContainer');
  if (warnContainer) {
    warnContainer.innerHTML = drawWarningsChip();
    const warnChip = $('btnWarnChip');
    if (warnChip) {
      warnChip.onclick = () => {
        const panel = $('warnPanel');
        if (panel) panel.classList.toggle('open');
      };
    }
  }

  const distPreviewContainer = $('planningDistPreviewContainer');
  if (distPreviewContainer) {
    distPreviewContainer.innerHTML = drawDistribucionPreview();
  }

  // Refrescar línea resumen de ingresos (visible cuando el form está colapsado)
  const summaryEl = $('incomeSummary');
  if (summaryEl) {
    summaryEl.innerHTML = drawIncomeSummaryLine();
  }

  // Refrescar label + estado del CTA sticky
  const r = computeReparto(0, 0);
  const ahorro = r.ahorro || 0;
  const btn = $('btnApplyPreSave');
  if (btn) {
    const canEdit = canEditShared();
    if (!canEdit) {
      btn.disabled = true;
      btn.className = 'btn gold';
      btn.textContent = 'Confirmar aporte del mes';
    } else if (ahorro < 0) {
      btn.disabled = false;
      btn.className = 'btn danger';
      btn.textContent = `Cubrir mes en rojo · ${fmt(-ahorro)}`;
    } else if (ahorro === 0) {
      btn.disabled = true;
      btn.className = 'btn gold';
      btn.textContent = 'Sin ahorro para distribuir';
    } else {
      btn.disabled = false;
      btn.className = 'btn gold';
      btn.textContent = `Confirmar aporte de ${fmt(ahorro)}`;
    }
  }
}

async function desaplicarMes(mes) {
  const entry = state.log.find(e => e.mes === mes);
  if (!entry) return;
  if (!await customConfirm(`¿Estás seguro de reabrir el mes de ${fmtMes(mes)}? Esto revertirá los saldos de ahorro y pagos de deuda realizados al aplicar este mes.`, true)) return;
  
  if (entry.reparto && entry.reparto.dist) {
    Object.keys(entry.reparto.dist).forEach(id => {
      const m = metaById(id);
      if (m) {
        if (m.tipo === 'deuda') {
          m.saldo += entry.reparto.dist[id];
        } else {
          m.saldo = Math.max(0, m.saldo - entry.reparto.dist[id]);
        }
      }
    });
  }
  if (entry.cobertura) revertirCobertura(entry.cobertura);
  
  if (entry.especiales) {
    entry.especiales.forEach(ep => {
      const pctR = ep.pctRetener || 0;
      const toSave = ep.monto * (1 - pctR / 100);
      if (toSave > 0.5) {
        if (ep.meta === 'distribuir') {
          // Usa el reparto guardado al aplicar; el fallback (re-ejecutar) solo cubre entries antiguos sin snapshot.
          const dist = ep.dist || distribuirAhorro(toSave, true);
          state.metas.forEach(m => {
            if (m.tipo !== 'personal' && !m.dueno && (dist[m.id] || 0) > 0.5) {
              if (m.tipo === 'deuda') {
                m.saldo += dist[m.id];
              } else {
                m.saldo = Math.max(0, m.saldo - dist[m.id]);
              }
            }
          });
        } else if (ep.meta === 'distribuir-individual') {
          const profile = ep.duenoPriv || state.config.perfil;
          const dist = ep.dist || distribuirAhorroIndividual(profile, toSave, true).dist;
          state.metas.forEach(m => {
            if (m.dueno === profile && (dist[m.id] || 0) > 0.5) {
              if (m.tipo === 'deuda') {
                m.saldo += dist[m.id];
              } else {
                m.saldo = Math.max(0, m.saldo - dist[m.id]);
              }
            }
          });
          const allocatedSum = Object.values(dist).reduce((a, b) => a + b, 0);
          const rem = Math.max(0, toSave - allocatedSum);
          if (rem > 0.5) {
            const pocket = metaPersonal(profile);
            if (pocket) pocket.saldo = Math.max(0, pocket.saldo - rem);
          }
        } else {
          const m = metaById(ep.meta);
          if (m) {
            if (m.tipo === 'deuda') {
              m.saldo += toSave;
            } else {
              m.saldo = Math.max(0, m.saldo - toSave);
            }
          }
        }
      }

      const perfil = state.config.perfil;
      const per = metaPersonal(perfil);
      const toPocket = ep.monto - toSave;
      if (toPocket > 0.5 && per) {
        let share = 0;
        if (ep.persona === perfil) share = toPocket;
        else if (ep.persona === 'ambos') share = toPocket * 0.5;
        if (share > 0) {
          per.saldo = Math.max(0, per.saldo - share);
        }
      }
    });
  }
  
  const perfil = state.config.perfil;
  const per = metaPersonal(perfil);
  if (per) {
    const ya = per.aportes.find(x => x.mes === mes);
    if (ya) {
      const { dist, rem } = distribuirAhorroIndividual(perfil, ya.monto);
      Object.keys(dist).forEach(id => {
        const m = metaById(id);
        if (m) {
          if (m.tipo === 'deuda') {
            m.saldo += dist[id];
          } else {
            m.saldo = Math.max(0, m.saldo - dist[id]);
          }
        }
      });
      per.saldo = Math.max(0, per.saldo - rem);
      per.aportes = per.aportes.filter(x => x.mes !== mes);
    }
  }
  
  if (entry.especiales) {
    // Borra por id (preciso); cae a nombre solo en entries antiguos sin ingresoId.
    const ids = entry.especiales.map(ep => ep.ingresoId).filter(Boolean);
    const names = entry.especiales.filter(ep => !ep.ingresoId).map(ep => ep.nombre);
    state.ingresos = state.ingresos.filter(ing => ing.sinAsignar || ing.mes !== mes || (!ids.includes(ing.id) && !names.includes(ing.nombre)));
  }
  
  state.log = state.log.filter(e => e.mes !== mes);
  save();
  renderMiMes();
  flash('Mes reabierto. Presupuesto liberado para edición ✓');
}

/* =========================================================
   COBERTURA DE DÉFICIT (mes en rojo)
   ========================================================= */
function deficitFuentes(){
  const perfil = state.config.perfil;
  // Fuentes: cualquier meta/bolsillo con saldo, propia o compartida.
  // Privacidad: se excluyen las del otro perfil.
  const fuentes = state.metas.filter(m =>
    m.tipo !== 'deuda' && (!m.dueno || m.dueno === perfil) && m.saldo > 0.5
  );
  const deudas = state.metas.filter(m => m.tipo === 'deuda' && (!m.dueno || m.dueno === perfil));
  return { fuentes, deudas };
}
function deficitFuenteNombre(m){
  if (m.tipo === 'personal') {
    const c = state.config;
    return c.modo === 'pareja' ? 'Individual ' + (m.dueno === 'p2' ? c.nombreP2 : c.nombreP1) : 'Individual';
  }
  if (m.dueno) return m.nombre + ' (individual)';
  return m.nombre;
}

// cob: [{fuente:'meta'|'deuda', metaId, monto, gastoId?}]
// meta: resta saldo y deja gasto trazable. Deuda: crece (origen de fondos).
function aplicarCobertura(cob, mes){
  cob.forEach(item => {
    const m = metaById(item.metaId);
    if (!m) return;
    if (item.fuente === 'deuda') {
      m.saldo += item.monto;
    } else {
      m.saldo = Math.max(0, m.saldo - item.monto);
      const gId = uid();
      state.gastos.push({id:gId, meta:m.id, fecha:today(), monto:item.monto, nota: 'Cobertura de déficit ' + fmtMes(mes), creadoPor: state.config.perfil});
      item.gastoId = gId;
    }
  });
  return cob;
}

function revertirCobertura(cob){
  (cob || []).forEach(item => {
    const m = metaById(item.metaId);
    if (!m) return;
    if (item.fuente === 'deuda') {
      m.saldo = Math.max(0, m.saldo - item.monto);
    } else {
      m.saldo += item.monto;
    }
    if (item.gastoId) state.gastos = state.gastos.filter(g => g.id !== item.gastoId);
  });
}

// Modal: devuelve Promise<cob|null>. null = canceló (el mes no se aplica).
function openAsistenteDeficit(faltante){
  return new Promise(resolve => {
    const f = deficitFuentes();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalDeficit';
    overlay.style.display = 'flex';
    const deudaOpts = f.deudas.map(d => `<option value="${d.id}">${esc(d.nombre)}</option>`).join('');
    const fuentesHtml = f.fuentes.length
      ? f.fuentes.map(m => `<div>
          <label class="lbl">${esc(deficitFuenteNombre(m))} <span style="font-weight:400;color:var(--gs)">(disponible ${fmt(m.saldo)})</span></label>
          <input class="sf money df-src" data-metaid="${m.id}" inputmode="numeric" placeholder="$0">
        </div>`).join('')
      : `<div class="hint" style="font-size:12px;margin:0;">No tienes metas ni bolsillo con saldo. Cubre el faltante con una tarjeta o deuda.</div>`;
    overlay.innerHTML = `
      <div class="modal-card animate-in" style="max-width:400px;">
        <h3 class="modal-title" style="font-size:20px;">Mes en rojo</h3>
        <div class="hint" style="font-size:12.5px;line-height:1.4;margin:0;">Este mes faltaron <b style="color:#e06c75">${fmt(faltante)}</b>. Elige de qué meta, bolsillo o deuda salió la plata en la vida real y el mes quedará en el historial como cubierto.</div>
        <div style="display:flex;flex-direction:column;gap:10px;max-height:42vh;overflow-y:auto;margin-top:4px;">
          ${fuentesHtml}
        </div>
        <div>
          <label class="lbl">Tarjeta / deuda</label>
          <select class="sf" id="dfDeudaSel">
            <option value="">No usar deuda</option>
            ${deudaOpts}
            <option value="__nueva__">Nueva deuda (tarjeta de crédito)</option>
          </select>
          <input class="sf money" id="dfDeuda" inputmode="numeric" placeholder="$0" style="margin-top:8px;display:none;">
        </div>
        <div id="dfResumen" class="hint" style="margin:4px 0 0;font-size:12px;"></div>
        <div style="display:flex;gap:10px;margin-top:8px;">
          <button class="btn ghost sm" id="dfCancel" style="flex:1;margin:0;">Cancelar</button>
          <button class="btn sm" id="dfOk" style="flex:1;margin:0;" disabled>Cubrir y aplicar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const q = sel => overlay.querySelector(sel);

    // Mapa metaId -> saldo disponible, para validar cada fila.
    const srcSaldo = {}; f.fuentes.forEach(m => srcSaldo[m.id] = m.saldo);

    // Formateo de moneda idéntico al de aeMonto.
    overlay.querySelectorAll('input.money').forEach(inp => {
      inp.addEventListener('input', e => {
        const d = e.target.value.replace(/\D/g,'');
        e.target.value = d ? '$' + Number(d).toLocaleString('es-CO') : '';
        recalc();
      });
      inp.addEventListener('focus', e => {
        const val = parse(e.target.value);
        e.target.value = val ? String(val) : '';
        e.target.select();
      });
      inp.addEventListener('blur', e => {
        const d = e.target.value.replace(/\D/g,'');
        e.target.value = d ? '$' + Number(d).toLocaleString('es-CO') : '';
      });
    });

    q('#dfDeudaSel').onchange = () => {
      q('#dfDeuda').style.display = q('#dfDeudaSel').value ? 'block' : 'none';
      recalc();
    };

    function vals(){
      let total = 0, exceso = null;
      overlay.querySelectorAll('.df-src').forEach(inp => {
        const v = parse(inp.value);
        const id = inp.dataset.metaid;
        if (v > srcSaldo[id] + 0.5 && !exceso) {
          const m = metaById(id);
          exceso = m ? deficitFuenteNombre(m) : 'Una fuente';
        }
        total += v;
      });
      const vDeu = q('#dfDeudaSel').value ? parse(q('#dfDeuda').value) : 0;
      return { total, vDeu, exceso };
    }
    function recalc(){
      const { total, vDeu, exceso } = vals();
      const falta = faltante - (total + vDeu);
      let msg = '', ok = false;
      if (exceso) msg = `"${exceso}" no tiene tanto.`;
      else if (Math.abs(falta) <= 0.5) { msg = 'Cobertura completa ✓'; ok = true; }
      else if (falta > 0) msg = 'Faltan ' + fmt(falta) + ' por cubrir.';
      else msg = 'Te pasaste por ' + fmt(-falta) + '. Ajusta los montos.';
      q('#dfResumen').textContent = msg;
      q('#dfOk').disabled = !ok;
    }

    q('#dfCancel').onclick = () => { overlay.remove(); resolve(null); };
    q('#dfOk').onclick = () => {
      const cob = [];
      overlay.querySelectorAll('.df-src').forEach(inp => {
        const v = parse(inp.value);
        if (v > 0.5) cob.push({fuente:'meta', metaId:inp.dataset.metaid, monto:v});
      });
      const vDeu = q('#dfDeudaSel').value ? parse(q('#dfDeuda').value) : 0;
      if (vDeu > 0.5) {
        let dId = q('#dfDeudaSel').value;
        if (dId === '__nueva__') {
          dId = uid();
          state.metas.push({id:dId, nombre:'Tarjeta de crédito', tipo:'deuda', saldo:0, objetivo:0, aporteFijo:0, aportePct:0, pagoMinimo:0, prioridad:state.metas.length, creado:today(), aportes:[]});
        }
        cob.push({fuente:'deuda', metaId:dId, monto:vDeu});
      }
      overlay.remove();
      resolve(cob);
    };
    recalc();
  });
}

function openAsistenteIngresoExtra(preFill = null) {
  const c = state.config;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modalAsistente';
  overlay.style.display = 'flex';

  const comp = metasCompartidas().filter(m => !m.colocado && m.tipo !== 'deuda');
  const indiv = metasIndividuales(c.perfil).filter(m => !m.colocado && m.tipo !== 'deuda');
  const og = (lbl, arr) => arr.length ? `<optgroup label="${lbl}">${arr.map(m => `<option value="${m.id}">${m.nombre} (${tipoLabel(m.tipo)})</option>`).join('')}</optgroup>` : '';
  const optionsHtml = og('Metas comunes', comp) + og('Mis metas (privadas)', indiv);

  const defaultConcepto = preFill ? preFill.concepto : '';
  const defaultMonto = preFill && preFill.monto ? '$' + Number(preFill.monto).toLocaleString('es-CO') : '';

  let selectOptionsHtml = '';
  if (c.modo === 'pareja') {
    selectOptionsHtml += '<option value="distribuir">Repartir entre metas comunes (según el plan)</option>';
    selectOptionsHtml += '<option value="distribuir-individual">Repartir entre mis metas individuales (según el plan)</option>';
  } else {
    selectOptionsHtml += '<option value="distribuir-individual">Repartir entre mis metas (según el plan)</option>';
  }
  selectOptionsHtml += optionsHtml;

  overlay.innerHTML = `
    <div class="modal-card animate-in" style="max-width:400px;">
      <h3 class="modal-title" style="font-size:20px;">Añadir dinero al plan</h3>
      <div class="hint" style="font-size:12.5px; line-height:1.4; margin:0;">Registra dinero que entra al plan y decide a dónde va.</div>

      <div>
        <label class="lbl">Concepto / Fuente</label>
        <input class="sf" id="aeConcepto" value="${defaultConcepto}" placeholder="Ej: Venta de garaje, Bono extra, Freelance">
      </div>

      <div>
        <label class="lbl">Monto total</label>
        <input class="sf money" id="aeMonto" value="${defaultMonto}" inputmode="numeric" placeholder="$0">
      </div>

      <div>
        <label class="lbl">¿A dónde va?</label>
        <select class="sf" id="aeMetaDestino">
          ${selectOptionsHtml}
        </select>
      </div>

      <!-- hidden placeholder inputs to keep backward compatibility with form selectors -->
      <input type="range" id="aePctRange" value="0" style="display:none;">
      <select id="aePersona" style="display:none;"><option value="ambos">Ambos</option></select>
      <div id="aePreviewContainer" style="display:none; margin-top:10px; background:rgba(246,241,230,0.04); border:1px dashed var(--line); border-radius:12px; padding:10px 12px; font-size:12.5px; flex-direction:column; gap:6px;"></div>

      <div style="display:flex; gap:10px; margin-top:8px;">
        <button class="btn ghost sm" id="btnCancelAE" style="flex:1; margin:0;">Cancelar</button>
        <button class="btn sm" id="btnApplyAE" style="flex:1; margin:0;">Añadir ahorro</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const moneyInput = overlay.querySelector('#aeMonto');
  moneyInput.addEventListener('input', e => {
    const d = e.target.value.replace(/\D/g,'');
    e.target.value = d ? '$' + Number(d).toLocaleString('es-CO') : '';
  });
  moneyInput.addEventListener('focus', e => {
    const val = parse(e.target.value);
    e.target.value = val ? String(val) : '';
    e.target.select();
  });
  moneyInput.addEventListener('blur', e => {
    const d = e.target.value.replace(/\D/g,'');
    e.target.value = d ? '$' + Number(d).toLocaleString('es-CO') : '';
  });

  const range = overlay.querySelector('#aePctRange');
  const label = overlay.querySelector('#aePctLabel');
  if (range && label) {
    range.oninput = () => {
      label.innerText = range.value + '%';
    };
  }

  const aeToggleRet = overlay.querySelector('#aeToggleRet');
  if (aeToggleRet) {
    const retBox = overlay.querySelector('#aeRetBox');
    aeToggleRet.onclick = () => {
      const open = retBox.style.display === 'none';
      retBox.style.display = open ? 'block' : 'none';
      if (!open) { range.value = 0; label.innerText = '0%'; }
      updateModalPreview();
    };
  }

  overlay.querySelector('#btnCancelAE').onclick = () => {
    overlay.remove();
  };

  const aeMontoInput = overlay.querySelector('#aeMonto');
  const aePctRange = overlay.querySelector('#aePctRange');
  const aeMetaDestino = overlay.querySelector('#aeMetaDestino');
  const aePersona = overlay.querySelector('#aePersona');

  const updateModalPreview = () => {
    const monto = parse(aeMontoInput.value);
    const pctRetener = parseInt(aePctRange.value) || 0;
    const metaDestino = aeMetaDestino.value;
    const previewDiv = overlay.querySelector('#aePreviewContainer');
    
    if (!previewDiv) return;
    
    if (monto <= 0) {
      previewDiv.style.display = 'none';
      previewDiv.innerHTML = '';
      return;
    }
    
    const toPocket = monto * (pctRetener / 100);
    const toSave = monto - toPocket;
    
    let html = '';
    
    // 1. Resumen de retención si aplica
    if (toPocket > 0.5) {
      const persona = aePersona.value;
      let persLabel = '';
      if (persona === 'ambos') persLabel = 'para Ambos (50/50)';
      else if (persona === 'p1') persLabel = `para ${c.nombreP1}`;
      else if (persona === 'p2') persLabel = `para ${c.nombreP2}`;
      
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; color:var(--gs); margin-bottom:4px; font-size:12px; border-bottom: 1px solid rgba(246,241,230,.08); padding-bottom:4px;">
          <span>Retenido para bolsillo ${persLabel}:</span>
          <span style="font-weight:700; color:var(--gold);">${fmt(toPocket)} (${pctRetener}%)</span>
        </div>
      `;
    }
    
    // 2. Destino de los Ahorros
    if (toSave > 0.5) {
      if (metaDestino === 'distribuir') {
        const oldSobrante = _ultimoSobrante;
        const dist = distribuirAhorro(toSave, true);
        _ultimoSobrante = oldSobrante; // restaurar
        
        const comp = metasCompartidas().filter(m => !m.colocado);
        const recibiendo = comp.map(m => ({ m, v: dist[m.id] || 0 })).filter(x => x.v > 0.5);
        
        html += `
          <div style="font-weight:700; color:var(--green); margin-bottom:6px;">Distribución estimada: <span style="color:var(--gold);">${fmt(toSave)}</span></div>
          <div style="display:flex; flex-direction:column; gap:8px; max-height:180px; overflow-y:auto; padding-right:4px; margin-bottom:4px;">
        `;
        
        if (recibiendo.length === 0) {
          html += `<div style="color:var(--gs); font-size:11.5px; font-style:italic;">No hay metas que reciban dinero con esta distribución.</div>`;
        } else {
          recibiendo.forEach(x => {
            const m = x.m;
            const newSaldo = m.saldo + x.v;
            const isFilled = m.objetivo > 0 && newSaldo >= m.objetivo;
            const badge = isFilled ? ` <span class="tag ok" style="padding:1px 5px; font-size:9px; vertical-align:middle; margin-left:4px; border-color:var(--gb); color:var(--gb);">¡Se llena! 🎉</span>` : '';
            const pct = (x.v / toSave) * 100;
            
            html += `
              <div style="margin-bottom: 2px;">
                <div style="display:flex; justify-content:space-between; align-items:baseline; font-size:12px; margin-bottom: 3px;">
                  <span style="color:var(--ink); font-weight:600;">${m.nombre}${badge}</span>
                  <span class="num" style="font-weight:700; color:var(--gs);">${fmt(x.v)} <span style="font-size:10px; color:rgba(28,58,44,0.7); font-weight:normal; margin-left:2px;">(→ ${fmtK(newSaldo)})</span></span>
                </div>
                <div class="lvl-bar" style="height:7px; background:rgba(28, 58, 44, 0.08); border-radius:4px; overflow:hidden;">
                  <i style="display:block; height:100%; border-radius:4px; background:${m.color || 'var(--gb)'}; width:${pct.toFixed(1)}%;"></i>
                </div>
              </div>
            `;
          });
        }
        html += `</div>`;
        
        // Calcular si hay sobrellenado o si queda dinero sin asignar
        const allocatedSum = Object.values(dist).reduce((a, b) => a + b, 0);
        const unallocated = Math.max(0, toSave - allocatedSum);
        
        let totalOverfill = 0;
        Object.keys(dist).forEach(mId => {
          const m = metaById(mId);
          if (m && m.objetivo > 0 && dist[mId] > 0) {
            const falta = Math.max(0, m.objetivo - m.saldo);
            if (dist[mId] > falta) {
              totalOverfill += dist[mId] - falta;
            }
          }
        });
        
        if (unallocated > 0.5) {
          html += `
            <div style="margin-top:6px; font-size:11.5px; color:var(--gold); background:rgba(192,138,45,0.06); border:1px solid rgba(192,138,45,0.2); border-radius:8px; padding:6px 8px; line-height:1.35;">
              ⚠️ Todas las metas están llenas y no hay fondo de emergencia. Sobrarán <b>${fmt(unallocated)}</b> sin asignar.
            </div>
          `;
        } else if (totalOverfill > 0.5) {
          html += `
            <div style="margin-top:6px; font-size:11.5px; color:var(--green); background:rgba(60,140,100,0.06); border:1px solid rgba(60,140,100,0.2); border-radius:8px; padding:6px 8px; line-height:1.35;">
              💡 El plan de metas comunes está completo. El excedente de <b>${fmt(totalOverfill)}</b> se destinará al Fondo de Emergencia.
            </div>
          `;
        }
      } else if (metaDestino === 'distribuir-individual') {
        const { dist, rem } = distribuirAhorroIndividual(c.perfil, toSave, true);
        
        const indivs = metasIndividuales(c.perfil).filter(m => !m.colocado);
        const recibiendo = indivs.map(m => ({ m, v: dist[m.id] || 0 })).filter(x => x.v > 0.5);
        
        html += `
          <div style="font-weight:700; color:var(--green); margin-bottom:6px;">Distribución estimada: <span style="color:var(--gold);">${fmt(toSave)}</span></div>
          <div style="display:flex; flex-direction:column; gap:8px; max-height:180px; overflow-y:auto; padding-right:4px; margin-bottom:4px;">
        `;
        
        if (recibiendo.length === 0) {
          html += `<div style="color:var(--gs); font-size:11.5px; font-style:italic;">No hay metas individuales que reciban dinero con esta distribución.</div>`;
        } else {
          recibiendo.forEach(x => {
            const m = x.m;
            const newSaldo = m.saldo + x.v;
            const isFilled = m.objetivo > 0 && newSaldo >= m.objetivo;
            const badge = isFilled ? ` <span class="tag ok" style="padding:1px 5px; font-size:9px; vertical-align:middle; margin-left:4px; border-color:var(--gb); color:var(--gb);">¡Se llena! 🎉</span>` : '';
            const pct = (x.v / toSave) * 100;
            
            html += `
              <div style="margin-bottom: 2px;">
                <div style="display:flex; justify-content:space-between; align-items:baseline; font-size:12px; margin-bottom: 3px;">
                  <span style="color:var(--ink); font-weight:600;">${m.nombre}${badge}</span>
                  <span class="num" style="font-weight:700; color:var(--gs);">${fmt(x.v)} <span style="font-size:10px; color:rgba(28,58,44,0.7); font-weight:normal; margin-left:2px;">(→ ${fmtK(newSaldo)})</span></span>
                </div>
                <div class="lvl-bar" style="height:7px; background:rgba(28, 58, 44, 0.08); border-radius:4px; overflow:hidden;">
                  <i style="display:block; height:100%; border-radius:4px; background:${m.color || 'var(--gb)'}; width:${pct.toFixed(1)}%;"></i>
                </div>
              </div>
            `;
          });
        }
        html += `</div>`;
        
        if (rem > 0.5) {
          html += `
            <div style="margin-top:6px; font-size:11.5px; color:var(--green); background:rgba(60,140,100,0.06); border:1px solid rgba(60,140,100,0.2); border-radius:8px; padding:6px 8px; line-height:1.35;">
              💡 Tus metas individuales están llenas. El excedente de <b>${fmt(rem)}</b> se guardará en tu bolsillo.
            </div>
          `;
        }
      } else {
        const m = metaById(metaDestino);
        if (m) {
          const isDeuda = m.tipo === 'deuda';
          const currentSaldo = m.saldo;
          
          let sobra = 0;
          let aplicado = toSave;
          if (m.objetivo > 0) {
            const falta = Math.max(0, m.objetivo - currentSaldo);
            if (toSave > falta) {
              sobra = toSave - falta;
              aplicado = falta;
            }
          } else if (isDeuda) {
            const falta = Math.max(0, currentSaldo);
            if (toSave > falta) {
              sobra = toSave - falta;
              aplicado = falta;
            }
          }
          
          const newSaldo = isDeuda ? Math.max(0, currentSaldo - aplicado) : (currentSaldo + aplicado);
          const isFilled = (isDeuda && newSaldo <= 0.5) || (!isDeuda && m.objetivo > 0 && newSaldo >= m.objetivo);
          const badge = isFilled ? ` <span class="tag ok" style="padding:1px 5px; font-size:9px; vertical-align:middle; margin-left:4px; border-color:var(--gb); color:var(--gb);">${isDeuda ? '¡Saldada! 🎉' : '¡Llenada! 🎉'}</span>` : '';
          
          html += `
            <div style="font-weight:700; color:var(--green); margin-bottom:6px;">Aporte directo a la meta:</div>
            <div style="margin-bottom: 4px;">
              <div style="display:flex; justify-content:space-between; align-items:baseline; font-size:12px; margin-bottom: 3px;">
                <span style="color:var(--ink); font-weight:600;">${m.nombre}${badge}</span>
                <span class="num" style="font-weight:700; color:var(--gs);">${fmt(aplicado)} <span style="font-size:10px; color:rgba(28,58,44,0.7); font-weight:normal; margin-left:2px;">(→ ${fmtK(newSaldo)})</span></span>
              </div>
          `;
          
          if (m.objetivo > 0) {
            const pct = Math.min(100, (newSaldo / m.objetivo) * 100);
            html += `
              <div class="lvl-bar" style="height:7px; background:rgba(28, 58, 44, 0.08); border-radius:4px; overflow:hidden;">
                <i style="display:block; height:100%; border-radius:4px; background:${m.color || 'var(--gb)'}; width:${pct.toFixed(1)}%;"></i>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--gs); margin-top:3px;">
                <span>Progreso: ${pct.toFixed(1)}%</span>
                <span>Objetivo: ${fmtK(m.objetivo)}</span>
              </div>
            `;
          } else if (isDeuda && currentSaldo > 0) {
            const pct = Math.min(100, (aplicado / currentSaldo) * 100);
            html += `
              <div class="lvl-bar" style="height:7px; background:rgba(28, 58, 44, 0.08); border-radius:4px; overflow:hidden;">
                <i style="display:block; height:100%; border-radius:4px; background:${m.color || '#e06c75'}; width:${pct.toFixed(1)}%;"></i>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--gs); margin-top:3px;">
                <span>Saldando: ${pct.toFixed(1)}%</span>
                <span>Restante: ${fmtK(newSaldo)}</span>
              </div>
            `;
          } else {
            // Sin objetivo ni saldo de deuda (p.ej. inversión abierta)
            html += `
              <div class="lvl-bar" style="height:7px; background:rgba(28, 58, 44, 0.08); border-radius:4px; overflow:hidden;">
                <i style="display:block; height:100%; border-radius:4px; background:${m.color || 'var(--gb)'}; width:100%;"></i>
              </div>
            `;
          }
          
          html += `</div>`;
          
          if (sobra > 0.5) {
            html += `
              <div style="margin-top:6px; font-size:11.5px; color:var(--gold); background:rgba(192,138,45,0.06); border:1px solid rgba(192,138,45,0.2); border-radius:8px; padding:6px 8px; line-height:1.35;">
                ⚠️ La meta se completará y quedará un excedente de <b>${fmt(sobra)}</b>. Al aplicar, podrás decidir su destino.
              </div>
            `;
          }
        }
      }
    } else {
      html += `<div style="color:var(--gs); font-size:12px; font-style:italic; text-align:center;">El 100% del dinero se retiene en el bolsillo.</div>`;
    }
    
    previewDiv.innerHTML = html;
    previewDiv.style.display = 'flex';
  };

  aeMontoInput.addEventListener('input', updateModalPreview);
  aePctRange.addEventListener('input', updateModalPreview);
  aeMetaDestino.addEventListener('change', updateModalPreview);
  aePersona.addEventListener('change', updateModalPreview);

  if (preFill) {
    updateModalPreview();
  }

  overlay.querySelector('#btnApplyAE').onclick = () => {
    const concepto = overlay.querySelector('#aeConcepto').value.trim() || 'Ingreso adicional';
    const monto = parse(overlay.querySelector('#aeMonto').value);
    const pctRetener = parseInt(range.value);
    const persona = overlay.querySelector('#aePersona').value;
    const meta = overlay.querySelector('#aeMetaDestino').value;

    if (monto <= 0) {
      flash('Por favor ingresa un monto válido');
      return;
    }

    const esPriv = esDestinoPersonal(meta) || meta === 'distribuir-individual';
    const ep = {
      id: uid(),
      mes: selectedMonth || curMonth(),
      nombre: concepto,
      monto: monto,
      meta: meta,
      persona: esPriv ? c.perfil : persona,
      pctRetener: esPriv ? 0 : pctRetener,
      privado: esPriv || undefined,
      duenoPriv: esPriv ? c.perfil : undefined,
      fecha: today(),
      creadoPor: c.perfil,
      esAporteBase: preFill ? preFill.esAporteBase : undefined
    };

    aplicarIngresoInmediatoActivo(ep);
    overlay.remove();
  };
}

function aplicarIngresoInmediatoActivo(ep) {
  const c = state.config;
  const mes = ep.mes;
  
  const pctR = ep.pctRetener || 0;
  const toSave = ep.monto * (1 - pctR / 100);
  
  let distInmediato = null;
  if (toSave > 0.5) {
    if (ep.meta === 'distribuir') {
      const dist = distribuirAhorro(toSave, true);
      distInmediato = Object.assign({}, dist);
      state.metas.forEach(m => {
        if (m.tipo !== 'personal' && !m.dueno && (dist[m.id] || 0) > 0.5) {
          if (m.tipo === 'deuda') {
            m.saldo = Math.max(0, m.saldo - dist[m.id]);
          } else {
            m.saldo += dist[m.id];
          }
        }
      });
    } else if (ep.meta === 'distribuir-individual') {
      const profile = ep.duenoPriv || c.perfil;
      const { dist, rem } = distribuirAhorroIndividual(profile, toSave, true);
      distInmediato = Object.assign({}, dist);
      state.metas.forEach(m => {
        if (m.dueno === profile && (dist[m.id] || 0) > 0.5) {
          if (m.tipo === 'deuda') {
            m.saldo = Math.max(0, m.saldo - dist[m.id]);
          } else {
            m.saldo += dist[m.id];
          }
        }
      });
      if (rem > 0.5) {
        const pocket = metaPersonal(profile);
        if (pocket) pocket.saldo += rem;
      }
    } else {
      const m = metaById(ep.meta);
      if (m) {
        const sobra = aplicarAporteDirecto(m, toSave);
        if (sobra > 0.5) {
          ep._sobra = sobra; ep._metaLlena = m;
        }
        ep.aplicadoDirecto = toSave - (ep._sobra || 0);
      }
    }
  }

  const pocketP1 = metaPersonal('p1');
  const pocketP2 = metaPersonal('p2');
  const toPocket = ep.monto - toSave;
  if (toPocket > 0.5) {
    if (ep.persona === 'p1' && pocketP1) pocketP1.saldo += toPocket;
    else if (ep.persona === 'p2' && pocketP2) pocketP2.saldo += toPocket;
    else if (ep.persona === 'ambos') {
      if (pocketP1) pocketP1.saldo += toPocket * 0.5;
      if (pocketP2) pocketP2.saldo += toPocket * 0.5;
    }
  }

  const newIngreso = {
    id: ep.id,
    mes: mes,
    nombre: ep.nombre,
    monto: ep.monto,
    meta: ep.meta,
    persona: ep.persona || 'ambos',
    pctRetener: pctR,
    dist: distInmediato,
    fecha: ep.fecha || today(),
    creadoPor: ep.creadoPor || c.perfil,
    privado: ep.privado,
    duenoPriv: ep.duenoPriv,
    aplicadoDirecto: ep.aplicadoDirecto,
    esAporteBase: ep.esAporteBase
  };
  
  state.ingresos.unshift(newIngreso);

  const entry = state.log.find(e => e.mes === mes);
  if (entry) {
    if (!entry.especiales) entry.especiales = [];
    entry.especiales.push({
      id: ep.id,
      nombre: ep.nombre,
      monto: ep.monto,
      meta: ep.meta,
      persona: ep.persona || 'ambos',
      pctRetener: pctR,
      dist: distInmediato,
      metaNombre: ep.meta === 'distribuir' ? 'Reparto' : (ep.meta === 'distribuir-individual' ? 'Reparto indiv.' : (metaById(ep.meta) ? metaById(ep.meta).nombre : 'Eliminada')),
      aplicadoInmediato: true,
      fecha: newIngreso.fecha,
      privado: ep.privado,
      duenoPriv: ep.duenoPriv,
      aplicadoDirecto: ep.aplicadoDirecto
    });
  }

  const perBug03 = metaPersonal(c.perfil);
  if (perBug03) {
    if (!Array.isArray(perBug03.inmediatosAplicados)) perBug03.inmediatosAplicados = [];
    if (!perBug03.inmediatosAplicados.includes(ep.id)) perBug03.inmediatosAplicados.push(ep.id);
  }

  save();
  rerender();
  flash('Aporte aplicado con éxito ✓');

  if (ep._sobra) {
    openModalSobrante(ep._sobra, ep._metaLlena).then(dec => {
      if (dec.accion === 'pendiente') {
        registrarSobrantePendiente(ep._sobra, ep._metaLlena.nombre);
      } else {
        const res = aplicarDecisionSobrante(dec, ep._sobra);
        if (res.tipo === 'pendiente') {
          registrarSobrantePendiente(ep._sobra, ep._metaLlena.nombre);
        } else {
          const reg = state.ingresos.find(x => x.id === ep.id);
          if (reg && res.tipo !== 'pendiente') {
            reg.sobranteRes = Object.assign({ monto: ep._sobra }, res);
          }
          if (entry) {
            const regE = entry.especiales.find(x => x.id === ep.id);
            if (regE && res.tipo !== 'pendiente') {
              regE.sobranteRes = Object.assign({ monto: ep._sobra }, res);
            }
          }
        }
      }
      save();
      rerender();
    });
  }
}

function revertirAporte(id) {
  const ep = state.ingresos.find(x => x.id === id);
  if (!ep) return;
  
  const pctR = ep.pctRetener || 0;
  const toSave = ep.monto * (1 - pctR / 100);
  
  if (toSave > 0.5) {
    if (ep.meta === 'distribuir') {
      const dist = ep.dist || distribuirAhorro(toSave, true);
      state.metas.forEach(m => {
        if (m.tipo !== 'personal' && !m.dueno && (dist[m.id] || 0) > 0.5) {
          if (m.tipo === 'deuda') {
            m.saldo += dist[m.id];
          } else {
            m.saldo = Math.max(0, m.saldo - dist[m.id]);
          }
        }
      });
    } else if (ep.meta === 'distribuir-individual') {
      const profile = ep.duenoPriv || state.config.perfil;
      const dist = ep.dist || distribuirAhorroIndividual(profile, toSave, true).dist;
      state.metas.forEach(m => {
        if (m.dueno === profile && (dist[m.id] || 0) > 0.5) {
          if (m.tipo === 'deuda') {
            m.saldo += dist[m.id];
          } else {
            m.saldo = Math.max(0, m.saldo - dist[m.id]);
          }
        }
      });
      const allocatedSum = Object.values(dist).reduce((a, b) => a + b, 0);
      const rem = Math.max(0, toSave - allocatedSum);
      if (rem > 0.5) {
        const pocket = metaPersonal(profile);
        if (pocket) pocket.saldo = Math.max(0, pocket.saldo - rem);
      }
    } else {
      const m = metaById(ep.meta);
      if (m) revertirAporteDirecto(m, ep.aplicadoDirecto != null ? ep.aplicadoDirecto : toSave);
    }
  }

  // Deshacer también el sobrante que se aplicó al llenar la meta (si lo hubo)
  if (ep.sobranteRes && (ep.sobranteRes.monto || 0) > 0) {
    const sr = ep.sobranteRes;
    if (sr.tipo === 'motor' && sr.dist) {
      state.metas.forEach(m => {
        if (m.tipo !== 'personal' && !m.dueno && (sr.dist[m.id] || 0) > 0.5) {
          if (m.tipo === 'deuda') m.saldo += sr.dist[m.id]; else m.saldo = Math.max(0, m.saldo - sr.dist[m.id]);
        }
      });
    } else if (sr.tipo === 'meta') {
      const m2 = metaById(sr.metaId);
      if (m2) revertirAporteDirecto(m2, sr.monto);
    } else if (sr.tipo === 'bolsillo') {
      const per = metaPersonal(sr.perfil);
      if (per) per.saldo = Math.max(0, per.saldo - sr.monto);
    }
  }

  const pocketP1 = metaPersonal('p1');
  const pocketP2 = metaPersonal('p2');
  const toPocket = ep.monto - toSave;
  if (toPocket > 0.5) {
    if (ep.persona === 'p1' && pocketP1) pocketP1.saldo = Math.max(0, pocketP1.saldo - toPocket);
    else if (ep.persona === 'p2' && pocketP2) pocketP2.saldo = Math.max(0, pocketP2.saldo - toPocket);
    else if (ep.persona === 'ambos') {
      if (pocketP1) pocketP1.saldo = Math.max(0, pocketP1.saldo - toPocket * 0.5);
      if (pocketP2) pocketP2.saldo = Math.max(0, pocketP2.saldo - toPocket * 0.5);
    }
  }

  // Compatibilidad hacia atrás: eliminar de entry.especiales
  const entry = state.log.find(e => e.mes === ep.mes);
  if (entry && entry.especiales) {
    entry.especiales = entry.especiales.filter(x => x.id !== id);
  }

  state.ingresos = state.ingresos.filter(ing => ing.id !== id);

  save();
  rerender();
  flash('Ingreso eliminado y saldos revertidos ✓');
}

function revertirGasto(id) {
  const g = state.gastos.find(x => x.id === id);
  if (!g) return;

  const m = metaById(g.meta);
  const per = (g.fromPocket || g.toPocket) ? metaPersonal(m?.dueno || state.config.perfil) : null;

  if (g.transferId) {
    const tId = g.transferId;
    const related = state.gastos.filter(x => x.transferId === tId);
    related.forEach(x => {
      const mx = metaById(x.meta);
      if (mx) {
        if (x.mov === 'transfer-out') {
          mx.saldo += x.monto;
        } else if (x.mov === 'transfer-in') {
          if (mx.tipo === 'deuda') {
            mx.saldo += x.monto;
          } else {
            mx.saldo = Math.max(0, mx.saldo - x.monto);
          }
        }
      }
    });
    state.gastos = state.gastos.filter(x => x.transferId !== tId);
  } else {
    if (m) {
      if (g.entrada) {
        m.saldo = Math.max(0, m.saldo - g.monto);
        if (per) per.saldo += g.monto;
      } else if (g.mov === 'retiro') {
        m.saldo += g.monto;
        if (per) per.saldo = Math.max(0, per.saldo - g.monto);
      } else if (g.mov === 'pagoDesdeBolsillo') {
        m.saldo += g.monto;
        if (per) per.saldo += g.monto;
      } else {
        m.saldo += g.monto;
      }
    }
    state.gastos = state.gastos.filter(x => x.id !== id);
  }

  save();
  rerender();
  flash('Movimiento eliminado y saldos revertidos ✓');
}

function getCreatorName(creadoPor) {
  const c = state.config;
  if (creadoPor === 'p1') return c.nombreP1 || 'P1';
  if (creadoPor === 'p2') return c.nombreP2 || 'P2';
  return 'Usuario';
}

function getMonthlyDistributionData(mes) {
  const c = state.config;
  const distMap = {}; // key: metaId or pocketId, value: { name, amount, color, isPocket }
  
  const monthlyIngresos = state.ingresos.filter(ing => ing.mes === mes);
  
  monthlyIngresos.forEach(ing => {
    const pctR = ing.pctRetener || 0;
    const toPocket = ing.monto * (pctR / 100);
    const toSave = ing.monto - toPocket;
    
    if (toPocket > 0.5) {
      if (ing.persona === 'p1' || ing.persona === 'ambos') {
        const pId = 'pocket_p1';
        if (!distMap[pId]) {
          distMap[pId] = { name: c.modo === 'pareja' ? `Individual ${c.nombreP1}` : 'Individual', amount: 0, color: '#c8a2c8', isPocket: true };
        }
        distMap[pId].amount += toPocket * (ing.persona === 'ambos' ? 0.5 : 1);
      }
      if (c.modo === 'pareja' && (ing.persona === 'p2' || ing.persona === 'ambos')) {
        const pId = 'pocket_p2';
        if (!distMap[pId]) {
          distMap[pId] = { name: `Individual ${c.nombreP2}`, amount: 0, color: '#e5a3ad', isPocket: true };
        }
        distMap[pId].amount += toPocket * (ing.persona === 'ambos' ? 0.5 : 1);
      }
    }
    
    if (toSave > 0.5) {
      if (ing.meta === 'distribuir') {
        const dist = ing.dist || distribuirAhorro(toSave, true);
        Object.keys(dist).forEach(mId => {
          const m = metaById(mId);
          if (m) {
            if (!distMap[mId]) {
              distMap[mId] = { name: m.nombre, amount: 0, color: null, isPocket: false };
            }
            distMap[mId].amount += dist[mId];
          }
        });
      } else if (ing.meta === 'distribuir-individual') {
        const dist = ing.dist || distribuirAhorroIndividual(ing.duenoPriv || c.perfil, toSave, true).dist;
        Object.keys(dist).forEach(mId => {
          const m = metaById(mId);
          if (m) {
            if (!distMap[mId]) {
              distMap[mId] = { name: m.nombre, amount: 0, color: null, isPocket: false };
            }
            distMap[mId].amount += dist[mId];
          }
        });
        const allocatedSum = Object.values(dist).reduce((a, b) => a + b, 0);
        const rem = Math.max(0, toSave - allocatedSum);
        if (rem > 0.5) {
          const pId = (ing.duenoPriv || c.perfil) === 'p2' ? 'pocket_p2' : 'pocket_p1';
          if (!distMap[pId]) {
            distMap[pId] = {
              name: c.modo === 'pareja' ? `Individual ${(ing.duenoPriv || c.perfil) === 'p2' ? c.nombreP2 : c.nombreP1}` : 'Individual',
              amount: 0,
              color: (ing.duenoPriv || c.perfil) === 'p2' ? '#e5a3ad' : '#c8a2c8',
              isPocket: true
            };
          }
          distMap[pId].amount += rem;
        }
      } else {
        const m = metaById(ing.meta);
        if (m) {
          const mId = ing.meta;
          if (!distMap[mId]) {
            distMap[mId] = { name: m.nombre, amount: 0, color: null, isPocket: false };
          }
          const amt = ing.aplicadoDirecto != null ? ing.aplicadoDirecto : toSave;
          distMap[mId].amount += amt;
        }
      }
    }
    
    if (ing.sobranteRes && (ing.sobranteRes.monto || 0) > 0) {
      const sr = ing.sobranteRes;
      if (sr.tipo === 'motor' && sr.dist) {
        Object.keys(sr.dist).forEach(mId => {
          const m = metaById(mId);
          if (m) {
            if (!distMap[mId]) {
              distMap[mId] = { name: m.nombre, amount: 0, color: null, isPocket: false };
            }
            distMap[mId].amount += sr.dist[mId];
          }
        });
      } else if (sr.tipo === 'meta') {
        const m2 = metaById(sr.metaId);
        if (m2) {
          const mId = sr.metaId;
          if (!distMap[mId]) {
            distMap[mId] = { name: m2.nombre, amount: 0, color: null, isPocket: false };
          }
          distMap[mId].amount += sr.monto;
        }
      } else if (sr.tipo === 'bolsillo') {
        const pId = sr.perfil === 'p2' ? 'pocket_p2' : 'pocket_p1';
        if (!distMap[pId]) {
          distMap[pId] = {
            name: c.modo === 'pareja' ? `Individual ${sr.perfil === 'p2' ? c.nombreP2 : c.nombreP1}` : 'Individual',
            amount: 0,
            color: sr.perfil === 'p2' ? '#e5a3ad' : '#c8a2c8',
            isPocket: true
          };
        }
        distMap[pId].amount += sr.monto;
      }
    }
  });

  const entry = state.log.find(e => e.mes === mes);
  if (entry && entry.aplicado && entry.reparto && entry.reparto.dist) {
    Object.keys(entry.reparto.dist).forEach(mId => {
      const m = metaById(mId);
      if (m) {
        if (!distMap[mId]) {
          distMap[mId] = { name: m.nombre, amount: 0, color: null, isPocket: false };
        }
        distMap[mId].amount += entry.reparto.dist[mId];
      }
    });
  }
  
  return Object.values(distMap).filter(x => x.amount > 0.5);
}

function drawMonthlyDistributionBars(mes) {
  const data = getMonthlyDistributionData(mes);
  const total = data.reduce((s, x) => s + x.amount, 0);

  if (total <= 0.5) {
    return `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:28px 16px; text-align:center; color:var(--gs);">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3; margin-bottom:10px;">
          <line x1="4" y1="20" x2="4" y2="12"></line>
          <line x1="12" y1="20" x2="12" y2="6"></line>
          <line x1="20" y1="20" x2="20" y2="14"></line>
        </svg>
        <div style="font-weight:700; font-size:13.5px; margin-bottom:4px;">Sin ahorros en este mes</div>
        <div style="font-size:12px; opacity:0.8; max-width:260px; margin:0 auto; line-height:1.4;">Agrega dinero o confirma tu aporte de siempre para ver la distribución.</div>
      </div>
    `;
  }

  // Barras horizontales: ancho proporcional al % del mes. Metas en dorado;
  // bolsillos individuales con su tinte de persona (lila/rosa) por privacidad.
  const rows = data.slice().sort((a, b) => b.amount - a.amount).map(slice => {
    const pct = slice.amount / total * 100;
    const fill = slice.isPocket
      ? slice.color
      : 'linear-gradient(90deg, var(--gb), #e6c25a)';
    return `
      <div style="margin-bottom:13px;">
        <div style="display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-bottom:5px;">
          <span style="font-size:13px; font-weight:600; color:var(--cream); min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${slice.name}</span>
          <span class="num" style="font-size:12.5px; font-weight:700; color:var(--cream); flex-shrink:0; white-space:nowrap;">${fmtK(slice.amount)} <span style="color:var(--gs); font-weight:600; font-size:11px; margin-left:2px;">${pct.toFixed(0)}%</span></span>
        </div>
        <div style="height:10px; background:rgba(246,241,230,0.08); border-radius:6px; overflow:hidden;">
          <div style="height:100%; width:${pct.toFixed(1)}%; background:${fill}; border-radius:6px; transition:width .45s ease;"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="margin-top:2px;">
      <div style="display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid rgba(246,241,230,0.08);">
        <span style="font-size:11.5px; font-weight:700; color:var(--cream); letter-spacing:0.06em; text-transform:uppercase;">Total ahorrado</span>
        <span class="num" style="font-size:22px; font-weight:800; color:var(--gb);">${fmtK(total)}</span>
      </div>
      ${rows}
    </div>
  `;
}

function processTransactionsForDisplay(rawList) {
  const processed = [];
  const seenTransfers = new Set();
  
  rawList.forEach(t => {
    if (t.type === 'gasto' && t.transferId) {
      if (seenTransfers.has(t.transferId)) return;
      seenTransfers.add(t.transferId);
      
      const gOut = state.gastos.find(x => x.transferId === t.transferId && x.mov === 'transfer-out');
      const gIn = state.gastos.find(x => x.transferId === t.transferId && x.mov === 'transfer-in');
      
      if (gOut && gIn) {
        const mOut = metaById(gOut.meta);
        const mIn = metaById(gIn.meta);
        const nameOut = mOut ? (mOut.tipo === 'personal' ? (state.config.modo === 'pareja' ? `Individual ${mOut.dueno === 'p2' ? state.config.nombreP2 : state.config.nombreP1}` : 'Individual') : mOut.nombre) : 'Origen';
        const nameIn = mIn
          ? (mIn.tipo === 'personal'
            ? (state.config.modo === 'pareja' ? `Individual ${mIn.dueno === 'p2' ? state.config.nombreP2 : state.config.nombreP1}` : 'Individual')
            : (gOut && gOut.aTerrenoPersonal && mIn.dueno && mIn.dueno !== state.config.perfil
              ? `Lo personal de ${mIn.dueno === 'p2' ? state.config.nombreP2 : state.config.nombreP1}`
              : mIn.nombre))
          : 'Destino';
        
        processed.push({
          type: 'transfer',
          id: gOut.id,
          transferId: t.transferId,
          nombre: t.nombre.startsWith('Transferencia') ? `Transferencia: ${nameOut} → ${nameIn}` : t.nombre,
          monto: gOut.monto,
          fecha: gOut.fecha,
          creadoPor: gOut.creadoPor || gIn.creadoPor,
          fromMeta: nameOut,
          toMeta: nameIn
        });
      } else {
        processed.push(t);
      }
    } else {
      processed.push(t);
    }
  });
  return processed;
}

function drawTransactionTimeline(transactions, canEdit) {
  if (transactions.length === 0) {
    return `<div style="text-align:center; padding:24px; color:var(--gs); font-size:12.5px; font-style:italic;">No hay movimientos registrados este mes.</div>`;
  }
  
  const c = state.config;
  const itemsHtml = transactions.map(t => {
    let sign = '';
    let color = '';
    let destLabel = '';
    
    if (t.type === 'ingreso') {
      sign = '+';
      color = 'var(--green)';
      const metaNom = t.meta === 'distribuir' ? 'Reparto' : (t.meta === 'distribuir-individual' ? 'Reparto indiv.' : (metaById(t.meta) ? metaById(t.meta).nombre : 'Meta eliminada'));
      destLabel = t.pctRetener > 0 ? `${t.pctRetener}% al bolsillo · ${metaNom}` : metaNom;
      if (t.esAporteBase) destLabel += ' (Aporte base)';
    } else if (t.type === 'gasto') {
      sign = '-';
      color = '#e06c75';
      const m = metaById(t.meta);
      destLabel = `Retiro de ${m ? m.nombre : 'Meta'}`;
    } else if (t.type === 'transfer') {
      sign = '';
      color = 'var(--gold)';
      destLabel = `Transferencia: ${t.fromMeta} → ${t.toMeta}`;
    }
    
    let dateFormatted = '';
    if (t.fecha) {
      const parts = t.fecha.split('-');
      if (parts.length === 3) {
        dateFormatted = `${parts[2]}/${parts[1]}`;
      } else if (parts.length === 2) {
        dateFormatted = `${parts[1]}`;
      } else {
        dateFormatted = t.fecha;
      }
    }
    
    const creatorBadge = (c.modo === 'pareja' && t.creadoPor) ? `<span style="display:inline-block; background:rgba(246,241,230,0.06); color:var(--gs); font-size:9.5px; padding:1px 5px; border-radius:4px; margin-left:6px; vertical-align:middle;">${getCreatorName(t.creadoPor)}</span>` : '';
    
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--line); gap:10px;">
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
            <span style="font-weight:700; color:var(--ink); font-size:13.5px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:180px;">${t.nombre}</span>
            ${creatorBadge}
          </div>
          <div style="font-size:11px; color:var(--gs); margin-top:2px;">${dateFormatted} · ${destLabel}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          <span class="num" style="font-size:14px; color:${color}; font-weight:700;">${sign}${fmt(t.monto)}</span>
          ${canEdit ? `<button class="ldel delete-tx-btn" data-type="${t.type}" data-id="${t.id}" style="font-size:18px; padding:4px; opacity:0.6; cursor:pointer;">×</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <div style="background:var(--paper); border:1px solid var(--line); border-radius:12px; padding:12px 14px;">
      <div style="font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:700; color:var(--gs); margin-bottom:8px; border-bottom:1px solid rgba(246,241,230,0.05); padding-bottom:6px;">Movimientos del mes</div>
      <div style="display:flex; flex-direction:column; max-height:300px; overflow-y:auto; padding-right:4px;">
        ${itemsHtml}
      </div>
    </div>
  `;
}

function renderMiMes(){
  const c=state.config;
  const mes=selectedMonth || curMonth();
  const canEdit=canEditShared();
  
  const entry = state.log.find(e => e.mes === mes);
  const baseApplied = (entry && entry.aplicado && entry.reparto) ? (entry.reparto.entra || 0) : 0;
  
  const totalIn = state.ingresos.filter(ing => ing.mes === mes).reduce((sum, ing) => sum + ing.monto, 0) + baseApplied;
  const totalOut = state.gastos.filter(g => g.fecha.substring(0, 7) === mes && g.mov === 'salida').reduce((sum, g) => sum + g.monto, 0);
  const netSaved = totalIn - totalOut;
  
  const hasAporteBase = state.ingresos.some(ing => ing.mes === mes && ing.esAporteBase);
  let baseCardHtml = '';
  if (!hasAporteBase && computeBase() > 0.5) {
    baseCardHtml = `
      <div class="card" style="border:1px solid var(--gold); background:rgba(192,138,45,0.03); padding:14px; border-radius:12px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="display:inline-flex;">${getSVG('calendar', '', 'color:var(--gold);')}</span>
          <div style="font-weight:700; color:var(--gold); font-size:14px;">Tu aporte de siempre: ${fmt(computeBase())}</div>
        </div>
        <div style="font-size:12.5px; color:rgba(246,241,230,.8); line-height:1.4;">
          Aún no has registrado tu aporte mensual programado de este mes. Confírmalo ahora para repartirlo entre tus metas.
        </div>
        <button class="btn sm gold" id="btnConfirmBaseAporte" style="margin:0; width:100%; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
          ${getSVG('check')} Confirmar aporte de siempre
        </button>
      </div>
    `;
  }
  
  // Privacidad: la pareja solo ve movimientos de metas conjuntas. Se ocultan los
  // ingresos privados del otro perfil y los gastos que tocan una meta individual ajena.
  const perfilActivo = state.config.perfil;
  const listIngresos = especialesVisibles(state.ingresos.filter(ing => ing.mes === mes)).map(ing => ({
    type: 'ingreso',
    id: ing.id,
    nombre: ing.nombre,
    monto: ing.monto,
    fecha: ing.fecha || `${mes}-01`,
    creadoPor: ing.creadoPor,
    meta: ing.meta,
    pctRetener: ing.pctRetener,
    esAporteBase: ing.esAporteBase
  }));

  const listGastos = state.gastos.filter(g => {
    if (g.fecha.substring(0, 7) !== mes) return false;
    const m = metaById(g.meta);
    if (m && m.dueno && m.dueno !== perfilActivo) return false; // toca meta individual ajena
    return true;
  }).map(g => ({
    type: 'gasto',
    id: g.id,
    nombre: g.nota || (g.mov === 'salida' ? 'Retiro' : 'Transferencia'),
    monto: g.monto,
    fecha: g.fecha,
    creadoPor: g.creadoPor,
    mov: g.mov,
    meta: g.meta,
    transferId: g.transferId
  }));
  
  const rawAll = [...listIngresos, ...listGastos].sort((a, b) => {
    const cmp = b.fecha.localeCompare(a.fecha);
    if (cmp !== 0) return cmp;
    return b.id.localeCompare(a.id);
  });
  
  const transactions = processTransactionsForDisplay(rawAll);
  
  const metricsHtml = `
    <div class="card" style="padding:16px; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; text-align:center;">
      <div>
        <div style="font-size:11px; font-weight:700; color:var(--gs); text-transform:uppercase; letter-spacing:0.05em;">Ingresos</div>
        <div style="font-size:15px; font-weight:700; color:var(--green); margin-top:4px;" class="num">+${fmtK(totalIn)}</div>
      </div>
      <div style="border-left:1px solid var(--line); border-right:1px solid var(--line);">
        <div style="font-size:11px; font-weight:700; color:var(--gs); text-transform:uppercase; letter-spacing:0.05em;">Retiros</div>
        <div style="font-size:15px; font-weight:700; color:#e06c75; margin-top:4px;" class="num">-${fmtK(totalOut)}</div>
      </div>
      <div>
        <div style="font-size:11px; font-weight:700; color:var(--gs); text-transform:uppercase; letter-spacing:0.05em;">Neto</div>
        <div style="font-size:15px; font-weight:700; color:${netSaved >= 0 ? 'var(--gold)' : '#e06c75'}; margin-top:4px;" class="num">${netSaved >= 0 ? '+' : ''}${fmtK(netSaved)}</div>
      </div>
    </div>
  `;
  
  const donutHtml = `
    <div class="card dark" style="padding:16px;">
      <div class="k" style="margin-bottom:12px;">Distribución del Ahorro Realizado</div>
      ${drawMonthlyDistributionBars(mes)}
    </div>
  `;
  
  const timelineHtml = drawTransactionTimeline(transactions, canEdit);

  $('r2').innerHTML=`
    <header>
      <div class="ey">Movimientos del mes</div>
      <div style="display:flex; align-items:center; gap:12px; margin-top:2px;">
        <button id="btnPrevMonth" style="background:none; border:none; color:rgba(246,241,230, 0.65); font-size:32px; font-weight:300; cursor:pointer; padding:0 4px; line-height:1; display:flex; align-items:center; justify-content:center;">‹</button>
        <h1 id="mMesDisplay" style="font-size:26px; margin:0; cursor:pointer; display:flex; align-items:center; gap:6px; color:var(--cream);"></h1>
        <button id="btnNextMonth" style="background:none; border:none; color:rgba(246,241,230, 0.65); font-size:32px; font-weight:300; cursor:pointer; padding:0 4px; line-height:1; display:flex; align-items:center; justify-content:center;">›</button>
      </div>
    </header>
    ${sobrantesPendientes().length?`<div class="card" style="border:1px solid var(--gold);padding:12px 14px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="font-size:13px;"><b style="color:var(--gold)">${fmt(sobrantesPendientes().reduce((s,i)=>s+i.monto,0))}</b> sin asignar</div>
      <button class="btn sm gold" id="btnAsignarPendiente" style="margin:0;">Asignar</button>
    </div>`:''}
    <div style="display:flex; flex-direction:column; gap:12px;">
      ${metricsHtml}
      ${baseCardHtml}
      ${donutHtml}
      ${timelineHtml}
    </div>
    <div style="margin-bottom:30px"></div>
  `;
  
  function updateMesDisplay(){
    const textVal = fmtMes(selectedMonth)||selectedMonth;
    const capitalized = textVal.charAt(0).toUpperCase() + textVal.slice(1);
    const d=$('mMesDisplay');
    if(d) {
      d.innerHTML = `<span>${capitalized}</span><span style="color:rgba(246,241,230,0.5); display:inline-flex; align-items:center; margin-top:4px; font-weight:normal;">${getSVG('chevronDown', '', 'width:12px; height:12px;')}</span>`;
    }
  }
  
  const mTrigger = $('mMesDisplay');
  if (mTrigger) {
    mTrigger.onclick = async () => {
      const newVal = await showCustomMonthPicker(selectedMonth);
      if (newVal) {
        selectedMonth = newVal;
        updateMesDisplay();
        renderMiMes();
      }
    };
  }
  
  const btnPrev = $('btnPrevMonth');
  if (btnPrev) {
    btnPrev.onclick = () => {
      selectedMonth = shiftMonth(selectedMonth, -1);
      updateMesDisplay();
      renderMiMes();
    };
  }
  
  const btnNext = $('btnNextMonth');
  if (btnNext) {
    if (selectedMonth === curMonth()) {
      btnNext.disabled = true;
      btnNext.style.opacity = 0.3;
      btnNext.style.pointerEvents = 'none';
    } else {
      btnNext.disabled = false;
      btnNext.style.opacity = 1;
      btnNext.style.pointerEvents = 'auto';
    }
    btnNext.onclick = () => {
      if (selectedMonth !== curMonth()) {
        selectedMonth = shiftMonth(selectedMonth, 1);
        updateMesDisplay();
        renderMiMes();
      }
    };
  }
  
  updateMesDisplay();

  const btnConfirmBase = $('btnConfirmBaseAporte');
  if (btnConfirmBase) {
    btnConfirmBase.onclick = () => {
      openAsistenteIngresoExtra({
        concepto: 'Aporte mensual programado',
        monto: computeBase(),
        esAporteBase: true
      });
    };
  }

  $('r2').querySelectorAll('.delete-tx-btn').forEach(btn => {
    btn.onclick = async () => {
      const type = btn.dataset.type;
      const id = btn.dataset.id;
      if (!await customConfirm('¿Eliminar este movimiento y revertir los saldos?', true)) return;
      
      if (type === 'ingreso') {
        revertirAporte(id);
      } else {
        revertirGasto(id);
      }
    };
  });

  const btnPend=$('btnAsignarPendiente');
  if(btnPend) btnPend.onclick=async()=>{
    const p=sobrantesPendientes()[0];
    if(!p)return;
    const dec=await openModalSobrante(p.monto,{id:'_pend',nombre:p.nombre});
    if(dec.accion==='pendiente')return;
    const res=aplicarDecisionSobrante(dec,p.monto);
    if(res.tipo==='pendiente')return;
    state.ingresos=state.ingresos.filter(i=>i.id!==p.id);
    save();renderMiMes();flash('Sobrante asignado ✓');
  };

  if (openExtraFormOnLoad) {
    openExtraFormOnLoad = false;
    setTimeout(openAsistenteIngresoExtra, 100);
  }
}

function positionMimesCta() {
  const cta = $('mimesCta');
  const nav = $('mainnav');
  if (!cta || !nav) return;
  cta.style.bottom = nav.offsetHeight + 'px';
}

async function aplicar(){
  if (!canEditShared()) { flash('No tienes permisos para aportar'); return; }
  const mes=selectedMonth;if(!mes){flash('Elige el mes');return;}
  const ex=state.log.find(e=>e.mes===mes);
  if(ex&&ex.aplicado){if(!await customConfirm('Ese mes ya se aplicó. ¿Recalcular y aplicar de nuevo? No se duplica: primero se deshace lo anterior.', false))return;}
  const r=computeReparto(0,0),c=state.config;
  let cobertura=null;
  if(r.ahorro < 0){
    cobertura = await openAsistenteDeficit(-r.ahorro);
    if(!cobertura){flash('Mes sin aplicar: el déficit quedó sin cubrir');return;}
  }
  // Revertir distribución previa antes de re-aplicar para evitar doble conteo
  if(ex && ex.aplicado && ex.reparto && ex.reparto.dist){
    state.metas.forEach(m=>{
      if(m.tipo!=='personal'){
        const prev=ex.reparto.dist[m.id]||0;
        if(prev!==0){
          if(m.tipo==='deuda') m.saldo+=prev; else m.saldo=Math.max(0,m.saldo-prev);
        }
      }
    });
  }
  if(ex && ex.aplicado && ex.cobertura) revertirCobertura(ex.cobertura);
  state.metas.forEach(m=>{
    if(m.tipo!=='personal'){
      if(m.tipo==='deuda'){
        m.saldo=Math.max(0,m.saldo-(r.dist[m.id]||0));
      } else {
        m.saldo=Math.max(0,m.saldo+(r.dist[m.id]||0));
      }
    }
  });
  if(cobertura) aplicarCobertura(cobertura, mes);
  const p1Extra = especialesPendientes.filter(ep => ep.persona === 'p1').reduce((s, ep) => s + ep.monto, 0) + especialesPendientes.filter(ep => ep.persona === 'ambos').reduce((s, ep) => s + ep.monto * 0.5, 0);
  const p2Extra = especialesPendientes.filter(ep => ep.persona === 'p2').reduce((s, ep) => s + ep.monto, 0) + especialesPendientes.filter(ep => ep.persona === 'ambos').reduce((s, ep) => s + ep.monto * 0.5, 0);
  
  const prev = state.log.find(e => e.mes === mes);
  const yaInmediatos = prev ? (prev.especiales || []).filter(e => e.aplicadoInmediato) : [];
  
  const p1Inmediato = yaInmediatos.filter(e => e.persona === 'p1').reduce((s, e) => s + e.monto, 0) + yaInmediatos.filter(e => e.persona === 'ambos').reduce((s, e) => s + e.monto * 0.5, 0);
  const p2Inmediato = yaInmediatos.filter(e => e.persona === 'p2').reduce((s, e) => s + e.monto, 0) + yaInmediatos.filter(e => e.persona === 'ambos').reduce((s, e) => s + e.monto * 0.5, 0);

  // Aplica cada especial y captura el id del ingreso y el snapshot de la distribución,
  // para poder revertir EXACTAMENTE lo aplicado (sin re-ejecutar distribuirAhorro al deshacer).
  const espApplyMeta = especialesPendientes.map(ep=>{
    const pctR=ep.pctRetener||0;
    const toSave=ep.monto*(1-pctR/100);
    const ingId=uid();
    state.ingresos.unshift({id:ingId,mes:ep.mes,nombre:ep.nombre,monto:ep.monto,meta:ep.meta,persona:ep.persona||'ambos',pctRetener:pctR});
    let distSnap=null;
    if(toSave>0.5){
      if(ep.meta==='distribuir'){
        const dist=distribuirAhorro(toSave, true);
        distSnap=Object.assign({},dist);
        state.metas.forEach(m=>{
          if(m.tipo!=='personal'&&!m.dueno&&(dist[m.id]||0)>0.5) {
            if(m.tipo==='deuda'){
              m.saldo=Math.max(0,m.saldo-dist[m.id]);
            } else {
              m.saldo+=dist[m.id];
            }
          }
        });
      }else{
        const m=metaById(ep.meta);
        if(m) {
          if(m.tipo==='deuda'){
            m.saldo=Math.max(0,m.saldo-toSave);
          } else {
            m.saldo+=toSave;
          }
        }
      }
    }
    return {ingId, distSnap};
  });
  const espSnapshot = especialesPendientes.map((ep, i) => ({
    nombre: ep.nombre,
    monto: ep.monto,
    meta: ep.meta,
    persona: ep.persona||'ambos',
    pctRetener: ep.pctRetener||0,
    ingresoId: espApplyMeta[i].ingId,
    dist: espApplyMeta[i].distSnap,
    metaNombre: ep.meta === 'distribuir' ? 'Reparto' : (ep.meta === 'distribuir-individual' ? 'Reparto indiv.' : (metaById(ep.meta) ? metaById(ep.meta).nombre : 'Eliminada'))
  }));
  
  const perfil=c.perfil,per=metaPersonal(perfil);
  const retenPersonal=especialesPendientes.reduce((s,ep)=>{
    const ret=ep.monto*(ep.pctRetener||0)/100;
    if(ep.persona===perfil)return s+ret;
    if(ep.persona==='ambos')return s+ret*0.5;
    return s;
  },0);
  
  especialesPendientes=[];
  
  // En mes con déficit el "dinero libre" no existió; solo aplica la retención de extras.
  // Trade-off contable: En un ingreso "ambos" con retención, cada dispositivo solo aplica su 50%
  // localmente en su propio bolsillo (Option 2).
  const aporte=(r.ahorro>=0?libreOf(perfil):0)+retenPersonal;
  const ya=per.aportes.find(x=>x.mes===mes);
  let delta = aporte;
  if(ya){
    delta = aporte - ya.monto;
    ya.monto = aporte;
  }else{
    per.aportes.push({mes,monto:aporte});
  }
  
  if (delta !== 0 && per) {
    const { dist, rem } = distribuirAhorroIndividual(perfil, delta);
    Object.keys(dist).forEach(id => {
      const m = metaById(id);
      if (m) {
        if(m.tipo==='deuda'){
          m.saldo=Math.max(0,m.saldo-dist[id]);
        } else {
          m.saldo+=dist[id];
        }
      }
    });
    per.saldo = Math.max(0, per.saldo + rem);
  }

  const snapshot = {
    mes,
    p1: p1Extra + p1Inmediato,
    p2: p2Extra + p2Inmediato,
    aplicado: true,
    config: {
      modo: c.modo,
      soloAhorroDirecto: c.soloAhorroDirecto,
      nombreP1: c.nombreP1,
      nombreP2: c.nombreP2,
      nominaP1: c.nominaP1,
      nominaP2: c.nominaP2,
      gastos: c.gastos,
      planPareja: c.planPareja,
      libreP1: c.libreP1,
      libreP2: c.libreP2,
      pctPremio: c.pctPremio,
      modoPremio: c.modoPremio,
      pctPremioP1: c.pctPremioP1,
      estrategia: c.estrategia
    },
    reparto: {
      base: r.base,
      comb: r.comb,
      prem: r.prem,
      ahorro: r.ahorro,
      gastosDia: r.gastosDia,
      gustos: r.gustos,
      gustosPareja: r.gustosPareja,
      gustosP1: r.gustosP1,
      gustosP2: r.gustosP2,
      nom: r.nom,
      entra: r.entra,
      dist: Object.assign({}, r.dist)
    },
    especiales: yaInmediatos.concat(espSnapshot),
    cobertura: cobertura || null
  };
  state.log=state.log.filter(e=>e.mes!==mes);state.log.push(snapshot);
  state.log.sort((x,y)=>y.mes.localeCompare(x.mes));
  save();
  renderMiMes();
  let sobranteTxt='';
  if(r.sobrante && r.sobrante.length){
    const total=r.sobrante.reduce((s,p)=>s+p.monto,0);
    if(total>0.5){
      const dest=r.sobrante.map(p=>p.nombre).join(' y ');
      sobranteTxt=` · remanente ${fmt(total)} → ${dest}`;
    }
  }
  if(cobertura){flash('Mes en rojo cubierto ✓ · déficit de '+fmt(-r.ahorro)+' registrado');}
  else{flash('Aplicado · tu bolsillo +'+fmt(aporte)+' ✓'+sobranteTxt);}
}

/* =========================================================
   FLUJO (presupuesto editable)
   ========================================================= */
function renderAprender(){
  const c = state.config;

  // --- Capa 1: El principio (escalera plazo -> instrumento) ---
  const ladderHtml = `
    <div class="stitle" style="margin-top:4px;">El principio</div>
    <div class="hint" style="color:rgba(246,241,230,.7); margin-bottom:10px;">No es qué producto es "mejor", es cuál encaja con <strong style="color:var(--gb)">cuándo</strong> vas a necesitar la plata. El plazo manda:</div>
    <div class="ladder">
      <div class="card" style="border-left:4px solid #14cb3c;margin-bottom:8px;padding:13px 14px">
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:3px">
          <span class="k" style="margin:0;text-transform:none;letter-spacing:.01em;font-size:14.5px;color:var(--ink)">Corto</span>
          <span class="muted" style="font-size:11.5px">menos de 6 meses</span>
        </div>
        <div style="font-size:12.5px;font-weight:700;color:#0f8f2c">Cuenta de alto rendimiento</div>
        <div class="muted" style="font-size:11.5px;margin-top:1px">~13% E.A. · riesgo bajo · liquidez 24/7</div>
      </div>
      <div class="card" style="border-left:4px solid var(--gold);margin-bottom:8px;padding:13px 14px">
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:3px">
          <span class="k" style="margin:0;text-transform:none;letter-spacing:.01em;font-size:14.5px;color:var(--ink)">Medio</span>
          <span class="muted" style="font-size:11.5px">6 a 18 meses</span>
        </div>
        <div style="font-size:12.5px;font-weight:700;color:var(--gold)">CDT (tasa fija)</div>
        <div class="muted" style="font-size:11.5px;margin-top:1px">10–12% E.A. · riesgo bajo · bloqueado al plazo</div>
      </div>
      <div class="card" style="border-left:4px solid #4a90e2;margin-bottom:0;padding:13px 14px">
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:3px">
          <span class="k" style="margin:0;text-transform:none;letter-spacing:.01em;font-size:14.5px;color:var(--ink)">Largo</span>
          <span class="muted" style="font-size:11.5px">más de 18 meses</span>
        </div>
        <div style="font-size:12.5px;font-weight:700;color:#2f6fb0">ETFs / fondos</div>
        <div class="muted" style="font-size:11.5px;margin-top:1px">8–10%+ histórico · riesgo medio-alto · le ganas a la inflación</div>
      </div>
    </div>
  `;

  // --- Capa 2: Tus metas, tu plan (personalizado) ---
  const metasCoach = state.metas.filter(m => m.tipo !== 'personal');
  let coachHtml;
  if (metasCoach.length){
    const rows = metasCoach.map(m => {
      const h = clasificarHorizonte(m);
      const obj = m.objetivo ? ` · meta ${fmt(m.objetivo)}` : '';
      return `
        <div class="card" data-meta="${esc(m.id)}" style="cursor:pointer">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="width:7px;height:7px;border-radius:50%;background:${h.color};flex-shrink:0"></span>
                <span class="k" style="margin:0;text-transform:none;letter-spacing:.01em;font-size:14.5px;color:var(--ink)">${esc(m.nombre)}</span>
                <span class="pill" style="background:transparent;border:1px solid ${h.color};color:${h.color}">${h.etiqueta}</span>
              </div>
              <div style="font-size:12.5px;font-weight:700;color:var(--gs)">${h.instrumento}</div>
              <div class="muted" style="font-size:12px;margin-top:2px">${fmt(m.saldo||0)}${obj}</div>
            </div>
            <span class="chev apr-chev" style="transition:transform .2s;color:var(--gs);opacity:.5">›</span>
          </div>
          <div class="apr-rec" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:12.5px;color:rgba(21,36,28,.82);line-height:1.5">${obtenerRecomendacionInversion(m)}</div>
        </div>`;
    }).join('');
    coachHtml = `
      <div class="stitle">Tus metas, tu plan</div>
      <div class="hint" style="color:rgba(246,241,230,.7); margin-bottom:10px;">Según el plazo de cada meta, esto es lo que te conviene. Toca una para ver la recomendación completa.</div>
      ${rows}
    `;
  } else {
    coachHtml = `
      <div class="stitle">Tus metas, tu plan</div>
      <div class="card" style="text-align:center;">
        <div style="font-size:13.5px; color:var(--gs); line-height:1.5; margin-bottom:12px;">Aún no tienes metas. Crea una y aquí te diremos exactamente dónde poner la plata según su plazo.</div>
        <button class="btn" id="aprCrearMeta" style="margin-top:0;">Crear mi primera meta</button>
      </div>
    `;
  }

  const catalogHtml = `
    <div class="learn-container" style="display:flex; flex-direction:column; gap:16px;">
      <div class="hint" style="color:rgba(246,241,230,.7); margin:0 0 4px;">Instrumentos financieros reales regulados en Colombia. Referencia para elegir según el plazo de tu meta.</div>

      <!-- Instrument 1: Nu Cajitas -->
      <div class="card" style="border-left:4px solid #8f5dbb; background:rgba(143,93,187,0.03); padding:14px; border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <b style="font-size:15px; color:#8f5dbb; font-family:var(--sans);">Nu Cajitas (Ahorro Inteligente)</b>
          <span class="tag ok" style="background:rgba(143,93,187,0.15); color:#a779d4; font-size:10px; font-weight:700;">Alta Liquidez</span>
        </div>
        <div style="font-size:12.5px; color:rgba(246,241,230,.85); line-height:1.45;">
          <strong>Rendimiento:</strong> 13% E.A. (Efectivo Anual)<br>
          <strong>Plazo recomendado:</strong> Corto plazo (Día a día, fondo de emergencias).<br>
          <strong>Disponibilidad:</strong> Inmediata (24/7). Puedes retirar tu saldo en segundos.<br>
          <strong>Seguridad:</strong> Muy alta. Cuenta con seguro de depósitos Fogafín (hasta $50 millones).
        </div>
      </div>

      <!-- Instrument 2: Lulo Bank -->
      <div class="card" style="border-left:4px solid #14cb3c; background:rgba(20,203,60,0.03); padding:14px; border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <b style="font-size:15px; color:#14cb3c; font-family:var(--sans);">Lulo Cuenta (Lulo Bank)</b>
          <span class="tag ok" style="background:rgba(20,203,60,0.15); color:#14cb3c; font-size:10px; font-weight:700;">Alta Liquidez</span>
        </div>
        <div style="font-size:12.5px; color:rgba(246,241,230,.85); line-height:1.45;">
          <strong>Rendimiento:</strong> Hasta 13% E.A. en bolsillos acumulados.<br>
          <strong>Plazo recomendado:</strong> Corto plazo (fondos líquidos).<br>
          <strong>Beneficio extra:</strong> Devuelve el 4x1000 por consumos mensuales y ofrece 0.5% de cashback con tarjeta de débito.<br>
          <strong>Seguridad:</strong> Muy alta. Regulado por la Superfinanciera y protegido por Fogafín.
        </div>
      </div>

      <!-- Instrument 3: CDTs Digitales -->
      <div class="card" style="border-left:4px solid var(--gold); background:rgba(192,138,45,0.03); padding:14px; border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <b style="font-size:15px; color:var(--gold); font-family:var(--sans);">CDTs Digitales (Tuya, Bancolombia, MejorCDT)</b>
          <span class="tag" style="background:rgba(192,138,45,0.15); color:var(--gb); font-size:10px; font-weight:700;">Plazo Fijo</span>
        </div>
        <div style="font-size:12.5px; color:rgba(246,241,230,.85); line-height:1.45;">
          <strong>Rendimiento:</strong> 10% a 12% E.A. (varía según el plazo y la entidad).<br>
          <strong>Plazo recomendado:</strong> Mediano plazo (6 a 18 meses).<br>
          <strong>Disponibilidad:</strong> Al vencimiento del plazo pactado (ej: 90, 180, 360 días). No se puede retirar antes.<br>
          <strong>Seguridad:</strong> Muy alta. Tasa garantizada desde el día uno y cobertura de Fogafín.
        </div>
      </div>

      <!-- Instrument 4: Tyba (Fondos Colectivos) -->
      <div class="card" style="border-left:4px solid #1a8cc3; background:rgba(26,140,195,0.03); padding:14px; border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <b style="font-size:15px; color:#1a8cc3; font-family:var(--sans);">Tyba (Fondos Colectivos y CDT)</b>
          <span class="tag" style="background:rgba(26,140,195,0.15); color:#1a8cc3; font-size:10px; font-weight:700;">Híbrido / Renta Variable</span>
        </div>
        <div style="font-size:12.5px; color:rgba(246,241,230,.85); line-height:1.45;">
          <strong>Rendimiento:</strong> Variable según las condiciones del mercado y el nivel de riesgo elegido.<br>
          <strong>Plazo recomendado:</strong> Mediano a largo plazo (> 1 año).<br>
          <strong>Disponibilidad:</strong> Retiros de 3 a 5 días hábiles en FICs.<br>
          <strong>Seguridad:</strong> Media. Respaldado por Credicorp Capital Colombia. Los fondos no están garantizados contra pérdidas del mercado.
        </div>
      </div>

      <!-- Instrument 5: trii (ETFs y Acciones) -->
      <div class="card" style="border-left:4px solid #4a90e2; background:rgba(74,144,226,0.03); padding:14px; border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <b style="font-size:15px; color:#4a90e2; font-family:var(--sans);">trii (Acciones de Bolsa y ETFs Globales)</b>
          <span class="tag" style="background:rgba(74,144,226,0.15); color:#4a90e2; font-size:10px; font-weight:700;">Renta Variable / Largo Plazo</span>
        </div>
        <div style="font-size:12.5px; color:rgba(246,241,230,.85); line-height:1.45;">
          <strong>Rendimiento:</strong> Históricamente, el S&P 500 rinde aprox. 8% a 10% anual en dólares a largo plazo.<br>
          <strong>Plazo recomendado:</strong> Largo plazo (> 2-3 años).<br>
          <strong>Disponibilidad:</strong> Puedes vender tus acciones o ETFs en días de mercado y transferir el dinero a tu cuenta bancaria (3-4 días).<br>
          <strong>Seguridad:</strong> Baja a media (las acciones fluctúan de valor diariamente). Regulado por la Superfinanciera de Colombia.
        </div>
      </div>
    </div>
  `;

  $('r3').innerHTML = `
    <header>
      <div class="ey">Educación financiera</div>
      <h1>Aprender a invertir</h1>
    </header>
    ${ladderHtml}
    ${coachHtml}
    <details class="glosario">
      <summary>¿Dónde invertir? Opciones en Colombia</summary>
      ${catalogHtml}
    </details>
  `;

  // Filas de meta -> expandir recomendación completa inline (sin salir de Aprender)
  $('r3').querySelectorAll('[data-meta]').forEach(row => {
    row.onclick = () => {
      const rec = row.querySelector('.apr-rec');
      const chev = row.querySelector('.apr-chev');
      if (!rec) return;
      const open = rec.style.display === 'none';
      rec.style.display = open ? 'block' : 'none';
      if (chev) chev.style.transform = open ? 'rotate(90deg)' : '';
    };
  });
  // Estado vacío -> crear meta
  const btnCrear = $('aprCrearMeta');
  if (btnCrear) btnCrear.onclick = () => { go(1); setTimeout(() => openMetaForm(null, 'sueno'), 50); };
}

/* =========================================================
   AJUSTES (configuración)
   ========================================================= */
function renderPlan(){
  const c=state.config;
  const isIndiv = c.modo === 'individual';
  const detEstrategiaOpen = $('detEstrategia') ? $('detEstrategia').hasAttribute('open') : false;
  const detPerfilOpen = $('detPerfil') ? $('detPerfil').hasAttribute('open') : false;
  const detNombresOpen = $('detNombres') ? $('detNombres').hasAttribute('open') : false;
  const detRespaldoOpen = $('detRespaldo') ? $('detRespaldo').hasAttribute('open') : false;
  const detInstalarOpen = $('detInstalar') ? $('detInstalar').hasAttribute('open') : false;
  const detInvitacionOpen = $('detInvitacion') ? $('detInvitacion').hasAttribute('open') : false;

  const isCapacitor = typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
  let perfilHtml = '';
  if (currentUser) {
    perfilHtml = `
      <div style="background:rgba(246,241,230,.03);border:1px solid var(--line);border-radius:10px;padding:12px;margin-top:8px;font-size:13.5px;color:var(--ink);">
        Perfil asignado por tu cuenta: <b style="color:var(--green)">Soy ${perfilNombre(c.perfil)}</b>
      </div>
      <div class="hint" style="margin-top:6px">Como iniciaste sesión, tu perfil está vinculado a tu cuenta de Google/Correo y no se puede cambiar desde este dispositivo.</div>
    `;
  } else {
    perfilHtml = `
      <div class="seg" style="margin-top:8px">
        <button id="pfG" class="${c.perfil==='p1'?'on':''}">Soy ${c.nombreP1}</button>
        <button id="pfA" class="${c.perfil==='p2'?'on':''}">Soy ${c.nombreP2}</button>
      </div>
    `;
  }
  let installHtml = '';
  if (!isCapacitor) {
    installHtml = `
<details id="detInstalar" ${detInstalarOpen ? 'open' : ''}><summary>Instalar en el teléfono</summary><div class="dpad">
  <div class="hint" style="margin-top:0">Instala "Nuestro plan" en tu pantalla de inicio para usarla como una aplicación, más rápido y sin conexión a internet.</div>
  <button class="btn" id="bInstallPWA" style="display:${deferredPrompt?'block':'none'};margin-top:12px">Instalar Aplicación</button>
  <div id="pwaIosHint" style="display:${isIOS()?'block':'none'};margin-top:10px;background:rgba(28,58,44,.04);border:1px solid var(--line);border-radius:10px;padding:12px;color:var(--ink)">
    <div style="font-weight:700;margin-bottom:6px;color:var(--green)">Instrucciones para iPhone / iPad (Safari):</div>
    <ol style="padding-left:18px;font-size:12.5px;line-height:1.45;display:flex;flex-direction:column;gap:6px">
      <li>Toca el botón de <b>Compartir</b> <svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;vertical-align:middle;display:inline-block"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg> en Safari.</li>
      <li>Desplaza la lista hacia abajo y selecciona <b>Agregar al inicio</b> (o "Add to Home Screen").</li>
      <li>Presiona <b>Agregar</b> arriba a la derecha.</li>
    </ol>
  </div>
  <div id="pwaGenericHint" style="margin-top:10px;font-size:12px;color:rgba(246,241,230,.5);line-height:1.4">
    ${isIOS() ? '' : 'Si tu navegador no muestra el botón de instalación directa, abre el menú de opciones (tres puntos) y selecciona <b>Instalar aplicación</b> o <b>Agregar a pantalla de inicio</b>.'}
  </div>
</div></details>
    `;
  }

  const dis = !canEditShared() ? 'disabled style="opacity:0.65;pointer-events:none;"' : '';

  let syncHtml = '';
  let logoutHtml = '';
  let respaldoHtml = '';
  if (currentUser) {
    const isGoogle = currentUser.providerData && currentUser.providerData.some(p => p.providerId === 'google.com');
    const photoUrl = currentUser.photoURL;
    const name = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Usuario');
    const email = currentUser.email || 'Sin correo';

    const badgeHtml = isGoogle
      ? `<span class="pill" style="display:inline-flex;align-items:center;gap:5px;background:rgba(217,168,74,0.15);color:var(--gb);border:1px solid rgba(217,168,74,0.3);padding:3px 8px;text-transform:none;letter-spacing:normal;">
          <svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:currentColor;"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.435 0-6.237-2.836-6.237-6.314s2.802-6.314 6.237-6.314c1.558 0 2.978.577 4.073 1.528l3.055-3.056C19.3 2.766 16.03 1.5 12.24 1.5 6.033 1.5 1 6.533 1 12.74s5.033 11.24 11.24 11.24c5.897 0 10.741-4.148 10.741-11.24 0-.67-.063-1.34-.188-1.955H12.24z"/></svg>
          Google
         </span>`
      : `<span class="pill" style="display:inline-flex;align-items:center;gap:5px;background:rgba(246,241,230,0.08);color:var(--cream);border:1px solid rgba(246,241,230,0.2);padding:3px 8px;text-transform:none;letter-spacing:normal;">
          <svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.5;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
          Correo
         </span>`;

    const avatarHtml = photoUrl
      ? `<img src="${photoUrl}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--gb);box-shadow:0 2px 6px rgba(0,0,0,0.15);" referrerpolicy="no-referrer" />`
      : `<div style="width:40px;height:40px;border-radius:50%;background:var(--gs);color:var(--cream);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;border:2px solid rgba(246,241,230,0.2);">
          ${name.charAt(0).toUpperCase()}
         </div>`;

    const userCardHtml = `
      <div style="background:var(--green);color:var(--cream);border-radius:14px;padding:14px;display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        ${avatarHtml}
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
          <div style="font-size:12px;color:rgba(246,241,230,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${email}</div>
          <div style="margin-top:2px;">${badgeHtml}</div>
        </div>
      </div>
    `;

    let partnerInfoHtml = '';
    if (!isIndiv) {
      if (isOwner) {
        if (planMeta && planMeta.partnerEmail) {
          partnerInfoHtml = `
            <div style="background:rgba(217,168,74,0.06);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:14px;">
              <div class="k" style="margin-bottom:4px;color:var(--green);">Pareja Conectada</div>
              <div style="font-size:13.5px;font-weight:600;color:var(--ink);">${planMeta.partnerEmail}</div>
              <div style="margin-top:10px;">
                <label class="lbl" style="font-size:11px;margin-bottom:6px;">Permisos de tu pareja:</label>
                <div class="seg" style="margin-top:0;">
                  <button id="btnRoleEditor" class="${planMeta.partnerRole !== 'viewer' ? 'on' : ''}">Editor</button>
                  <button id="btnRoleViewer" class="${planMeta.partnerRole === 'viewer' ? 'on' : ''}">Lector</button>
                </div>
                <div class="hint" style="margin-top:6px;font-size:11px;">
                  ${planMeta.partnerRole === 'viewer'
                    ? '<b>Lector</b>: Tu pareja puede ver el plan pero no puede realizar aportes ni editar metas.'
                    : '<b>Editor</b>: Ambos pueden realizar aportes, editar metas y modificar el presupuesto.'}
                </div>
              </div>
            </div>
          `;
        } else {
          partnerInfoHtml = `
            <div style="background:rgba(28,58,44,0.03);border:1px dashed var(--line);border-radius:12px;padding:12px;margin-bottom:14px;text-align:center;">
              <div style="font-size:12.5px;color:var(--gs);">Esperando a tu pareja...</div>
              <div class="hint" style="margin-top:4px;font-size:11px;">Comparte el código o enlace de abajo para conectarse.</div>
            </div>
          `;
        }
      } else {
        const ownerEmail = (planMeta && planMeta.ownerEmail) || 'Tu pareja';
        const isViewer = planMeta && planMeta.partnerRole === 'viewer';
        partnerInfoHtml = `
          <div style="background:rgba(28,58,44,0.03);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:14px;">
            <div class="k" style="margin-bottom:4px;color:var(--gs);">Conectado al Plan de</div>
            <div style="font-size:13.5px;font-weight:600;color:var(--ink);">${ownerEmail}</div>
            <div style="margin-top:10px;">
              <label class="lbl" style="font-size:11px;margin-bottom:6px;">Tu rol en el plan:</label>
              <div class="seg" style="margin-top:0;opacity:0.85;pointer-events:none;">
                <button class="${!isViewer ? 'on' : ''}">Editor</button>
                <button class="${isViewer ? 'on' : ''}">Lector</button>
              </div>
            </div>
            <div class="hint" style="margin-top:8px;font-size:11px;line-height:1.4;">
              ${isViewer
                ? `<span style="display:flex;align-items:flex-start;gap:5px;">${getSVG('alert', '', 'flex-shrink:0;stroke:#e06c75;margin-top:1px;width:13px;height:13px;')} <span><b>Modo lectura activado</b>. Solo puedes visualizar la información de las metas compartidas, los gastos y el presupuesto. Tu bolsillo personal sigue estando disponible.</span></span>`
                : `<span style="display:flex;align-items:center;gap:5px;">${getSVG('target', '', 'flex-shrink:0;stroke:var(--green);width:13px;height:13px;')} <span>Tienes permisos de <b>Editor</b>. Puedes realizar aportes, modificar metas y rellenar presupuestos.</span></span>`}
            </div>
          </div>
        `;
      }
    }

    syncHtml = `
      ${userCardHtml}
      ${!isGoogle ? `
      <button class="btn gold" id="btnSettingsLinkGoogle" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-bottom:16px;">
        <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;stroke:none;"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.435 0-6.237-2.836-6.237-6.314s2.802-6.314 6.237-6.314c1.558 0 2.978.577 4.073 1.528l3.055-3.056C19.3 2.766 16.03 1.5 12.24 1.5 6.033 1.5 1 6.533 1 12.74s5.033 11.24 11.24 11.24c5.897 0 10.741-4.148 10.741-11.24 0-.67-.063-1.34-.188-1.955H12.24z"/></svg>
        Vincular Cuenta de Google
      </button>
      ` : ''}
      ${partnerInfoHtml}
      ${isOwner && !isIndiv ? `
      <div class="hint" style="margin-top:0">Comparte este código o enlace con tu pareja para sincronizar en tiempo real:</div>
      <div style="background:rgba(28,58,44,.04);border:1px dashed var(--line);border-radius:10px;padding:12px;text-align:center;font-family:monospace;font-size:14.5px;color:var(--green);margin-top:8px;word-break:break-all;user-select:all;" id="valPlanId">
        ${currentPlanId || 'Cargando código...'}
      </div>
      <div style="display:flex;gap:10px;margin-top:12px;">
        <button class="mini" id="bCopyCode" style="flex:1;margin:0;">Copiar Código</button>
        <button class="mini" id="bCopyLink" style="flex:1;margin:0;">Copiar Enlace</button>
      </div>
      ` : ''}
      ${!isIndiv ? `
      <div style="border-top:1px solid var(--line);margin-top:16px;padding-top:14px;display:flex;flex-direction:column;gap:10px;">
        <button class="btn ghost" id="btnSettingsInviteCode" style="width:100%;margin:0;">Tengo un código de invitación</button>
      </div>
      ` : ''}
    `;
    logoutHtml = `
      <div style="margin-top:20px;margin-bottom:20px;">
        <button class="btn ghost" id="bLogout" style="width:100%;border-color:rgba(235,94,85,.3);color:#eb5e55;margin:0;">Cerrar sesión</button>
      </div>
    `;
    respaldoHtml = `
      <details id="detRespaldo" ${detRespaldoOpen ? 'open' : ''}><summary>Respaldo y datos</summary><div class="dpad">
        <div class="hint" style="margin-top:0;margin-bottom:12px;line-height:1.45;display:flex;align-items:flex-start;gap:6px;">
          ${getSVG('cloud', '', 'flex-shrink:0;opacity:0.7;margin-top:1px;')}
          <span><b>Sincronización activa:</b> Tus datos se guardan de forma automática en tu cuenta en la nube. No necesitas respaldos manuales.</span>
        </div>
        <button class="btn ghost" id="bResetSaldos" style="border-color:rgba(155,103,28,.4);color:#9b671c;margin-bottom:12px;" ${dis}>Reiniciar saldos a $0</button>
        <button class="btn danger" id="bReset" ${dis}>Borrar todos los datos</button>
        <div class="hint" style="margin-top:6px;font-size:11px;color:#b3261e;display:flex;align-items:flex-start;gap:5px;">
          ${getSVG('alert', '', 'flex-shrink:0;stroke:#b3261e;width:12px;height:12px;margin-top:1px;')}
          <span>Esta acción restablecerá tu app local y eliminará permanentemente la información compartida de este plan en la nube.</span>
        </div>
        <button class="btn ghost" id="bOnb" style="margin-top:12px" ${dis}>Ver el tutorial otra vez</button>
      </div></details>
    `;
  } else {
    syncHtml = `
      <div class="hint" style="margin-top:0;margin-bottom:12px;">Estado: <b style="color:var(--gs);">Modo Local (sin cuenta)</b></div>
      <div class="hint" style="margin-top:0;margin-bottom:14px;">Inicia sesión para sincronizar tus datos en la nube.</div>
      
      <button class="btn gold" id="btnSettingsLoginGoogle" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;">
        <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;stroke:none;"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.435 0-6.237-2.836-6.237-6.314s2.802-6.314 6.237-6.314c1.558 0 2.978.577 4.073 1.528l3.055-3.056C19.3 2.766 16.03 1.5 12.24 1.5 6.033 1.5 1 6.533 1 12.74s5.033 11.24 11.24 11.24c5.897 0 10.741-4.148 10.741-11.24 0-.67-.063-1.34-.188-1.955H12.24z"/></svg>
        Conectar con Google
      </button>
      
      <button class="btn ghost" id="btnSettingsShowEmailAuth" style="margin-top:12px;width:100%;">
        Conectar con Correo y Contraseña
      </button>
 
      <div id="settingsEmailAuthForm" style="display:none;flex-direction:column;gap:12px;text-align:left;margin-top:15px;background:rgba(246,241,230,.03);padding:14px;border:1px solid var(--line);border-radius:12px;">
        <div class="ob-field" style="margin:0;">
          <label class="lbl">Correo electrónico</label>
          <input class="sf" type="email" id="settingsAuthEmail" placeholder="ejemplo@correo.com">
        </div>
        <div class="ob-field" style="margin:0;">
          <label class="lbl">Contraseña (mínimo 6 caracteres)</label>
          <input class="sf" type="password" id="settingsAuthPassword" placeholder="Contraseña">
        </div>
        <button class="btn" id="btnSettingsEmailSubmit" style="width:100%;margin-top:4px;">
          Iniciar Sesión
        </button>
        <div style="text-align:center;margin-top:8px;">
          <a href="#" id="linkSettingsToggleAuthMode" style="font-size:12.5px;color:var(--gold);text-decoration:underline;">¿No tienes cuenta? Regístrate</a>
        </div>
      </div>
 
      ${!isIndiv ? `
      <div style="border-top:1px solid var(--line);margin-top:16px;padding-top:14px;display:flex;flex-direction:column;gap:10px;">
        <button class="btn ghost" id="btnSettingsInviteCode" style="width:100%;">Tengo un código de invitación</button>
      </div>
      ` : ''}
    `;
    respaldoHtml = `
      <details id="detRespaldo" ${detRespaldoOpen ? 'open' : ''}><summary>Respaldo y datos</summary><div class="dpad">
        <div class="hint" style="margin-top:0;margin-bottom:12px;line-height:1.45;display:flex;align-items:flex-start;gap:6px;">
          ${getSVG('phone', '', 'flex-shrink:0;opacity:0.7;margin-top:1px;')}
          <span><b>Modo Local activo:</b> Tus datos solo se guardan en este teléfono. Genera un respaldo manual para transferir tus datos o no perderlos si cambias de dispositivo.</span>
        </div>
        <button class="mini" id="bExp">Generar respaldo</button><button class="mini" id="bImp" ${dis}>Restaurar</button>
        <textarea class="bktx" id="bTxt" placeholder="Aquí aparece el respaldo. Para restaurar, pega y toca Restaurar."></textarea>
        <button class="btn ghost" id="bResetSaldos" style="border-color:rgba(155,103,28,.4);color:#9b671c;margin-bottom:12px;" ${dis}>Reiniciar saldos a $0</button>
        <button class="btn danger" id="bReset" ${dis}>Borrar todos los datos</button>
        <button class="btn ghost" id="bOnb" style="margin-top:10px" ${dis}>Ver el tutorial otra vez</button>
      </div></details>
    `;
  }
 
  const nombresHtml = isIndiv
    ? `<details id="detNombres" ${detNombresOpen ? 'open' : ''}><summary>Mi nombre</summary><div class="dpad">
        <label class="lbl">Mi nombre<input class="sf" id="pNom1" value="${c.nombreP1.replace(/"/g,'&quot;')}" style="margin-top:4px" ${dis}></label>
       </div></details>`
    : `<details id="detNombres" ${detNombresOpen ? 'open' : ''}><summary>Nombres de la pareja</summary><div class="dpad">
        <div class="row2"><label class="lbl">Persona 1<input class="sf" id="pNom1" value="${c.nombreP1.replace(/"/g,'&quot;')}" style="margin-top:4px" ${dis}></label>
          <label class="lbl">Persona 2<input class="sf" id="pNom2" value="${c.nombreP2.replace(/"/g,'&quot;')}" style="margin-top:4px" ${dis}></label></div>
       </div></details>`;

  const perfilDetailHtml = isIndiv
    ? ''
    : `<details id="detPerfil" ${detPerfilOpen ? 'open' : ''}><summary>Perfil de este teléfono</summary><div class="dpad">
        <div class="hint" style="margin-top:0">Cada uno instala la app en su teléfono. Tú ves y llenas tu bolsillo personal.</div>
        ${perfilHtml}
       </div></details>`;

  $('r4').innerHTML=`
<header><div class="ey">Configuración</div><h1>Ajustes</h1></header>
 
<details id="detEstrategia" ${detEstrategiaOpen ? 'open' : ''}><summary>Estrategia de ahorro</summary><div class="dpad">
  <div class="seg">
    <button id="estSeq" class="${c.estrategia==='secuencial'?'on':''}" ${dis}>Prioritaria primero</button>
    <button id="estSim" class="${c.estrategia==='simultaneo'?'on':''}" ${dis}>Simultáneo</button>
    <button id="estCas" class="${c.estrategia==='cascada'?'on':''}" ${dis}>En cascada</button>
  </div>
  <div class="hint">
    ${c.estrategia==='secuencial'?'<b>Prioritaria primero</b>: Cubre los aportes fijos de todas las metas y luego destina todo el ahorro restante a la meta de máxima prioridad.'
      :c.estrategia==='simultaneo'?'<b>Simultáneo</b>: Reparte en paralelo entre todas las metas (incluyendo la prioritaria si tiene aportes) desde el inicio.'
      :'<b>En cascada</b>: Llena las metas una por una en estricto orden de prioridad (número menor a mayor), ignorando porcentajes y fijos.'}
  </div>
</div></details>

${perfilDetailHtml}
 
<details id="detInvitacion" ${detInvitacionOpen ? 'open' : ''}><summary>${isIndiv ? 'Copia de seguridad' : 'Sincronizar y Conectar Pareja'}</summary><div class="dpad">
  ${syncHtml}
</div></details>
 
${nombresHtml}
 
${installHtml}
 
${respaldoHtml}
${logoutHtml}`;
  attachPlan();
}
function attachPlan(){
  const c=state.config;
  const isIndiv = c.modo === 'individual';
  $('estSeq').onclick=()=>{c.estrategia='secuencial';save();rerenderPlanKeepOpen();};
  $('estSim').onclick=()=>{c.estrategia='simultaneo';save();rerenderPlanKeepOpen();};
  $('estCas').onclick=()=>{c.estrategia='cascada';save();rerenderPlanKeepOpen();};
  if (!currentUser && !isIndiv) {
    const pfG = $('pfG');
    if (pfG) pfG.onclick=()=>{c.perfil='p1';save();rerenderPlanKeepOpen();};
    const pfA = $('pfA');
    if (pfA) pfA.onclick=()=>{c.perfil='p2';save();rerenderPlanKeepOpen();};
  }
  $('pNom1').addEventListener('blur',()=>{
    const newName=$('pNom1').value.trim()||'Persona 1';
    c.nombreP1=newName;
    save();
    if (currentUser && currentPlanId && isOwner) {
      db.collection('meta').doc(currentPlanId).update({ ownerName: newName }).catch(e => {});
    }
  });
  const pNom2 = $('pNom2');
  if (pNom2) {
    pNom2.addEventListener('blur',()=>{
      const newName=pNom2.value.trim()||'Persona 2';
      c.nombreP2=newName;
      save();
      if (currentUser && currentPlanId) {
        db.collection('meta').doc(currentPlanId).update({ partnerName: newName }).catch(e => {});
      }
    });
  }
  
  const bCopyCode = $('bCopyCode');
  if (bCopyCode) {
    bCopyCode.onclick = async () => {
      if (!currentPlanId) return;
      try {
        await navigator.clipboard.writeText(currentPlanId);
        flash('Código copiado ✓');
      } catch (err) {
        await customAlert('No se pudo copiar el código. Escríbelo a mano: ' + currentPlanId);
      }
    };
  }

  const bCopyLink = $('bCopyLink');
  if (bCopyLink) {
    bCopyLink.onclick = async () => {
      if (!currentPlanId) return;
      const link = window.location.origin + window.location.pathname + '?plan=' + currentPlanId;
      try {
        await navigator.clipboard.writeText(link);
        flash('Enlace de invitación copiado ✓');
      } catch (err) {
        await customAlert('No se pudo copiar el enlace. Comparte este código: ' + currentPlanId);
      }
    };
  }

  const btnSettingsLoginGoogle = $('btnSettingsLoginGoogle');
  if (btnSettingsLoginGoogle) {
    btnSettingsLoginGoogle.onclick = async () => {
      const isCapacitor = typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
      if (isCapacitor) {
        try {
          const { GoogleAuth } = window.Capacitor.Plugins;
          await GoogleAuth.initialize({
            clientId: '486527605037-uh0u0ctmlq7tgb48d9128t8ugc3dkg8v.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
          });
          const googleUser = await GoogleAuth.signIn();
          const idToken = googleUser.authentication.idToken;
          const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
          await auth.signInWithCredential(credential);
        } catch(err) {
          console.error('Error de autenticación nativa de Google:', err);
          await customAlert('Error de inicio de sesión con Google nativo: ' + (err.message || JSON.stringify(err)));
        }
      } else {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
          await auth.signInWithPopup(provider);
        } catch(err) {
          await customAlert('Error de conexión: ' + err.message);
        }
      }
    };
  }

  const btnSettingsLinkGoogle = $('btnSettingsLinkGoogle');
  if (btnSettingsLinkGoogle) {
    btnSettingsLinkGoogle.onclick = async () => {
      if (!currentUser) return;
      const isCapacitor = typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
      if (isCapacitor) {
        try {
          const { GoogleAuth } = window.Capacitor.Plugins;
          await GoogleAuth.initialize({
            clientId: '486527605037-uh0u0ctmlq7tgb48d9128t8ugc3dkg8v.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
          });
          const googleUser = await GoogleAuth.signIn();
          const idToken = googleUser.authentication.idToken;
          const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
          await currentUser.linkWithCredential(credential);
          flash('Cuenta de Google vinculada con éxito ✓');
          rerenderPlanKeepOpen();
        } catch(err) {
          console.error('Error al vincular Google nativo:', err);
          await customAlert('Error al vincular cuenta: ' + (err.message || JSON.stringify(err)));
        }
      } else {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
          await currentUser.linkWithPopup(provider);
        } catch(err) {
          await customAlert('Error al conectar: ' + err.message);
        }
      }
    };
  }

  const btnSettingsShowEmailAuth = $('btnSettingsShowEmailAuth');
  const settingsEmailForm = $('settingsEmailAuthForm');
  if (btnSettingsShowEmailAuth && settingsEmailForm) {
    btnSettingsShowEmailAuth.onclick = () => {
      settingsEmailForm.style.display = 'flex';
      btnSettingsShowEmailAuth.style.display = 'none';
    };
  }

  const linkSettingsToggle = $('linkSettingsToggleAuthMode');
  const btnSettingsEmailSubmit = $('btnSettingsEmailSubmit');
  let settingsIsRegisterMode = false;
  if (linkSettingsToggle && btnSettingsEmailSubmit) {
    linkSettingsToggle.onclick = (e) => {
      e.preventDefault();
      settingsIsRegisterMode = !settingsIsRegisterMode;
      if (settingsIsRegisterMode) {
        btnSettingsEmailSubmit.textContent = 'Registrarse y Crear Cuenta';
        linkSettingsToggle.textContent = '¿Ya tienes cuenta? Inicia sesión';
      } else {
        btnSettingsEmailSubmit.textContent = 'Iniciar Sesión';
        linkSettingsToggle.textContent = '¿No tienes cuenta? Regístrate';
      }
    };
  }

  if (btnSettingsEmailSubmit) {
    btnSettingsEmailSubmit.onclick = async () => {
      const email = $('settingsAuthEmail').value.trim();
      const password = $('settingsAuthPassword').value;
      if (!email || !password) {
        await customAlert('Por favor completa todos los campos.');
        return;
      }
      if (password.length < 6) {
        await customAlert('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      btnSettingsEmailSubmit.disabled = true;
      btnSettingsEmailSubmit.textContent = 'Procesando...';
      try {
        if (settingsIsRegisterMode) {
          await auth.createUserWithEmailAndPassword(email, password);
        } else {
          await auth.signInWithEmailAndPassword(email, password);
        }
      } catch(err) {
        btnSettingsEmailSubmit.disabled = false;
        btnSettingsEmailSubmit.textContent = settingsIsRegisterMode ? 'Registrarse y Crear Cuenta' : 'Iniciar Sesión';
        if (err.code === 'auth/operation-not-allowed') {
          await customAlert('El inicio de sesión por correo no está activado en tu consola de Firebase. Actívalo en Authentication > Sign-in method.');
        } else if (err.code === 'auth/email-already-in-use') {
          await customAlert('Este correo ya está registrado. Por favor inicia sesión.');
        } else if (err.code === 'auth/invalid-credential') {
          await customAlert('Correo o contraseña incorrectos.');
        } else {
          await customAlert('Error: ' + err.message);
        }
      }
    };
  }

  const btnSettingsInviteCode = $('btnSettingsInviteCode');
  if (btnSettingsInviteCode) {
    btnSettingsInviteCode.onclick = async () => {
      const code = await customPrompt("Pega el código de invitación o el enlace completo:");
      if (code && code.trim()) {
        let cleanCode = code.trim();
        if (cleanCode.includes('plan=')) {
          try {
            if (cleanCode.startsWith('http') || cleanCode.startsWith('https')) {
              const url = new URL(cleanCode);
              cleanCode = url.searchParams.get('plan') || cleanCode;
            } else {
              const match = cleanCode.match(/plan=([^&]+)/);
              if (match) cleanCode = match[1];
            }
          } catch(e) {
            const match = cleanCode.match(/plan=([^&]+)/);
            if (match) cleanCode = match[1];
          }
        }
        localStorage.setItem('planId', cleanCode);
        localStorage.setItem('isInvited', 'true');
        if (typeof currentUser !== 'undefined' && currentUser) {
          window.location.reload();
        } else {
          flash('Código de plan cargado. Inicia sesión para conectar ✓');
          rerenderPlanKeepOpen();
        }
      }
    };
  }

  const bLogout = $('bLogout');
  if (bLogout) {
    bLogout.onclick = async () => {
      if (!await customConfirm('¿Cerrar sesión? Se detendrá la sincronización en este dispositivo.', true)) return;
      try {
        await auth.signOut();
        localStorage.removeItem('planId');
        localStorage.removeItem('isInvited');
        state = { config: Object.assign({}, CFG_DEF), metas: metasEjemplo().concat(metasPersonales()), log: [], ingresos: [], gastos: [] };
        save();
        startOnboarding();
        flash('Sesión cerrada ✓');
      } catch(err) {
        await customAlert('Error al cerrar sesión: ' + err.message);
      }
    };
  }

  const bExp = $('bExp');
  if (bExp) {
    // Privacidad: el respaldo no incluye el bolsillo de la pareja
    // (vive en la nube bajo su cuenta y se repone al sincronizar).
    bExp.onclick=()=>{
      const copia=Object.assign({},state,{metas:state.metas.filter(m=>!(m.tipo==='personal'&&m.dueno!==state.config.perfil))});
      $('bTxt').value=JSON.stringify(copia);flash('Respaldo generado');};
  }
  const bImp = $('bImp');
  if (bImp) {
    bImp.onclick=()=>{try{const o=JSON.parse($('bTxt').value);if(!o.metas)throw 0;
      const perfil=state.config.perfil;
      // Un respaldo nunca pisa bolsillos: conserva los dos personales locales.
      const personalesLocales=state.metas.filter(m=>m.tipo==='personal').map(x=>JSON.parse(JSON.stringify(x)));
      state=o;normalize();state.config.perfil=perfil;
      personalesLocales.forEach(pl=>{
        const idx=state.metas.findIndex(m=>m.tipo==='personal'&&m.dueno===pl.dueno);
        if(idx>=0)state.metas[idx]=pl;else state.metas.push(pl);
      });
      save();go(0);flash('Respaldo restaurado ✓');}catch(e){flash('Respaldo inválido');}};
  }
  const bResetSaldos = $('bResetSaldos');
  if (bResetSaldos) {
    bResetSaldos.onclick = async () => {
      if (!canEditShared()) { flash('Solo un editor puede reiniciar el plan'); return; }
      if (!await customConfirm('¿Reiniciar todos los saldos y el historial a $0? Se mantendrán tus metas creadas, nombres, nóminas y gastos fijos configurados.', true)) return;
      
      // Reiniciar saldos de todas las metas (incluyendo las personales)
      state.metas.forEach(m => {
        m.saldo = 0;
        if (m.aportes) m.aportes = []; // limpiar historial de aportes si los hay en personales
      });
      
      // Limpiar historiales y movimientos
      state.log = [];
      state.ingresos = [];
      state.gastos = [];
      
      save();
      rerender();
      flash('Saldos e historial reiniciados ✓');
    };
  }
  $('bReset').onclick=async()=>{if(!canEditShared()){flash('Solo un editor puede borrar el plan');return;}if(!await customConfirm('¿Borrar todos los datos?', true))return;state={config:Object.assign({},CFG_DEF),metas:metasEjemplo().concat(metasPersonales()),log:[],ingresos:[],gastos:[]};save();startOnboarding();};
  $('bOnb').onclick=()=>startOnboarding();
  const bInst = $('bInstallPWA');
  if (bInst) {
    bInst.onclick = async () => {
      if (!deferredPrompt) return;
      bInst.disabled = true;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Instalación del usuario: ${outcome}`);
      deferredPrompt = null;
      bInst.style.display = 'none';
      bInst.disabled = false;
    };
  }

  const btnRoleEditor = $('btnRoleEditor');
  if (btnRoleEditor) {
    btnRoleEditor.onclick = async () => {
      if (!currentPlanId || !isOwner) return;
      try {
        await db.collection('meta').doc(currentPlanId).update({
          partnerRole: 'editor'
        });
        flash('Permiso cambiado a Editor ✓');
      } catch (e) {
        await customAlert('Error al actualizar permisos: ' + e.message);
      }
    };
  }

  const btnRoleViewer = $('btnRoleViewer');
  if (btnRoleViewer) {
    btnRoleViewer.onclick = async () => {
      if (!currentPlanId || !isOwner) return;
      try {
        await db.collection('meta').doc(currentPlanId).update({
          partnerRole: 'viewer'
        });
        flash('Permiso cambiado a Lector ✓');
      } catch (e) {
        await customAlert('Error al actualizar permisos: ' + e.message);
      }
    };
  }
}
function rerenderPlanKeepOpen(){renderPlan();}

/* =========================================================
   ONBOARDING (bienvenida + 5 pasos)
   ========================================================= */
let obStep=0,obMetaTipo='sueno',obReparto=[{n:'Renta variable',pct:50},{n:'Renta fija',pct:30},{n:'Reserva',pct:20}];
const OB_TOTAL=4;
function startOnboarding(){
  if (currentUser) {
    obStep = 1;
  } else {
    obStep = 0;
  }
  $('onb').classList.add('on');
  renderOb();
}
function obProgress(){$('obBar').style.width=Math.round((obStep)/(OB_TOTAL-1)*100)+'%';}
function renderOb(){
  obProgress();
  const c=state.config;const inner=$('obInner');
  const isInv = localStorage.getItem('isInvited') === 'true';
  
  $('obNext').style.display=obStep===0?'none':'block';
  $('obSkip').style.display=(obStep===0 || isInv)?'none':'block';
  
  if (isInv && obStep === 1) {
    $('obNext').textContent = 'Empezar';
  } else {
    $('obNext').textContent = obStep === OB_TOTAL-1 ? 'Empezar' : 'Continuar';
  }
  
  const backBtn = $('obBack');
  if (backBtn) backBtn.style.display = (obStep > 1) ? 'block' : 'none';
  
  let h='';
  if(obStep===0){
    if (currentUser) {
      h = `<div class="ob-step on" style="text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:280px; gap:12px;">
        <div class="ob-mark">✦</div>
        <div class="ob-eyebrow">Nuestro plan</div>
        <div class="ob-h" style="margin-top:6px;">Conectando...</div>
        <div class="ob-p" style="margin-top:4px; font-size:13.5px; opacity:0.85;">Cargando tu plan y sincronizando datos desde la nube.</div>
        <div style="margin-top:24px;">
          <div class="spinner"></div>
        </div>
      </div>`;
    } else {
      const isInvited = localStorage.getItem('isInvited') === 'true' || new URLSearchParams(window.location.search).has('plan');
      const emailFormHtml = `
        <div id="emailAuthForm" style="display:none;flex-direction:column;gap:12px;text-align:left;margin-top:15px;background:rgba(246,241,230,.03);padding:14px;border:1px solid var(--line);border-radius:12px;">
          <div class="ob-field" style="margin:0;">
            <label class="lbl">Correo electrónico</label>
            <input class="sf" type="email" id="authEmail" placeholder="ejemplo@correo.com">
          </div>
          <div class="ob-field" style="margin:0;">
            <label class="lbl">Contraseña (mínimo 6 caracteres)</label>
            <input class="sf" type="password" id="authPassword" placeholder="Contraseña">
          </div>
          <button class="btn" id="btnObEmailSubmit" style="width:100%;margin-top:4px;">
            Iniciar Sesión
          </button>
          <div style="text-align:center;margin-top:8px;">
            <a href="#" id="linkToggleAuthMode" style="font-size:12.5px;color:var(--gold);text-decoration:underline;">¿No tienes cuenta? Regístrate</a>
          </div>
        </div>
      `;

      if(isInvited){
        h=`<div class="ob-step on">
          <div class="ob-mark">✦</div>
          <div class="ob-eyebrow">Te invitaron a Nuestro plan</div>
          <div class="ob-h">¡Únete al plan de tu pareja!</div>
          <div class="ob-p">Al conectarte, se sincronizarán en tiempo real el presupuesto compartido, los gastos y las metas de ahorro.</div>
          <button class="btn gold" id="btnObLogin" style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:28px;width:100%;">
            <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;stroke:none;"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.435 0-6.237-2.836-6.237-6.314s2.802-6.314 6.237-6.314c1.558 0 2.978.577 4.073 1.528l3.055-3.056C19.3 2.766 16.03 1.5 12.24 1.5 6.033 1.5 1 6.533 1 12.74s5.033 11.24 11.24 11.24c5.897 0 10.741-4.148 10.741-11.24 0-.67-.063-1.34-.188-1.955H12.24z"/></svg>
            Conectar con Google
          </button>
          <button class="btn ghost" id="btnShowEmailAuth" style="margin-top:12px;width:100%;">
            Conectar con Correo y Contraseña
          </button>
          ${emailFormHtml}
          <button class="ob-skip" id="btnObCancelInvite" style="margin-top:20px;display:block;width:100%;text-align:center;background:none;border:none;">
            Volver al inicio
          </button>
        </div>`;
      } else {
        h=`<div class="ob-step on">
          <div class="ob-mark">✦</div>
          <div class="ob-eyebrow">Nuestro plan</div>
          <div class="ob-h">Organicen su plata,<br>juntos.</div>
          <div class="ob-p">Definan a dónde va cada peso y avancen hacia sus sueños e inversiones. Conéctense para sincronizar sus teléfonos y ver los cambios al instante.</div>
          <button class="btn gold" id="btnObLogin" style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:28px;width:100%;">
            <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;stroke:none;"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.435 0-6.237-2.836-6.237-6.314s2.802-6.314 6.237-6.314c1.558 0 2.978.577 4.073 1.528l3.055-3.056C19.3 2.766 16.03 1.5 12.24 1.5 6.033 1.5 1 6.533 1 12.74s5.033 11.24 11.24 11.24c5.897 0 10.741-4.148 10.741-11.24 0-.67-.063-1.34-.188-1.955H12.24z"/></svg>
            Conectar con Google
          </button>
          <button class="btn ghost" id="btnShowEmailAuth" style="margin-top:12px;width:100%;">
            Conectar con Correo y Contraseña
          </button>
          ${emailFormHtml}
          <button class="btn ghost" id="btnObLocal" style="margin-top:12px;width:100%;">
            Comenzar en Modo Local (sin cuenta)
          </button>
          <button class="ob-skip" id="btnObInviteCode" style="margin-top:20px;display:block;width:100%;text-align:center;background:none;border:none;">
            Tengo un código de invitación
          </button>
        </div>`;
      }
    }
  } else if(obStep===1){
    if (isInv) {
      h=`<div class="ob-step on">
        <div class="ob-mark">✦</div>
        <div class="ob-eyebrow">Paso 1 de 2</div>
        <div class="ob-h">¿Quién eres en este teléfono?</div>
        <div class="ob-p" style="margin-top:4px;">Cada uno instala la app en el suyo. Elige tu nombre para acceder a tus metas individuales.</div>
        <div class="ob-field" id="obDeviceField">
          <div class="seg dark-seg" style="margin-top:14px;">
            <button id="obPf1" class="${c.perfil==='p1'?'on':''}">Soy ${c.nombreP1 || 'Persona 1'}</button>
            <button id="obPf2" class="${c.perfil==='p2'?'on':''}">Soy ${c.nombreP2 || 'Persona 2'}</button>
          </div>
        </div>
      </div>`;
    } else {
      const isIndiv = c.modo === 'individual';
      h=`<div class="ob-step on"><div class="ob-eyebrow">Paso 1 de 2</div>
        <div class="ob-h">¿Cómo usarás la app?</div>
        <div class="ob-field" style="margin-bottom:14px;">
          <div class="mode-cards dark-seg" id="obModoSeg">
            <div id="obModoPareja" class="mode-card ${!isIndiv?'on':''}">
              <span class="icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
              <span class="title">En pareja</span>
            </div>
            <div id="obModoIndiv" class="mode-card ${isIndiv?'on':''}">
              <span class="icon"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
              <span class="title">Individual</span>
            </div>
          </div>
        </div>
        <div class="ob-field">
          <label class="lbl">Nombre (Persona 1)</label>
          <input class="sf" id="obNom1" value="${c.nombreP1==='Persona 1'?'':c.nombreP1}" placeholder="Tu nombre">
        </div>
        <div class="ob-field" id="obNom2Field" style="display:${isIndiv?'none':''}">
          <label class="lbl">Nombre (Persona 2)</label>
          <input class="sf" id="obNom2" value="${c.nombreP2==='Persona 2'?'':c.nombreP2}" placeholder="Su nombre">
        </div>
        <div class="ob-field" id="obDeviceField" style="display:${isIndiv?'none':''}">
          <label class="lbl">¿De quién es este teléfono?</label>
          <div class="seg dark-seg" style="margin-top:6px;">
            <button id="obPf1" class="${c.perfil==='p1'?'on':''}">Soy ${c.nombreP1 || 'Persona 1'}</button>
            <button id="obPf2" class="${c.perfil==='p2'?'on':''}">Soy ${c.nombreP2 || 'Persona 2'}</button>
          </div>
        </div>
      </div>`;
    }
  } else if(obStep===2){
    h=`<div class="ob-step on">
      <div class="ob-eyebrow">Paso 2 de 2</div>
      <div class="ob-h">¿Tienes una primera meta?</div>
      <div class="ob-p">Agrégala ahora para ver cómo se distribuye tu plan. Si no la tienes, puedes crearla después.</div>
      ${c.modo === 'pareja' ? `<div class="hint" style="margin-top:2px; line-height:1.4; color:rgba(246,241,230,.7); background:rgba(246,241,230,.04); border:1px solid rgba(246,241,230,.1); border-radius:10px; padding:10px 12px;">Más adelante podrás crear <b>metas conjuntas</b> o <b>metas individuales</b>. El tipo se elige al crear cada meta.</div>` : ''}
      
      <div class="ob-field">
        <label class="lbl">¿Cómo se llama?</label>
        <input class="sf" id="obMetaNom" placeholder="ej: Fondo de emergencias, Viaje, Regalos...">
      </div>
      
      <div class="ob-field">
        <label class="lbl">Tipo de Meta</label>
        <div class="seg dark-seg" style="margin-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          <button id="obTipoSueno" class="on" style="display:inline-flex;align-items:center;justify-content:center;gap:5px;">${getSVG('star', '', 'width:14px;height:14px;')} Sueño</button>
          <button id="obTipoImprev" style="display:inline-flex;align-items:center;justify-content:center;gap:5px;">${getSVG('shield', '', 'width:14px;height:14px;')} Imprevistos</button>
        </div>
        <div class="hint" id="obTipoHint" style="margin-top:8px; line-height:1.4; color:rgba(246,241,230,.7);">Una meta con fecha u objetivo concreto: viaje, carro, apartamento…</div>
      </div>
      
      <div class="ob-field" id="obObjField">
        <label class="lbl" id="obObjLabel">¿Cuánto necesitas ahorrar?</label>
        <input class="sf money" id="obMetaObj" inputmode="numeric" placeholder="$15.000.000">
      </div>
    </div>`;
  } else if(obStep===3){
    const isNativeApp = typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    let obInstallHtml = '';
    if (!isNativeApp && !isStandalone) {
      obInstallHtml = `
        <div class="card" style="padding:12px 14px; background:rgba(217,168,74,.08); border:1px solid rgba(217,168,74,.3); border-radius:12px; margin-top:4px;">
          <div style="display:flex; gap:10px; align-items:flex-start;">
            <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:rgba(217,168,74,0.15);flex-shrink:0;">${getSVG('phone', '', 'color:var(--gb);')}</div>
            <div style="flex:1;">
              <div style="font-weight:600; font-size:13.5px; color:var(--cream);">Instala la app en tu teléfono</div>
              <div style="font-size:11.5px; color:rgba(246,241,230,.7); margin-top:2px;">Tenla a un toque, más rápida y disponible sin conexión.</div>
            </div>
          </div>
          <button class="btn" id="obInstallPWA" style="display:${deferredPrompt?'block':'none'}; width:100%; margin-top:12px;">Instalar aplicación</button>
          <div id="obIosHint" style="display:${isIOS()?'block':'none'}; margin-top:10px; background:rgba(246,241,230,.04); border:1px solid rgba(246,241,230,.12); border-radius:10px; padding:10px 12px; color:rgba(246,241,230,.85);">
            <div style="font-weight:700; margin-bottom:6px; font-size:12px; color:var(--gb);">En iPhone / iPad (Safari):</div>
            <ol style="padding-left:16px; font-size:11.5px; line-height:1.45; display:flex; flex-direction:column; gap:4px; margin:0;">
              <li>Toca <b>Compartir</b> en la barra de Safari.</li>
              <li>Elige <b>Agregar al inicio</b>.</li>
              <li>Confirma con <b>Agregar</b>.</li>
            </ol>
          </div>
          <div style="margin-top:8px; font-size:11px; color:rgba(246,241,230,.5); line-height:1.4; display:${(!isIOS() && !deferredPrompt)?'block':'none'};">
            Si no ves el botón, abre el menú del navegador (tres puntos) y elige <b>Instalar aplicación</b> o <b>Agregar a pantalla de inicio</b>.
          </div>
        </div>`;
    }
    let obParejaHtml = '';
    if (c.modo === 'pareja') {
      if (currentUser && currentPlanId) {
        obParejaHtml = `
          <div class="card" style="padding:12px 14px; background:rgba(126,207,160,.06); border:1px solid rgba(126,207,160,.3); border-radius:12px; margin-top:4px;">
            <div style="font-weight:600; font-size:13.5px; color:var(--cream);">Conecta a tu pareja</div>
            <div style="font-size:11.5px; color:rgba(246,241,230,.7); margin-top:2px; line-height:1.4;">Tu pareja instala la app en su teléfono y se une con este código para sincronizar en tiempo real.</div>
            <div style="margin-top:10px; padding:10px 12px; background:rgba(246,241,230,.06); border:1px dashed rgba(246,241,230,.3); border-radius:10px; text-align:center; font-family:var(--serif); font-size:18px; letter-spacing:1px; color:var(--cream); word-break:break-all;" id="obPlanCode">${currentPlanId}</div>
            <div style="display:flex; gap:8px; margin-top:10px;">
              <button class="btn ghost" id="obCopyCode" style="flex:1; margin:0;">Copiar código</button>
              <button class="btn ghost" id="obCopyLink" style="flex:1; margin:0;">Compartir enlace</button>
            </div>
          </div>`;
      } else {
        obParejaHtml = `
          <div class="card" style="padding:12px 14px; background:rgba(246,241,230,.04); border:1px solid rgba(246,241,230,.12); border-radius:12px; margin-top:4px;">
            <div style="font-weight:600; font-size:13.5px; color:var(--cream);">Conecta a tu pareja</div>
            <div style="font-size:11.5px; color:rgba(246,241,230,.7); margin-top:2px; line-height:1.4;">Para generar tu código de invitación y sincronizar con tu pareja, conéctate con Google o correo desde Ajustes. En modo local los datos quedan solo en este teléfono.</div>
          </div>`;
      }
    }
    h=`<div class="ob-step on" style="display:flex; flex-direction:column; gap:10px;">
      <div class="ob-eyebrow">¡Todo listo!</div>
      <div class="ob-h">Tu plan financiero creado</div>
      <div class="ob-p" style="margin-bottom: 10px;">Hemos creado las bases de tu presupuesto y ahorro. Así está estructurada la aplicación:</div>
      
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div class="card" style="display:flex; gap:10px; align-items:flex-start; padding:10px 12px; background:rgba(246,241,230,.09); border:1px solid rgba(246,241,230,.2); border-radius:10px; margin-bottom: 0;">
          <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:rgba(246,241,230,0.08);flex-shrink:0;">${getSVG('home', '', 'color:var(--cream);')}</div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:13.5px; color:var(--cream);">Inicio</div>
            <div style="font-size:11.5px; color:rgba(246,241,230,.7); margin-top:2px;">Tus ahorros acumulados y atajos rápidos para tu día a día.</div>
          </div>
        </div>
        
        <div class="card" style="display:flex; gap:10px; align-items:flex-start; padding:10px 12px; background:rgba(246,241,230,.09); border:1px solid rgba(246,241,230,.2); border-radius:10px; margin-bottom: 0;">
          <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:rgba(246,241,230,0.08);flex-shrink:0;">${getSVG('target', '', 'color:var(--cream);')}</div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:13.5px; color:var(--cream);">Metas</div>
            <div style="font-size:11.5px; color:rgba(246,241,230,.7); margin-top:2px;">Separa y visualiza tus metas de ahorro, con gráficos de reparto y recomendaciones.</div>
          </div>
        </div>
        
        <div class="card" style="display:flex; gap:10px; align-items:flex-start; padding:10px 12px; background:rgba(246,241,230,.09); border:1px solid rgba(246,241,230,.2); border-radius:10px; margin-bottom: 0;">
          <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:rgba(246,241,230,0.08);flex-shrink:0;">${getSVG('calendar', '', 'color:var(--cream);')}</div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:13.5px; color:var(--cream);">Mi Mes</div>
            <div style="font-size:11.5px; color:rgba(246,241,230,.7); margin-top:2px;">Confirma tu aporte mensual, añade ingresos extra y gestiona movimientos durante el mes.</div>
          </div>
        </div>
        
        <div class="card" style="display:flex; gap:10px; align-items:flex-start; padding:10px 12px; background:rgba(246,241,230,.09); border:1px solid rgba(246,241,230,.2); border-radius:10px; margin-bottom: 0;">
          <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:rgba(246,241,230,0.08);flex-shrink:0;">${getSVG('lightbulb', '', 'color:var(--cream);')}</div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:13.5px; color:var(--cream);">Aprender</div>
            <div style="font-size:11.5px; color:rgba(246,241,230,.7); margin-top:2px;">Catálogo interactivo con las plataformas reales del mercado colombiano de ahorro e inversión.</div>
          </div>
        </div>
      </div>
      ${obInstallHtml}
      ${obParejaHtml}
    </div>`;
  }
  inner.innerHTML=h;
  attachOb();
}
function attachOb(){
  const c=state.config;
  if(obStep===0){
    const btnL = $('btnObLogin');
    if(btnL) {
      btnL.onclick = async () => {
        const isCapacitor = typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
        if (isCapacitor) {
          try {
            const { GoogleAuth } = window.Capacitor.Plugins;
            await GoogleAuth.initialize({
              clientId: '486527605037-uh0u0ctmlq7tgb48d9128t8ugc3dkg8v.apps.googleusercontent.com',
              scopes: ['profile', 'email'],
            });
            const googleUser = await GoogleAuth.signIn();
            const idToken = googleUser.authentication.idToken;
            const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
            await auth.signInWithCredential(credential);
          } catch(err) {
            console.error('Error de autenticación nativa de Google:', err);
            await customAlert('Error de inicio de sesión con Google nativo: ' + (err.message || JSON.stringify(err)));
          }
        } else {
          const provider = new firebase.auth.GoogleAuthProvider();
          try {
            await auth.signInWithPopup(provider);
          } catch(err) {
            await customAlert('Error de conexión: ' + err.message);
          }
        }
      };
    }
    const btnShowEmail = $('btnShowEmailAuth');
    const emailForm = $('emailAuthForm');
    if(btnShowEmail && emailForm) {
      btnShowEmail.onclick = () => {
        emailForm.style.display = 'flex';
        btnShowEmail.style.display = 'none';
      };
    }
    const linkToggle = $('linkToggleAuthMode');
    const btnEmailSubmit = $('btnObEmailSubmit');
    let isRegisterMode = false;
    if(linkToggle && btnEmailSubmit) {
      linkToggle.onclick = (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        if(isRegisterMode) {
          btnEmailSubmit.textContent = 'Registrarse y Crear Cuenta';
          linkToggle.textContent = '¿Ya tienes cuenta? Inicia sesión';
        } else {
          btnEmailSubmit.textContent = 'Iniciar Sesión';
          linkToggle.textContent = '¿No tienes cuenta? Regístrate';
        }
      };
    }
    if(btnEmailSubmit) {
      btnEmailSubmit.onclick = async () => {
        const email = $('authEmail').value.trim();
        const password = $('authPassword').value;
        if (!email || !password) {
          await customAlert('Por favor completa todos los campos.');
          return;
        }
        if (password.length < 6) {
          await customAlert('La contraseña debe tener al menos 6 caracteres.');
          return;
        }
        btnEmailSubmit.disabled = true;
        btnEmailSubmit.textContent = 'Procesando...';
        try {
          if (isRegisterMode) {
            await auth.createUserWithEmailAndPassword(email, password);
          } else {
            await auth.signInWithEmailAndPassword(email, password);
          }
        } catch(err) {
          btnEmailSubmit.disabled = false;
          btnEmailSubmit.textContent = isRegisterMode ? 'Registrarse y Crear Cuenta' : 'Iniciar Sesión';
          if (err.code === 'auth/operation-not-allowed') {
            await customAlert('El inicio de sesión por correo no está activado en tu consola de Firebase. Actívalo en Authentication > Sign-in method.');
          } else if (err.code === 'auth/email-already-in-use') {
            await customAlert('Este correo ya está registrado. Por favor inicia sesión.');
          } else if (err.code === 'auth/invalid-credential') {
            await customAlert('Correo o contraseña incorrectos.');
          } else {
            await customAlert('Error: ' + err.message);
          }
        }
      };
    }
    const btnLoc = $('btnObLocal');
    if(btnLoc) {
      btnLoc.onclick = () => {
        localStorage.setItem('isInvited', 'false');
        obStep = 1;
        renderOb();
      };
    }
    const btnCode = $('btnObInviteCode');
    if(btnCode) {
      btnCode.onclick = async () => {
        const code = await customPrompt("Pega el código de invitación o el enlace completo:");
        if (code && code.trim()) {
          let cleanCode = code.trim();
          if (cleanCode.includes('plan=')) {
            try {
              if (cleanCode.startsWith('http') || cleanCode.startsWith('https')) {
                const url = new URL(cleanCode);
                cleanCode = url.searchParams.get('plan') || cleanCode;
              } else {
                const match = cleanCode.match(/plan=([^&]+)/);
                if (match) cleanCode = match[1];
              }
            } catch(e) {
              const match = cleanCode.match(/plan=([^&]+)/);
              if (match) cleanCode = match[1];
            }
          }
          localStorage.setItem('planId', cleanCode);
          localStorage.setItem('isInvited', 'true');
          renderOb();
          flash('Código de plan cargado ✓');
        }
      };
    }
    const btnCancel = $('btnObCancelInvite');
    if(btnCancel) {
      btnCancel.onclick = () => {
        localStorage.removeItem('planId');
        localStorage.removeItem('isInvited');
        if (window.location.search) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        renderOb();
      };
    }
  }
  if(obStep===1){
    const obModoPareja = $('obModoPareja');
    const obModoIndiv = $('obModoIndiv');
    if (obModoPareja && obModoIndiv) {
      obModoPareja.onclick=()=>{
        c.modo='pareja';
        obModoPareja.classList.add('on');
        obModoIndiv.classList.remove('on');
        const field = $('obNom2Field'); if(field) field.style.display='';
        const dField = $('obDeviceField'); if(dField) dField.style.display='';
      };
      obModoIndiv.onclick=()=>{
        c.modo='individual';
        obModoIndiv.classList.add('on');
        obModoPareja.classList.remove('on');
        const field = $('obNom2Field'); if(field) field.style.display='none';
        const dField = $('obDeviceField'); if(dField) dField.style.display='none';
      };
    }
    
    // Name input real-time sync with device profile button text
    const nom1 = $('obNom1');
    if (nom1) {
      nom1.addEventListener('input', (e) => {
        const val = e.target.value.trim() || 'Persona 1';
        if ($('obPf1')) $('obPf1').textContent = 'Soy ' + val;
      });
    }
    const nom2 = $('obNom2');
    if (nom2) {
      nom2.addEventListener('input', (e) => {
        const val = e.target.value.trim() || 'Persona 2';
        if ($('obPf2')) $('obPf2').textContent = 'Soy ' + val;
      });
    }

    const pf1Btn = $('obPf1');
    const pf2Btn = $('obPf2');
    if (pf1Btn && pf2Btn) {
      pf1Btn.onclick=()=>{
        c.perfil='p1';
        pf1Btn.classList.add('on');
        pf2Btn.classList.remove('on');
      };
      pf2Btn.onclick=()=>{
        c.perfil='p2';
        pf2Btn.classList.add('on');
        pf1Btn.classList.remove('on');
      };
    }
  }
  if(obStep===2){
    const btnS=$('obTipoSueno'),btnP=$('obTipoImprev');
    const TIPO_HINTS={
      sueno:'Una meta con fecha u objetivo concreto: viaje, carro, apartamento…',
      imprevistos:'Se llena primero cada mes, antes que las otras metas. Ideal como colchón de emergencias.'
    };
    
    const setTipo=(t)=>{
      obMetaTipo=t;
      if(btnS) btnS.classList.remove('on');
      if(btnP) btnP.classList.remove('on');
      if(t==='sueno' && btnS) btnS.classList.add('on');
      if(t==='imprevistos' && btnP) btnP.classList.add('on');
      
      const hint=$('obTipoHint'); if(hint) hint.textContent=TIPO_HINTS[t]||'';
      
      const objLabel=$('obObjLabel');
      if(objLabel) objLabel.textContent='¿Cuánto necesitas ahorrar?';
      
      const nom=$('obMetaNom');
      if(nom) nom.placeholder=t==='imprevistos'?'ej: Fondo de emergencias, Colchón…':'ej: Viaje a Europa, Carro, Apartamento…';
    };
    
    if(btnS) btnS.onclick=()=>setTipo('sueno');
    if(btnP) btnP.onclick=()=>setTipo('imprevistos');
    
    const el=$('obMetaObj');
    if(el){
      el.addEventListener('focus',()=>{
        const v=parse(el.value);
        el.value=v?String(v):'';
        el.select();
      });
      el.addEventListener('blur',()=>{
        const v=parse(el.value);
        el.value=v?fmt(v):'';
      });
    }
  }
  const obInstallBtn = $('obInstallPWA');
  if (obInstallBtn) {
    obInstallBtn.onclick = async () => {
      if (!deferredPrompt) { flash('Usa el menú del navegador para instalar'); return; }
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (e) {}
      deferredPrompt = null;
      obInstallBtn.style.display = 'none';
    };
  }
  const obCopyCode = $('obCopyCode');
  if (obCopyCode) {
    obCopyCode.onclick = async () => {
      if (!currentPlanId) return;
      try { await navigator.clipboard.writeText(currentPlanId); flash('Código copiado ✓'); }
      catch (e) { await customAlert('Copia este código a mano: ' + currentPlanId); }
    };
  }
  const obCopyLink = $('obCopyLink');
  if (obCopyLink) {
    obCopyLink.onclick = async () => {
      if (!currentPlanId) return;
      const link = window.location.origin + window.location.pathname + '?plan=' + currentPlanId;
      try { await navigator.clipboard.writeText(link); flash('Enlace de invitación copiado ✓'); }
      catch (e) { await customAlert('Comparte este código: ' + currentPlanId); }
    };
  }
}
function obSaveStep(){
  const c=state.config;
  if(obStep===1){
    if (localStorage.getItem('isInvited') !== 'true') {
      c.nombreP1=$('obNom1').value.trim()||'Persona 1';
      if(c.modo==='individual') {
        c.nombreP2='';
        c.perfil='p1';
      } else {
        c.nombreP2=$('obNom2').value.trim()||'Persona 2';
      }
    }
  }
  if(obStep===2){
    // Idempotente: quitar la meta creada antes en este onboarding para no duplicarla
    // al navegar Atrás/Continuar o re-guardar el mismo paso.
    if(obMetaCreatedId){
      state.metas=state.metas.filter(m=>m.id!==obMetaCreatedId);
      obMetaCreatedId=null;
    }
    const nom=$('obMetaNom')?$('obMetaNom').value.trim():'';
    if(nom){
      const obj=parse($('obMetaObj')?$('obMetaObj').value:'');
      const prio=metasCompartidas().length;
      const nuevaId=uid();
      obMetaCreatedId=nuevaId;
      state.metas.push({
        id:nuevaId,
        nombre:nom,
        tipo:obMetaTipo,
        saldo:0,
        objetivo:obj||0,
        aporteFijo:0,
        aportePct:0,
        fecha:null,
        prioridad:prio,
        reparto:null
      });
    }
  }
}
$('obNext').onclick=()=>{
  obSaveStep();
  const isInv = localStorage.getItem('isInvited') === 'true';
  if(isInv && obStep === 1) {
    finishOnboarding();
    return;
  }
  if(obStep>=OB_TOTAL-1){finishOnboarding();return;}
  obStep++;
  renderOb();
};
$('obBack').onclick=()=>{
  obSaveStep();
  obStep--;
  renderOb();
};
$('obSkip').onclick=()=>{
  state.config.modo='pareja';
  state.config.nombreP1='Persona 1';
  state.config.nombreP2='Persona 2';
  state.config.perfil='p1';
  state.config.nominaP1=3000000;
  state.config.nominaP2=3000000;
  state.config.gastos=2500000;
  state.config.planPareja=1000000;
  state.config.libreP1=400000;
  state.config.libreP2=400000;
  finishOnboarding();
};
function finishOnboarding(){
  state.config.onboarded=true;
  state.config.estrategia='simultaneo';
  state.config.pctPremio=20;
  state.config.modoPremio='igual';
  obMetaCreatedId=null;
  $('onb').classList.remove('on');
  save();go(0);
}

// Manejar resultado de signInWithRedirect al volver de OAuth
auth.getRedirectResult().catch(err => {
  if (err && err.code !== 'auth/no-current-user') {
    console.error('getRedirectResult error:', err);
  }
});

// Listener de estado de autenticación de Firebase
auth.onAuthStateChanged(async user => {
  currentUser = user;
  isOwner = false; planMeta = null; currentPlanId = null;

  // Cargar datos locales primero
  const raw = await store.get();
  if (raw) {
    try { state = JSON.parse(raw); } catch(e) { try { localStorage.setItem('plan2.bak', raw); } catch(_) {} console.error('Estado corrupto en auth, respaldado en plan2.bak', e); }
  }
  normalize();

  // Decidir qué pantalla mostrar de forma inmediata (render offline-first ultrarrápido)
  if (!state.config.onboarded) {
    if (user) {
      // Mantenemos obStep = 0 (mostrará el spinner de carga "Conectando...")
      // mientras se realiza la consulta/descarga remota de Firestore.
      obStep = 0;
    }
    $('onb').classList.add('on');
    renderOb();
  } else {
    go(0);
  }

  if (user) {
    try {
      let planIdToUse = getPlanId();

      // Buscamos siempre si este usuario ya tiene un plan existente en Firestore para cargarlo.
      const ownerQuery = await db.collection('meta').where('ownerUid', '==', user.uid).limit(1).get();
      if (!ownerQuery.empty) {
        planIdToUse = ownerQuery.docs[0].id;
        localStorage.setItem('planId', planIdToUse);
      } else {
        const partnerQuery = await db.collection('meta').where('partnerUid', '==', user.uid).limit(1).get();
        if (!partnerQuery.empty) {
          planIdToUse = partnerQuery.docs[0].id;
          localStorage.setItem('planId', planIdToUse);
          localStorage.setItem('isInvited', 'true');
        }
      }

      currentPlanId = planIdToUse;
      const metaDoc = await db.collection('meta').doc(currentPlanId).get();
      
      if (metaDoc.exists) {
        const data = metaDoc.data();
        isOwner = data.ownerUid === user.uid;
        if (isOwner) {
          state.config.perfil = 'p1';
          if (user.displayName && (state.config.nombreP1 === 'Persona 1' || !state.config.nombreP1)) {
            state.config.nombreP1 = user.displayName;
          }
          const updates = {
            ownerEmail: user.email || 'Usuario de Google'
          };
          if (!data.ownerName || data.ownerName === 'Usuario' || data.ownerName === 'Persona 1') {
            updates.ownerName = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
          }
          await db.collection('meta').doc(currentPlanId).update(updates).catch(e => {});
        } else {
          state.config.perfil = 'p2';
          if (user.displayName && (state.config.nombreP2 === 'Persona 2' || !state.config.nombreP2)) {
            state.config.nombreP2 = user.displayName;
          }
          localStorage.setItem('isInvited', 'true');
          const updates = {
            partnerUid: user.uid,
            partnerEmail: user.email || 'Usuario de Google'
          };
          if (!data.partnerName || data.partnerName === 'Usuario' || data.partnerName === 'Persona 2') {
            updates.partnerName = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
          }
          await db.collection('meta').doc(currentPlanId).update(updates).catch(e => {});
          if (!state.config.onboarded) {
            obStep = 2;
          }
        }
      } else {
        isOwner = true;
        state.config.perfil = 'p1';
        if (user.displayName && (state.config.nombreP1 === 'Persona 1' || !state.config.nombreP1)) {
          state.config.nombreP1 = user.displayName;
        }
        const initialOwnerName = (state.config.nombreP1 && state.config.nombreP1 !== 'Persona 1' && state.config.nombreP1 !== 'Usuario')
          ? state.config.nombreP1
          : (user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario'));
        await db.collection('meta').doc(currentPlanId).set({
          ownerUid: user.uid,
          ownerEmail: user.email || 'Usuario de Google',
          ownerName: initialOwnerName,
          partnerRole: 'editor',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await syncSaveShared(currentPlanId, state);
      }
      
      // Intentar cargar datos de Firestore
      const remote = await syncLoadShared(currentPlanId);
      if (remote) {
        const perfilLocal = state.config.perfil;
        state.config = { ...remote.config, perfil: perfilLocal };
        state.metas = (remote.metas || []).concat(state.metas.filter(m => m.tipo === 'personal'));
        state.log = remote.log || [];
        state.ingresos = remote.ingresos || [];
        state.gastos = remote.gastos || [];
        
        save();
        if (state.config.onboarded) {
          // Si el onboarding estaba visible y ahora ya cargamos el plan remoto completo,
          // quitamos la pantalla de onboarding e iniciamos
          const wasOnbVisible = $('onb').classList.contains('on');
          if (wasOnbVisible) {
            $('onb').classList.remove('on');
            go(0);
          } else {
            rerender();
          }
        } else {
          // Plan remoto cargado pero no está marcado como onboarded
          obStep = 1;
          $('onb').classList.add('on');
          renderOb();
        }
      } else {
        // No se pudo cargar remote o es un plan nuevo/vacío sin datos
        if (!state.config.onboarded) {
          obStep = 1;
          $('onb').classList.add('on');
          renderOb();
        }
      }
      syncSubscribe(currentPlanId);
    } catch (err) {
      console.error("Error al sincronizar con Firestore en inicio de sesión:", err);
      showSyncStatus("Error de sincronización (sin acceso)", true);
      // Fallback en caso de error para que no quede la pantalla bloqueada
      if (!state.config.onboarded) {
        obStep = 1;
        $('onb').classList.add('on');
        renderOb();
      }
    }
  } else {
    if (unsubscribeSync) { unsubscribeSync(); unsubscribeSync = null; }
    if (unsubscribeBolsillos) { unsubscribeBolsillos(); unsubscribeBolsillos = null; }
    if (unsubscribeMeta) { unsubscribeMeta(); unsubscribeMeta = null; }
    currentPlanId = null;
    isOwner = false;
    planMeta = null;
  }
});

// Helper para detectar iOS / iPadOS
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Manejo de la instalación de PWA
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = $('bInstallPWA');
  if (btn) btn.style.display = 'block';
});

// Service Worker: SOLO en navegador/PWA. En Capacitor nativo se desactiva
// (los assets ya van bundled) y se purga cualquier SW/cache viejo, que de otro
// modo congela el código viejo dentro del WebView.
const __inCapacitor = typeof window.Capacitor !== 'undefined'
  && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

if (__inCapacitor) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(rs => rs.forEach(r => r.unregister()))
      .catch(() => {});
  }
  if (window.caches) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
  }
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('Service Worker registrado con éxito en el scope:', reg.scope))
      .catch(err => console.error('Error al registrar el Service Worker:', err));
  });
}

// Botón atrás hardware Android (Capacitor)
if (__inCapacitor) {
  const { App: CapApp } = window.Capacitor.Plugins;
  CapApp.addListener('backButton', () => {
    if (actionSheetOpen) { closeActionMenu(); return; }
    const onb = $('onb');
    if (onb && onb.classList.contains('on')) {
      if (obStep > 1) { obSaveStep(); obStep--; renderOb(); }
      return;
    }
    if ($('sf') && $('sf').classList.contains('on')) {
      mForm = null; go(1); return;
    }
    if ($('sd') && $('sd').classList.contains('on')) {
      go(1); return;
    }
    if ($('sh') && $('sh').classList.contains('on')) {
      go(2); return;
    }
    if (curTab !== 0) { go(0); return; }
    CapApp.minimizeApp();
  });
}
