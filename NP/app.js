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
  return [
    {id:'inversion',nombre:'Inversión',tipo:'invertir',saldo:0,objetivo:0,aporteFijo:0,aportePct:0,fecha:null,prioridad:9,
      reparto:[{n:'Renta variable',pct:50},{n:'Renta fija',pct:30},{n:'Reserva',pct:20}]}
  ];
}
function metasPersonales(){
  return [
    {id:'personal-p1',nombre:'Personal',tipo:'personal',dueno:'p1',sistema:true,saldo:0,aportes:[]},
    {id:'personal-p2',nombre:'Personal',tipo:'personal',dueno:'p2',sistema:true,saldo:0,aportes:[]}
  ];
}

let state={config:{},metas:[],log:[],ingresos:[],gastos:[]};
let curTab=0, detailKey=null, firstFlow=true;
let mForm=null; // estado del formulario de meta en edición
let especialesPendientes=[]; // ingresos especiales pendientes de aplicar este cierre
let selectedMonth=''; // mes seleccionado en cierre de mes (inicializado dinámicamente)

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
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}
function flash(m){const t=$('toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),1900);}
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
        <button class="btn gold" id="modal-btn-ok">Aceptar</button>
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
function showSyncStatus(msg, isError = false) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.background = isError ? '#7a2222' : 'var(--green)';
  el.style.display = msg ? 'block' : 'none';
}
function canEditShared() {
  if (!currentUser) return true;
  if (isOwner) return true;
  return planMeta && planMeta.partnerRole !== 'viewer';
}
const MONTHS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtMes(ym){if(!ym)return'';const[y,m]=ym.split('-');return MONTHS[(+m)-1]+' '+y;}
function fmtFecha(d){if(!d)return'';const p=d.split('-');return p[2]+' '+MONTHS[(+p[1])-1]+' '+p[0];}
function curMonth(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function monthsUntil(ym){const[y,mo]=ym.split('-').map(Number);const n=new Date();return Math.max(0,(y-n.getFullYear())*12+(mo-n.getMonth()-1));}
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
                if (m) m.saldo += dist[id];
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

function syncSubscribe(planId) {
  if (unsubscribeSync) unsubscribeSync();
  unsubscribeSync = db.collection('planes').doc(planId)
    .collection('shared').doc('data')
    .onSnapshot(doc => {
      if (!doc.exists) return;
      const remote = doc.data();
      const perfilLocal = state.config.perfil;
      const personalesLocales = state.metas.filter(m => m.tipo === 'personal');
      const remoteMetas = remote.metas || [];
      
      state.config = { ...remote.config, perfil: perfilLocal };
      state.metas = remoteMetas.concat(personalesLocales.filter(pl => !remoteMetas.some(rm => rm.id === pl.id)));
      state.log = remote.log || [];
      state.ingresos = remote.ingresos || [];
      state.gastos = remote.gastos || [];
      rerender();
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
        save();
      }
      rerenderPlanKeepOpen();
      rerender();
    });

  if (unsubscribeBolsillos) unsubscribeBolsillos();
  unsubscribeBolsillos = db.collection('planes').doc(planId).collection('bolsillos')
    .onSnapshot(snapshot => {
      snapshot.forEach(doc => {
        const remoteBolsillo = doc.data().meta;
        if (remoteBolsillo && remoteBolsillo.dueno) {
          const idx = state.metas.findIndex(m => m.tipo === 'personal' && m.dueno === remoteBolsillo.dueno);
          if (idx !== -1) {
            state.metas[idx].saldo = remoteBolsillo.saldo;
            state.metas[idx].aportes = remoteBolsillo.aportes || [];
            state.metas[idx].nombre = remoteBolsillo.nombre || state.metas[idx].nombre;
          }
        }
      });
      rerender();
    });
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
  if(raw){try{state=JSON.parse(raw);}catch(e){}}
  normalize();
}
async function save(){
  const ok=await store.set(JSON.stringify(state));
  if(!ok)$('banner').style.display='block';
  
  if (currentUser && currentPlanId && canEditShared()) {
    syncSaveShared(currentPlanId, state)
      .then(() => {
        showSyncStatus('Sincronizado ✓');
        setTimeout(() => showSyncStatus(''), 2000);
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
            setTimeout(() => showSyncStatus(''), 2000);
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
  return metasCompartidas().concat([metaPersonal(state.config.perfil)]).concat(metasIndividuales(state.config.perfil));
}
function tipoLabel(t){return t==='imprevistos'?'Imprevistos':t==='invertir'?'Inversión':t==='sueno'?'Sueño':'Personal';}

/* ---------- motor de cálculo (preserva la esencia) ---------- */
function gastosFijosTotal(){return state.config.gastos||0;}
function aportesFijosTotal(){return metasCompartidas().filter(m=>m.tipo!=='imprevistos').reduce((s,m)=>s+(m.aporteFijo||0),0);}
function sumaPct(){
  const c=state.config;
  if(c.estrategia==='cascada')return 0;
  return metasCompartidas().filter(m=>c.estrategia==='simultaneo'||m.tipo!=='imprevistos').reduce((s,m)=>s+(m.aportePct||0),0);
}
function repartoFijo(){const c=state.config;return c.planPareja+c.libreP1+c.libreP2;}
function computeBase(){const c=state.config;return c.soloAhorroDirecto ? (c.ahorroDirecto||0) : (c.nominaP1+c.nominaP2-gastosFijosTotal()-repartoFijo());}
function avgVar(){if(!state.log.length)return 0;return state.log.reduce((s,e)=>s+e.p1+e.p2,0)/state.log.length;}
function computeTotal(){
  const p = state.config.perfil;
  const mp = metaPersonal(p);
  return metasCompartidas().reduce((s,m)=>s+m.saldo,0) + (mp?mp.saldo:0) + metasIndividuales(p).reduce((s,m)=>s+m.saldo,0);
}
function emergencias(){return state.metas.filter(m=>m.tipo==='imprevistos').sort((a,b)=>(a.prioridad||0)-(b.prioridad||0));}
function emergenciaPrincipal(){return emergencias()[0]||null;}
function inversionAbierta(){return state.metas.find(m=>m.tipo==='invertir');}
function getMetaPrioritaria(){
  const comp=metasCompartidas();
  const sorted=comp.slice().sort((a,b)=>(a.prioridad||0)-(b.prioridad||0));
  return sorted.find(m=>m.objetivo>0&&m.saldo<m.objetivo)||null;
}

function premioSplitFactor(p,e){
  const c=state.config;
  if(c.modo==='individual')return p==='p1'?1:0;
  if(c.modoPremio==='igual')return 0.5;
  if(c.modoPremio==='proporcional'){if(!e)return 0.5;const sum=e.p1+e.p2;if(sum===0)return 0.5;return p==='p1'?e.p1/sum:e.p2/sum;}
  return p==='p1'?c.pctPremioP1/100:(100-c.pctPremioP1)/100;
}

/* Reparto del ahorro entre metas compartidas.
   Orden: (1) aportes fijos en $ de cada meta (compromisos recurrentes, primero),
          (2) prioritaria primero si es secuencial (recibe el remanente tras fijos),
          (3) cada meta toma su % del resto (post-fijos y post-prioritaria),
          (4) lo que sobre -> inversión abierta. */
function distribuirAhorro(monto, esEspecial = false){
  const c=state.config,res={};
  state.metas.forEach(m=>res[m.id]=0);
  if(monto<=0)return res;
  let rem=monto;
  const comp=metasCompartidas();

  if(c.estrategia==='cascada'){
    const sorted=comp.slice().sort((a,b)=>(a.prioridad||0)-(b.prioridad||0));
    for(let i=0;i<sorted.length;i++){
      const m=sorted[i];
      if(m.objetivo>0){
        const falta=Math.max(0,m.objetivo-(m.saldo+res[m.id]));
        const add=Math.min(rem,falta);res[m.id]+=add;rem-=add;
      }else{
        res[m.id]+=rem;rem=0;
      }
      if(rem<=0.5)break;
    }
    if(rem>0.5){
      const inv=inversionAbierta();
      if(inv)res[inv.id]+=rem;
      else{const e=emergenciaPrincipal();if(e)res[e.id]+=rem;}
    }
    return res;
  }

  // (1) aportes fijos en $ (se cubren de primero para evitar desatender compromisos mensuales recurrentes)
  if(!esEspecial){
    comp.filter(m=>(c.estrategia==='simultaneo'||m.tipo!=='imprevistos')&&(m.aporteFijo||0)>0).forEach(m=>{
      let add=m.aporteFijo;
      if(m.objetivo){const falta=Math.max(0,m.objetivo-(m.saldo+res[m.id]));add=Math.min(add,falta);}
      add=Math.min(add,rem);res[m.id]+=add;rem-=add;
    });
    if(rem<=0.5)return res;
  }

  // (2) prioritaria primero si es secuencial
  if(c.estrategia==='secuencial'){
    const prio=getMetaPrioritaria();
    if(prio){
      const falta=Math.max(0,prio.objetivo-(prio.saldo+res[prio.id]));
      const add=Math.min(rem,falta);res[prio.id]+=add;rem-=add;
    }
    if(rem<=0.5)return res;
  }

  // (3) cada meta toma su % del resto (base fija = remanente tras fijos y prioritario)
  const baseRem=rem;
  comp.filter(m=>(m.aportePct||0)>0&&(c.estrategia==='simultaneo'||m.tipo!=='imprevistos')).forEach(m=>{
    let add=baseRem*m.aportePct/100;
    if(m.objetivo){const falta=Math.max(0,m.objetivo-(m.saldo+res[m.id]));add=Math.min(add,falta);}
    add=Math.min(add,rem);res[m.id]+=add;rem-=add;
  });
  if(rem<=0.5)return res;

  // (4) sobrante -> inversión abierta
  const inv=inversionAbierta();
  if(inv)res[inv.id]+=rem;
  else{const e=emergenciaPrincipal();if(e)res[e.id]+=rem;}
  return res;
}

function distribuirAhorroIndividual(perfil, monto, esEspecial = false) {
  const res = {};
  const indivs = metasIndividuales(perfil);
  indivs.forEach(m => res[m.id] = 0);
  if (monto <= 0 || indivs.length === 0) return { dist: res, rem: monto };
  
  let rem = monto;
  
  // 1. Aportes fijos
  if (!esEspecial) {
    indivs.filter(m => (m.aporteFijo||0) > 0).forEach(m => {
      let add = m.aporteFijo;
      if (m.objetivo) {
        const falta = Math.max(0, m.objetivo - (m.saldo + res[m.id]));
        add = Math.min(add, falta);
      }
      add = Math.min(add, rem);
      res[m.id] += add;
      rem -= add;
    });
    if (rem <= 0.5) return { dist: res, rem };
  }
  
  // 2. Aportes porcentuales
  const baseRem = rem;
  indivs.filter(m => (m.aportePct||0) > 0).forEach(m => {
    let add = (baseRem * m.aportePct) / 100;
    if (m.objetivo) {
      const falta = Math.max(0, m.objetivo - (m.saldo + res[m.id]));
      add = Math.min(add, falta);
    }
    add = Math.min(add, rem);
    res[m.id] += add;
    rem -= add;
  });
  
  return { dist: res, rem };
}


/* ---------- navegación ---------- */
const RENDER=[renderInicio,renderMetas,renderCerrar,renderFlujo,renderPlan];
function go(t){
  curTab=t;detailKey=null;
  if(t===2 && !selectedMonth) {
    selectedMonth = curMonth();
  }
  $('mainnav').classList.remove('hide');
  document.querySelectorAll('.nt').forEach((b,i)=>b.classList.toggle('on',i===t));
  ['s0','s1','s2','s3','s4','sd','sf','sh'].forEach(id=>$(id).classList.remove('on'));
  $('s'+t).classList.add('on');
  RENDER[t]();
  $('s'+t).scrollTop=0;
}
function rerender(){const sec=$('s'+curTab);const st=sec?sec.scrollTop:0;RENDER[curTab]();if(sec)sec.scrollTop=st;}
$('mainnav').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(b)go(+b.dataset.t);});
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
function renderInicio(){
  const c=state.config;
  const totalCompartidas = metasCompartidas().reduce((s,m)=>s+m.saldo,0);
  const totalIndividuales = metasIndividuales(c.perfil).reduce((s,m)=>s+m.saldo,0);
  const prio=getMetaPrioritaria();
  const est=computeBase()+avgVar()*(1-c.pctPremio/100);
  let faseTxt,proyTxt;
  if(prio){
    const m=est>0?Math.ceil((prio.objetivo-prio.saldo)/est):'—';
    faseTxt='Llenando '+prio.nombre;proyTxt=(m==='—'?'—':'Listo en ~'+m+' mes'+(m!==1?'es':''));
  }else{
    faseTxt='Ahorrando e invirtiendo';proyTxt='~'+fmt(est)+'/mes al plan';
  }
  
  const headerHtml = c.modo === 'individual'
    ? `<header><div class="ey">${c.nombreP1}</div><h1>Mi plan</h1></header>`
    : `<header><div class="ey">${c.nombreP1} &amp; ${c.nombreP2}</div><h1>Nuestro plan</h1></header>`;

  const indivs = metasIndividuales(c.perfil);
  let indivsHtml = '';
  if (indivs.length > 0) {
    indivsHtml = `<div class="stitle" style="margin-top:16px;">Mis metas individuales</div>` +
      indivs.map(m => heroMeta(m)).join('');
  }

  const labelText = c.modo === 'individual' ? 'Acumulado en mis metas' : 'Acumulado en metas compartidas';
  let individualSavingsHtml = '';
  if (c.modo !== 'individual' && totalIndividuales > 0) {
    individualSavingsHtml = `
      <div style="margin-top:10px; padding-top:8px; border-top:1px dashed rgba(246,241,230,.12); display:flex; justify-content:space-between; align-items:center;">
        <span class="muted sm" style="font-size:12px;">Ahorros individuales</span>
        <span class="num" style="font-size:16px; color:var(--cream);">${fmt(totalIndividuales)}</span>
      </div>
    `;
  }

  $('r0').innerHTML=`
${headerHtml}
<div class="card dark"><div class="k">¿Cómo vamos?</div><div class="num big">${fmt(totalCompartidas)}</div>
  <div class="muted sm" style="margin-top:4px">${labelText}</div>
  ${individualSavingsHtml}
  <div class="row2" style="margin-top:14px;border-top:1px solid rgba(246,241,230,.18);padding-top:12px">
    <div><div class="k" style="color:var(--gb)">Etapa</div><div class="num" style="font-size:16px;color:var(--cream)">${faseTxt}</div></div>
    <div><div class="k" style="color:var(--gb)">Proyección</div><div class="num" style="font-size:15px;color:var(--cream);line-height:1.2">${proyTxt}</div></div></div></div>
${drawSavingsDonut()}
${indivsHtml}
${drawFixedBudgetCard()}
${drawSavingsHistoryCard()}`;
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
  const total = computeTotal();
  const perfil = state.config.perfil;
  const metasConSaldo = state.metas.filter(m => {
    if (m.dueno && m.dueno !== perfil && m.tipo !== 'personal') return false;
    return true;
  }).map(m => {
    let nombre = m.nombre;
    if (m.tipo === 'personal') {
      nombre = m.dueno === perfil ? 'Mi bolsillo' : `Bolsillo de ${perfilNombre(m.dueno)}`;
    } else if (m.dueno) {
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

  if (total === 0 || metasConSaldo.length === 0) {
    return `<div class="card dark" style="padding:18px 16px;">
      <div class="k" style="margin-bottom:12px;">Distribución de Ahorros</div>
      <div style="display:flex; align-items:center; gap:20px;">
        <div style="width:90px; height:90px; flex-shrink:0;">
          <svg viewBox="0 0 100 100" style="width:100%; height:100%;">
            <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(246,241,230,.08)" stroke-width="8" />
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

  metasConSaldo.forEach(m => {
    const pct = (m.saldo / total) * 100;
    let color = '#2f5a44';
    if (m.tipo === 'imprevistos') color = '#2f5a44';
    else if (m.tipo === 'sueno') color = '#c08a2d';
    else if (m.tipo === 'invertir') color = '#5b9aa0';
    else if (m.tipo === 'personal') {
      color = m.dueno === 'p1' ? '#c87a53' : '#a36a84';
    } else if (m.dueno) {
      color = m.dueno === 'p1' ? '#d69677' : '#be8ba3';
    }
    
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
    svgCircles += `<circle cx="50" cy="50" r="35" fill="none" stroke="${seg.color}" stroke-width="8" stroke-dasharray="${C} ${C}" stroke-dashoffset="${offset}" transform="rotate(${seg.startAngle} 50 50)" stroke-linecap="butt" />`;
  });

  const legend = segments.map(seg => `
    <div style="display:flex; align-items:center; justify-content:space-between; font-size:12.5px; color:rgba(246,241,230,.85)">
      <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${seg.color}; flex-shrink:0;"></span>
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;">${seg.nombre}</span>
      </div>
      <div style="font-variant-numeric:tabular-nums; margin-left:8px; flex-shrink:0;">
        <b style="color:var(--cream);">${fmtK(seg.saldo)}</b>
        <span style="font-size:10px; color:rgba(246,241,230,.45); margin-left:2px;">(${Math.round(seg.pct)}%)</span>
      </div>
    </div>
  `).join('');

  return `<div class="card dark" style="padding:18px 16px;">
    <div class="k" style="margin-bottom:12px;">Distribución de Ahorros</div>
    <div style="display:flex; align-items:center; gap:20px;">
      <div style="width:96px; height:96px; flex-shrink:0;">
        <svg viewBox="0 0 100 100" style="width:100%; height:100%; overflow:visible;">
          ${svgCircles}
          <text x="50" y="47" text-anchor="middle" font-family="var(--sans)" font-size="6.5" fill="rgba(246,241,230,.5)" font-weight="700" letter-spacing="0.05em">TOTAL</text>
          <text x="50" y="57" text-anchor="middle" font-family="var(--serif)" font-size="11.5" fill="var(--cream)" font-weight="600">${fmtK(total)}</text>
        </svg>
      </div>
      <div style="flex:1; display:flex; flex-direction:column; gap:7px; overflow:hidden;">
        ${legend}
      </div>
    </div>
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
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-p1" style="width:7px; height:7px; border-radius:50%;"></span>Dinero libre</div>
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
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-pp" style="width:7px; height:7px; border-radius:50%;"></span>Citas y gustos pareja</div>
        <b style="color:var(--cream);">${fmt(c.planPareja)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pPP)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-p1" style="width:7px; height:7px; border-radius:50%;"></span>Libre de ${c.nombreP1}</div>
        <b style="color:var(--cream);">${fmt(c.libreP1)} <span style="font-size:10px; color:rgba(246,241,230,.45); font-weight:normal; margin-left:3px;">(${Math.round(pL1)}%)</span></b>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; color:rgba(246,241,230,.85)">
        <div style="display:flex; align-items:center; gap:6px;"><span class="dot dot-p2" style="width:7px; height:7px; border-radius:50%;"></span>Libre de ${c.nombreP2}</div>
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

function drawSavingsHistoryCard() {
  if (!state.log || state.log.length === 0) {
    return `<div class="card dark" style="padding:18px 16px; border: 1px dashed rgba(246,241,230,.15); background: transparent;">
      <div class="k" style="color:rgba(246,241,230,.5)">Evolución del Ahorro</div>
      <div style="font-size:12.5px; color:rgba(246,241,230,.5); line-height:1.45; text-align:center; padding:12px 6px;">
        El gráfico de ahorro mensual se activará cuando cierren su primer mes en <b>Aportar al plan</b>.
      </div>
    </div>`;
  }

  const historyData = state.log.slice(0, 6).reverse().map(e => {
    let ahorro = 0;
    if (e.reparto && typeof e.reparto.ahorro === 'number') {
      ahorro = e.reparto.ahorro + (e.especiales ? e.especiales.reduce((s, ep) => s + ep.monto, 0) : 0);
    } else {
      const base = computeBase();
      const comb = e.p1 + e.p2;
      ahorro = base + comb * (1 - state.config.pctPremio / 100);
    }
    return {
      mesLabel: fmtMes(e.mes),
      ahorro: ahorro
    };
  });

  const maxVal = Math.max(...historyData.map(d => d.ahorro), 500000);
  const N = historyData.length;
  
  const graphWidth = 250;
  const startX = 35;
  const startY = 90;
  const colWidth = graphWidth / N;
  const barWidth = Math.min(22, colWidth * 0.45);

  let barElements = '';
  historyData.forEach((d, i) => {
    const barHeight = Math.max(4, (d.ahorro / maxVal) * 65);
    const x = startX + i * colWidth + (colWidth - barWidth) / 2;
    const y = startY - barHeight;

    barElements += `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#barGrad)" rx="3" ry="3" />
      <text x="${x + barWidth/2}" y="${y - 5}" text-anchor="middle" font-family="var(--sans)" font-size="8.5" fill="var(--cream)" font-weight="600">${fmtK(d.ahorro)}</text>
      <text x="${x + barWidth/2}" y="${startY + 15}" text-anchor="middle" font-family="var(--sans)" font-size="8" fill="rgba(246,241,230,.4)" font-weight="600">${d.mesLabel.split(' ')[0]}</text>
    `;
  });

  return `<div class="card dark" style="padding:18px 16px;">
    <div class="k" style="margin-bottom:14px;">Evolución del Ahorro</div>
    <div style="height:120px; width:100%;">
      <svg viewBox="0 0 300 120" style="width:100%; height:100%; overflow:visible;">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--gb)" />
            <stop offset="100%" stop-color="var(--green)" />
          </linearGradient>
        </defs>
        <line x1="${startX - 10}" y1="${startY}" x2="${startX + graphWidth + 10}" y2="${startY}" stroke="rgba(246,241,230,.12)" stroke-width="1" />
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
  
  // 1. Obtener aporte mensual según distribución de ahorro estimado
  const est = Math.max(0, computeBase() + avgVar() * (1 - state.config.pctPremio / 100));
  const dist = distribuirAhorro(est);
  let aporteMes = dist[m.id] || 0;
  
  // 2. Si no hay aporte mensual por flujo distribuido, pero la meta tiene un aporte fijo, usamos ese
  if (aporteMes <= 0 && m.aporteFijo > 0) {
    aporteMes = m.aporteFijo;
  }
  
  if (aporteMes <= 0) return null;
  const meses = Math.ceil(falta / aporteMes);
  return meses;
}

function metaSub(m){
  if(m.tipo==='personal')return 'Tu premio + libre · privado de tu teléfono';
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
    if((m.aporteFijo||0)>0||(m.aportePct||0)>0){
      s.push('<span style="color:var(--gb);font-weight:600">Aportes liberados (llena)</span>');
    } else {
      s.push('completada');
    }
  } else {
    const prio = state.config.estrategia==='secuencial' ? getMetaPrioritaria() : null;
    const isPrio = prio && prio.id === m.id;
    if(!isPrio){
      if((m.aporteFijo||0)>0)s.push('+'+fmtK(m.aporteFijo)+'/mes');
      if((m.aportePct||0)>0)s.push('+'+m.aportePct+'% del resto');
    }
  }

  if(m.tipo==='invertir'&&!m.objetivo&&!(m.aporteFijo||0)&&!(m.aportePct||0)){
    const sp=sumaPct();
    const rest=Math.max(0,100-sp);
    s.push(`recibe el sobrante (${rest}% del resto)`);
  }

  // Opción 1: Proyección inline al final del subtítulo
  if (m.objetivo && !isCompleted) {
    const mRestantes = calcularTiempoRestante(m);
    if (mRestantes !== null) {
      s.push(`<span style="color:var(--gb);font-weight:600">~${mRestantes} mes${mRestantes !== 1 ? 'es' : ''}</span>`);
    }
  }

  return s.join(' · ')||'sin meta';
}
function renderMetas(){
  const card=(m)=>{
    const obj=m.objetivo||0,pct=obj?Math.min(100,m.saldo/obj*100):null;
    const isPersonal = m.tipo === 'personal';
    const dragHandle = isPersonal ? '' : `<span class="drag-handle" style="cursor:grab;padding:8px 0;font-size:20px;color:var(--gs);touch-action:none;user-select:none;margin-right:4px">☰</span>`;

    return `<div class="card tap" data-mid="${m.id}" style="display:flex;align-items:center;gap:6px">
      ${dragHandle}
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="k" style="margin:0">${m.nombre}</span>${m.tipo!=='personal'?'<span class="pill">'+tipoLabel(m.tipo)+'</span>':''}</div>
        <div class="num med">${fmt(m.saldo)}</div>
        ${pct!=null?`<div class="bar light" style="margin:8px 0 4px"><i style="width:${pct.toFixed(1)}%"></i></div>`:''}
        <div class="muted" style="font-size:12px">${metaSub(m)}</div>
      </div><span class="chev">›</span></div>`;
  };
  const isIndiv = state.config.modo === 'individual';
  let h=isIndiv
    ? '<header><div class="ey">Mis</div><h1>Metas</h1></header>'
    : '<header><div class="ey">Nuestras</div><h1>Metas</h1></header>';

  const sp=sumaPct();
  if(sp>0){
    const over=sp>100;
    const inv=inversionAbierta();
    const invName=inv?inv.nombre:'la inversión';
    h+=`<div class="card" style="background:${over?'rgba(122,34,34,.12)':'rgba(192,138,45,.1)'};border-color:${over?'#7a2222':'rgba(192,138,45,.35)'}">
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="k" style="margin:0;color:${over?'#ff6b6b':'var(--gb)'}">Reparto del ahorro restante (%)</span><span class="num" style="font-size:18px;color:${over?'#ff6b6b':'var(--gb)'}">${sp}%</span></div>
      <div class="hint" style="margin-top:6px;color:rgba(246,241,230,.7)">${over?'Te pasaste de 100%: las últimas metas recibirán menos de lo que indica su %.':(sp<100?`El ${100-sp}% restante va a ${invName}.`:'Repartes el 100%; la inversión solo recibe lo que no alcance otra meta.')}</div></div>`;
  }
  h+=`<div class="stitle" style="display:flex;align-items:center;gap:6px">
    ${isIndiv ? 'Mis metas de ahorro' : 'Metas compartidas'}
    <span id="helpPrioBtn" style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:rgba(246,241,230,.15);color:var(--cream);font-size:9.5px;font-weight:bold;cursor:pointer;user-select:none">?</span>
  </div>
  <div id="prioHint" class="hint" style="display:none;background:rgba(192,138,45,.08);border:1px solid rgba(192,138,45,.2);border-radius:10px;padding:10px 12px;margin:2px 0 10px;color:rgba(246,241,230,.8);line-height:1.45">
    El orden de esta lista define la prioridad de ahorro si usan la estrategia <b>Prioritaria primero</b> o <b>En cascada</b>. Mantén presionado y arrastra ☰ para ordenarlas.
  </div>`;
  h+='<div id="sharedMetasContainer">';
  metasCompartidas().sort((a,b)=>(a.prioridad||0)-(b.prioridad||0)).forEach(m=>h+=card(m));
  h+='</div>';
  
  if (state.config.modo === 'pareja') {
    const indivs = metasIndividuales(state.config.perfil);
    if (indivs.length > 0) {
      h += `<div class="stitle">Mis metas individuales (Privadas)</div>`;
      indivs.forEach(m => h += card(m));
    }
  }
  
  h+='<div class="stitle">Personal</div>'+card(metaPersonal(state.config.perfil));
  h+=`<div style="height:72px;flex-shrink:0;"></div>
  <div style="position:sticky;bottom:0;background:linear-gradient(to top, var(--gd) 85%, transparent);padding:20px 0 16px;z-index:20;margin-top:auto">
    ${canEditShared() ? '<button class="btn" id="addMeta" style="margin:0">+ Nueva meta</button>' : '<div style="text-align:center;font-size:12.5px;color:rgba(246,241,230,.7);font-weight:600;background:rgba(246,241,230,.06);border:1px solid rgba(246,241,230,.15);border-radius:10px;padding:12px;">Rol: Lector (Solo Lectura)</div>'}
  </div>`;
  $('r1').innerHTML=h;

  const helpBtn = $('helpPrioBtn');
  if(helpBtn){
    helpBtn.onclick=(e)=>{
      e.stopPropagation();
      const hint = $('prioHint');
      if(hint) hint.style.display = hint.style.display==='none'?'block':'none';
    };
  }
  $('r1').querySelectorAll('[data-mid]').forEach(el=>el.onclick=(e)=>{
    if(e.target.closest('.drag-handle') || e.target.closest('#helpPrioBtn')) return;
    if(el.classList.contains('dragged')){
      el.classList.remove('dragged');
      return;
    }
    openDetail(el.dataset.mid);
  });
  if ($('addMeta')) $('addMeta').onclick=()=>openMetaForm(null);
  initReorder();
}

function initReorder(){
  if (!canEditShared()) return;
  const container=$('sharedMetasContainer');
  if(!container)return;
  let draggedEl=null,startY=0,hasDragged=false;

  const onPointerMove=e=>{
    if(!draggedEl)return;
    const deltaY=e.clientY-startY;
    if(Math.abs(deltaY)>5){
      hasDragged=true;
      draggedEl.classList.add('dragged');
    }
    const siblings=[...container.querySelectorAll('.card.tap:not(.dragging)')];
    const nextSibling=siblings.find(sibling=>{
      const box=sibling.getBoundingClientRect();
      return e.clientY<box.top+box.height/2;
    });
    if(nextSibling){
      container.insertBefore(draggedEl,nextSibling);
    }else{
      container.appendChild(draggedEl);
    }
  };

  const onPointerUp=e=>{
    if(!draggedEl)return;
    document.removeEventListener('pointermove',onPointerMove);
    document.removeEventListener('pointerup',onPointerUp);
    document.removeEventListener('pointercancel',onPointerUp);

    draggedEl.classList.remove('dragging');
    if(hasDragged){
      const cards=[...container.querySelectorAll('.card.tap')];
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
    const card=handle.closest('.card.tap');
    if(!card)return;
    draggedEl=card;
    startY=e.clientY;
    hasDragged=false;
    card.classList.add('dragging');
    
    document.addEventListener('pointermove',onPointerMove);
    document.addEventListener('pointerup',onPointerUp);
    document.addEventListener('pointercancel',onPointerUp);
    
    e.preventDefault();
  });
}

/* ---------- formulario único de meta ---------- */
function openMetaForm(id){
  if (!canEditShared()) {
    flash('No tienes permisos de editor');
    return;
  }
  const existing=id?metaById(id):null;
  mForm=existing?JSON.parse(JSON.stringify(existing)):{id:uid(),nombre:'',tipo:'sueno',saldo:0,objetivo:0,aporteFijo:0,aportePct:0,fecha:null,prioridad:metasCompartidas().length,reparto:null};
  detailKey=null;
  ['s0','s1','s2','s3','s4','sd','sf','sh'].forEach(x=>$(x).classList.remove('on'));
  $('sf').classList.add('on');$('sf').scrollTop=0;
  $('mainnav').classList.add('hide');
  renderMetaForm(!!existing);
}
function renderMetaForm(editing){
  const m=mForm;
  const tipoBtns=`<div class="seg">
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
    fields=`<div class="card"><label class="lbl">¿Cuánto quieren tener guardado?</label>
      <input class="amt money" id="fObj" inputmode="numeric" value="${m.objetivo?fmt(m.objetivo):''}" placeholder="$0">
      ${showAporte ? `<label class="lbl" style="margin-top:14px">Aporte al mes (opcional)</label>${aporteFields()}` : `<div class="hint" style="margin-top:14px">Estrategia actual: Prioritaria primero. Esta es la meta de máxima prioridad y se llena de primero automáticamente.</div>`}
      <div class="deriv" id="fDeriv" style="margin-top:14px"></div></div>`;
  }else if(m.tipo==='invertir'){
    fields=`<div class="card"><label class="lbl">Aporte al mes (opcional)</label>
      ${aporteFields()}
      <div class="deriv" id="fDeriv" style="margin-top:14px"></div>
      <div class="hint">Una inversión no “se completa”: recibe lo que defines y, además, absorbe lo que sobre del ahorro tras las demás metas.</div></div>
      <details ${m.reparto&&m.reparto.length?'open':''}><summary>Repartir por dentro (opcional)</summary>
        <div class="dpad" id="repWrap">${repartoEditor()}</div></details>`;
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
        <span style="color:var(--gs); font-size:12px;">▼</span>
      </div>
      ${showAporte ? `<label class="lbl" style="margin-top:14px">Aporte al mes (opcional)</label>${aporteFields()}` : `<div class="hint" style="margin-top:14px">Estrategia actual: Prioritaria primero. Esta es la meta de máxima prioridad y se llena de primero automáticamente.</div>`}
      <div class="deriv" id="fDeriv"></div>
    </div>`;
  }
  $('rf').innerHTML=`
<button class="bk" id="fBack">‹ Cancelar</button>
<header style="padding-top:6px"><div class="ey">${editing?'Editar':'Nueva'} meta</div><h1>${editing?m.nombre||'Meta':'¿Qué quieren lograr?'}</h1></header>
<div class="card"><label class="lbl">Nombre</label><input class="sf" id="fNom" value="${(m.nombre||'').replace(/"/g,'&quot;')}" placeholder="Viaje a Japón, Carro, Casa…"></div>
${m.tipo!=='personal'?'<div class="stitle" style="color:rgba(246,241,230,.65)">¿Para qué es?</div><div class="card">'+tipoBtns+'</div>':''}
${visHtml}
${fields}
<div class="card"><label class="lbl">¿Ya tienes algo guardado aquí? (opcional)</label>
  <input class="amt money" id="fSaldo" inputmode="numeric" value="${m.saldo?fmt(m.saldo):''}" placeholder="$0"></div>
<button class="btn" id="fSave">${editing?'Guardar cambios':'Crear meta'}</button>
${editing&&m.tipo!=='imprevistos'?'<button class="btn danger" id="fDel">Eliminar meta</button>':''}`;
  attachMetaForm(editing);
  updateDeriv();
}
function aporteFields(){
  const m=mForm;
  return `<input class="amt money" id="fFijo" inputmode="numeric" value="${m.aporteFijo?fmt(m.aporteFijo):''}" placeholder="$0 fijo / mes">
    <label class="lbl" style="margin-top:12px">Además, un % de lo que sobra (opcional)</label>
    <input class="sf" id="fPct" inputmode="numeric" value="${m.aportePct||''}" placeholder="0 %">
    <div class="hint">Puedes usar uno, el otro o los dos: primero se aparta el monto fijo y, del resto que queda, esta meta toma ese %.</div>`;
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
  if(m.tipo==='invertir')m.objetivo=0;
  if($('fFechaTrigger'))m.fecha=$('fFechaTrigger').dataset.val||null;
  if($('fFijo'))m.aporteFijo=parse($('fFijo').value);
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
}
function updateDeriv(){
  const el=$('fDeriv');if(!el)return;
  const c=state.config;
  const p=c.perfil;
  const obj=$('fObj')?parse($('fObj').value):0;const fecha=$('fFechaTrigger')?$('fFechaTrigger').dataset.val:'';
  const fijo=$('fFijo')?parse($('fFijo').value):0;
  const pct=$('fPct')?Math.min(100,parse($('fPct').value)):0;
  const saldo=$('fSaldo')?parse($('fSaldo').value):0;

  let pctMes = 0;
  if (mForm.dueno) {
    const avgV_total = avgVar();
    const prem = avgV_total * c.pctPremio / 100;
    const pf = premioSplitFactor(p, state.log.length ? {
      p1: state.log.reduce((s,e)=>s+e.p1,0)/state.log.length,
      p2: state.log.reduce((s,e)=>s+e.p2,0)/state.log.length
    } : null);
    const libre = p === 'p1' ? c.libreP1 : c.libreP2;
    const estPocket = c.soloAhorroDirecto ? (prem * pf) : (libre + prem * pf);

    const fijosIndivs = metasIndividuales(p).reduce((s,m) => s + (m.id === mForm.id ? fijo : (m.aporteFijo || 0)), 0);
    const restPocket = Math.max(0, estPocket - fijosIndivs);
    pctMes = restPocket * pct / 100;
  } else {
    const est=Math.max(0,computeBase()+avgVar()*(1-c.pctPremio/100));
    pctMes=est*pct/100;
  }

  const aporteMes=fijo+pctMes;
  const apTxt=()=>{let p=[];if(fijo>0)p.push(fmt(fijo)+' fijos');if(pct>0)p.push('~'+fmt(pctMes)+' ('+pct+'% del resto)');return p.join(' + ');};

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
  $('rf').querySelectorAll('[data-tipo]').forEach(b=>b.onclick=()=>{readMetaForm();mForm.tipo=b.dataset.tipo;if(mForm.tipo==='invertir'&&!mForm.reparto)mForm.reparto=[];renderMetaForm(editing);});

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
  ['fObj','fFijo','fPct','fSaldo'].forEach(id=>{const el=$(id);if(el)el.addEventListener('input',updateDeriv);});
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
  // reparto interno
  const repAdd=$('repAdd');
  if(repAdd)repAdd.onclick=()=>{readMetaForm();mForm.reparto=mForm.reparto||[];mForm.reparto.push({n:'',pct:0});renderMetaForm(editing);};
  $('rf').querySelectorAll('[data-rdel]').forEach(b=>b.onclick=()=>{readMetaForm();mForm.reparto.splice(+b.dataset.rdel,1);renderMetaForm(editing);});
  $('rf').querySelectorAll('[data-rn]').forEach(el=>el.addEventListener('blur',()=>{mForm.reparto[+el.dataset.rn].n=el.value.trim();}));
  $('rf').querySelectorAll('[data-rp]').forEach(el=>el.addEventListener('input',()=>{mForm.reparto[+el.dataset.rp].pct=parse(el.value);}));
  $('fSave').onclick=()=>{
    readMetaForm();
    if(!mForm.nombre){flash('Ponle un nombre a la meta');return;}
    const idx=state.metas.findIndex(x=>x.id===mForm.id);
    if(idx>=0)state.metas[idx]=mForm;else state.metas.push(mForm);
    mForm=null;save();go(1);flash(editing?'Meta actualizada ✓':'Meta creada ✓');
  };
  const del=$('fDel');
  if(del)del.onclick=async()=>{if(!await customConfirm('¿Eliminar esta meta?',true))return;state.metas=state.metas.filter(x=>x.id!==mForm.id);mForm=null;save();go(1);flash('Meta eliminada');};
}

/* ---------- detalle de meta ---------- */
function openDetail(id){detailKey=id;renderDetail();
  ['s0','s1','s2','s3','s4','sd','sf','sh'].forEach(x=>$(x).classList.remove('on'));$('sd').classList.add('on');$('sd').scrollTop=0;
  $('mainnav').classList.add('hide');}
function gastosDe(id){return state.gastos.filter(g=>g.meta===id);}
function renderDetail(){
  const m=metaById(detailKey);if(!m){go(1);return;}
  const obj=m.objetivo||0,pct=obj?Math.min(100,m.saldo/obj*100):0,falta=Math.max(0,obj-m.saldo);
  const canEdit = canEditShared() || (m.tipo === 'personal' && m.dueno === state.config.perfil);
  let body='';
  if(obj){
    body+=`<div class="bar light"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--gs)"><b class="gold">${pct.toFixed(0)}%</b><span>${falta>0?'faltan '+fmt(falta):'✓ cumplido'}</span></div>`;
    if(m.fecha){const mr=monthsUntil(m.fecha),ap=mr>0&&falta>0?Math.ceil(falta/mr):null;
      if(ap)body+=`<div class="hint">Para ${fmtMes(m.fecha)}: ${fmt(ap)}/mes (${mr} mes${mr!==1?'es':''}).</div>`;}
  }
  if(m.tipo==='invertir'){
    const r=m.reparto||[];const sum=r.reduce((s,x)=>s+(+x.pct||0),0);
    body+=`<div style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px">
      <div class="k">Cómo distribuyes esta inversión</div>
      <div class="hint" style="margin-bottom:8px">${r.length===0?'<b>Sin categorías aún.</b> Agrega tipos (acciones, bonos, cripto…) para ver cómo se reparte el saldo.':'Define qué % va a cada tipo. Puedes agregar o quitar en cualquier momento.'}</div>
      <div id="repBox">${r.map((x,i)=>`<div class="grow"><input data-drn="${i}" value="${(x.n||'').replace(/"/g,'&quot;')}" placeholder="Tipo" style="flex:1;font-family:var(--sans)" ${!canEdit ? 'disabled' : ''}><input data-drp="${i}" inputmode="numeric" value="${x.pct}" style="width:54px;text-align:center" ${!canEdit ? 'disabled' : ''}>% ${canEdit ? `<button class="del" data-drdel="${i}">×</button>` : ''}</div>`).join('')}</div>
      ${canEdit ? '<button class="btn sm ghost" id="repAddD">+ Agregar tipo de inversión</button>' : ''}
      <div class="hint" style="color:${sum!==100&&r.length?'#a23':'var(--gs)'}">Suma: ${sum}%${r.length&&sum!==100?' · debería sumar 100%':''}</div>
      ${r.length?'<div class="esc" style="margin-top:8px">'+r.map(e=>`<div class="ep">${e.pct}%</div><div class="et">${e.n||'—'}</div><div class="ev num">${fmt(m.saldo*e.pct/100)}</div>`).join('')+'</div>':''}
    </div>`;
  }
  // editor saldo
  body+=`<label class="lbl" style="margin-top:14px">Saldo actual</label><input class="amt money" id="dSaldo" inputmode="numeric" value="${m.saldo?fmt(m.saldo):''}" ${!canEdit ? 'disabled style="opacity:0.65;pointer-events:none;"' : ''}>
    <div class="hint">El saldo se actualiza solo al cerrar el mes. Edítalo a mano únicamente para corregir el punto de partida.</div>`;

  // Transferencia Manual
  const isIndividualGoal = m.tipo !== 'personal' && (
                           (state.config.modo === 'individual') ||
                           (state.config.modo === 'pareja' && m.dueno === state.config.perfil)
  );
  if (isIndividualGoal && canEdit) {
    const per = metaPersonal(state.config.perfil);
    const maxBolsillo = per ? per.saldo : 0;
    body += `
      <div style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px">
        <div class="k">Transferir desde/hacia mi bolsillo</div>
        <div class="hint" style="margin-bottom:8px">Mueve saldo de tu "Bolsillo Personal" (${fmt(maxBolsillo)}) a esta meta, o viceversa.</div>
        <div class="transfer-container">
          <div class="transfer-row">
            <input class="sf money" id="tAmount" inputmode="numeric" placeholder="Monto $0" style="margin:0;">
            <button class="btn sm gold" id="btnTransferToMeta" style="margin:0;padding:10px 14px;">Abonar a meta</button>
          </div>
          <button class="btn sm ghost" id="btnTransferToPocket" style="margin-top:2px;margin-bottom:2px;width:100%;font-size:12.5px;">Retirar a mi bolsillo</button>
        </div>
      </div>
    `;
  }

  // gastos (no para personal)
  let ghist='';
  if(m.tipo!=='personal'){
    const gs=gastosDe(m.id).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
    ghist=gs.length?gs.map(g=>`<div class="lrow"><div><div class="lm">${g.nota||'Salida'}</div><div class="ls">${fmtFecha(g.fecha)}</div></div>
      <div style="display:flex;align-items:center;gap:8px"><span class="num" style="font-size:16px">−${fmt(g.monto)}</span>${canEdit ? `<button class="ldel" data-gdel="${g.id}">×</button>` : ''}</div></div>`).join(''):'<div class="empty">Sin salidas registradas.</div>';
    
    if (canEdit) {
      body+=`<div style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px"><div class="k">Registrar salida</div>
        <div class="row2"><label class="lbl">Fecha<input class="sf" type="date" id="dFecha" value="${today()}" style="margin-top:4px"></label>
        <label class="lbl">Monto<input class="sf money" id="dMonto" inputmode="numeric" placeholder="$0" style="margin-top:4px"></label></div>
        <label class="lbl" style="margin-top:10px">Nota<input class="sf" id="dNota" placeholder="¿En qué fue?" style="margin-top:4px"></label>
        <button class="btn sm" id="dGasto">Registrar salida</button>
        <div style="margin-top:16px"><div class="k">Salidas</div>${ghist}</div></div>`;
    } else {
      body+=`<div style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px"><div class="k">Salidas</div>${ghist}</div>`;
    }
  }
  $('rd').innerHTML=`<button class="bk" id="dBack">‹ Volver a Metas</button>
    <header style="padding-top:6px"><div class="ey">${m.tipo==='personal'?'Personal':tipoLabel(m.tipo)}</div><h1>${m.nombre}</h1></header>
    <div class="card"><div class="k">Saldo</div><div class="num big">${fmt(m.saldo)}</div>${body}</div>
    ${m.tipo!=='personal' && canEdit ?'<button class="btn ghost" id="dEdit" style="border-color:rgba(246,241,230,.24);color:var(--cream)">Editar esta meta</button>':''}`;
  $('dBack').onclick=()=>go(1);
  const ds=$('dSaldo');
  ds.addEventListener('focus',()=>{ds.value=String(m.saldo||0);ds.select();});
  ds.addEventListener('blur',()=>{m.saldo=parse(ds.value);ds.value=m.saldo?fmt(m.saldo):'';save();renderDetail();});
  
  const btnToMeta = $('btnTransferToMeta');
  if (btnToMeta) {
    btnToMeta.onclick = () => {
      const amt = parse($('tAmount').value);
      if (amt <= 0) { flash('Ingresa un monto válido'); return; }
      const per = metaPersonal(state.config.perfil);
      if (!per || per.saldo < amt) { flash('Saldo insuficiente en tu bolsillo'); return; }
      
      per.saldo -= amt;
      m.saldo += amt;
      save();
      renderDetail();
      flash(`Transferidos ${fmt(amt)} a la meta ✓`);
    };
  }

  const btnToPocket = $('btnTransferToPocket');
  if (btnToPocket) {
    btnToPocket.onclick = () => {
      const amt = parse($('tAmount').value);
      if (amt <= 0) { flash('Ingresa un monto válido'); return; }
      if (m.saldo < amt) { flash('Saldo insuficiente en esta meta'); return; }
      const per = metaPersonal(state.config.perfil);
      if (!per) return;

      m.saldo -= amt;
      per.saldo += amt;
      save();
      renderDetail();
      flash(`Transferidos ${fmt(amt)} a tu bolsillo ✓`);
    };
  }

  const ed=$('dEdit');if(ed)ed.onclick=()=>openMetaForm(m.id);
  const dg=$('dGasto');
  if(dg)dg.onclick=()=>{const f=$('dFecha').value||today(),mo=parse($('dMonto').value),nt=$('dNota').value.trim();
    if(mo<=0){flash('Pon el monto');return;}m.saldo=Math.max(0,m.saldo-mo);state.gastos.push({id:uid(),meta:m.id,fecha:f,monto:mo,nota:nt});save();renderDetail();flash('Salida registrada');};
  $('rd').querySelectorAll('[data-gdel]').forEach(b=>b.onclick=()=>{const g=state.gastos.find(x=>x.id===b.dataset.gdel);if(g){m.saldo+=g.monto;state.gastos=state.gastos.filter(x=>x.id!==g.id);save();renderDetail();}});
  // editor de distribución de inversión (inline en la ficha)
  const ra=$('repAddD');
  if(ra)ra.onclick=()=>{m.reparto=m.reparto||[];m.reparto.push({n:'',pct:0});save();renderDetail();};
  $('rd').querySelectorAll('[data-drdel]').forEach(b=>b.onclick=()=>{m.reparto.splice(+b.dataset.drdel,1);save();renderDetail();});
  $('rd').querySelectorAll('[data-drn]').forEach(el=>el.addEventListener('blur',()=>{m.reparto[+el.dataset.drn].n=el.value.trim();save();}));
  $('rd').querySelectorAll('[data-drp]').forEach(el=>el.addEventListener('blur',()=>{m.reparto[+el.dataset.drp].pct=Math.max(0,Math.min(100,parse(el.value)));save();renderDetail();}));
}

/* ---------- historial de meses cerrados ---------- */
function openHistoryList() {
  ['s0','s1','s2','s3','s4','sd','sf','sh'].forEach(x=>$(x).classList.remove('on'));
  $('sh').classList.add('on');
  $('sh').scrollTop=0;
  $('mainnav').classList.add('hide');
  renderHistoryList();
}

function renderHistoryList() {
  const c=state.config;
  const sortedLog = state.log.slice().sort((x, y) => y.mes.localeCompare(x.mes));
  
  let h = `<button class="bk" id="hListBack">‹ Volver a Aportar</button>
    <header style="padding-top:6px">
      <div class="ey">Registro Histórico</div>
      <h1>Meses cerrados</h1>
    </header>`;
    
  if (sortedLog.length === 0) {
    h += `<div class="card"><div class="empty">Aún no hay meses cerrados registrados.</div></div>`;
  } else {
    h += sortedLog.map(e => {
      const ec = e.config || c;
      const totalEspecialAhorro = e.especiales ? e.especiales.reduce((s, ep) => s + ep.monto * (1 - (ep.pctRetener||0)/100), 0) : 0;
      const totalAhorro = e.reparto ? (e.reparto.ahorro + totalEspecialAhorro) : (e.p1 + e.p2);
      const p1Total = (ec.nominaP1 || 0) + e.p1;
      const p2Total = (ec.nominaP2 || 0) + e.p2;
      return `<div class="card tap tap-hist-item" data-hmes="${e.mes}" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;padding:12px 16px;">
        <div style="flex:1">
          <div class="lm" style="font-weight:700;font-size:14.5px;">${fmtMes(e.mes)}</div>
          <div class="ls" style="font-size:12px;color:var(--gs);margin-top:2px;">${ec.nombreP1} ${fmt(p1Total)} · ${ec.nombreP2} ${fmt(p2Total)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
          ${e.aplicado ? '<span class="tag ok" style="padding:1px 5px;font-size:9px;">✓</span>' : ''}
          <span class="num" style="font-size:15px;font-weight:600;">${fmt(totalAhorro)}</span>
          <button class="ldel delete-hist-item-btn" data-logm="${e.mes}" style="font-size:20px;opacity:0.6;padding:4px 6px;">×</button>
          <span class="chev" style="color:var(--gs);opacity:0.5;font-size:18px;">›</span>
        </div>
      </div>`;
    }).join('');
  }
  
  $('rh').innerHTML = h;
  
  $('hListBack').onclick = () => {
    go(2);
  };
  
  $('rh').querySelectorAll('.tap-hist-item').forEach(el => el.onclick = (e) => {
    if (e.target.closest('.delete-hist-item-btn')) return;
    openHistoryDetail(el.dataset.hmes, 'list');
  });
  
  $('rh').querySelectorAll('.delete-hist-item-btn').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    if (!await customConfirm(`¿Eliminar el registro de ${fmtMes(b.dataset.logm)} del historial? (Esto no modificará los saldos actuales).`, true)) return;
    state.log = state.log.filter(x => x.mes !== b.dataset.logm);
    save();
    renderHistoryList();
  });
}

function openHistoryDetail(mes, fromTab) {
  ['s0','s1','s2','s3','s4','sd','sf','sh'].forEach(x=>$(x).classList.remove('on'));
  $('sh').classList.add('on');
  $('sh').scrollTop=0;
  $('mainnav').classList.add('hide');
  renderHistoryDetail(mes, fromTab);
}

function renderHistoryDetail(mes, fromTab) {
  const entry = state.log.find(e => e.mes === mes);
  if (!entry) {
    if (fromTab === 'list') renderHistoryList(); else go(2);
    return;
  }
  
  const backFn = () => {
    if (fromTab === 'list') renderHistoryList(); else go(2);
  };
  
  const c = entry.config || state.config;
  const r = entry.reparto;
  
  let h = `<button class="bk" id="hDetailBack">‹ Volver</button>
    <header style="padding-top:6px">
      <div class="ey">Detalle de Cierre</div>
      <h1>${fmtMes(entry.mes)}</h1>
    </header>`;
    
  if (!r) {
    const cb = entry.p1 + entry.p2;
    h += `<div class="card">
      <div class="k" style="margin-bottom:12px;">Resumen del mes</div>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13.5px;">
        <div style="display:flex;justify-content:space-between"><span>Extra ${c.nombreP1}:</span><b class="num">${fmt(entry.p1)}</b></div>
        <div style="display:flex;justify-content:space-between"><span>Extra ${c.nombreP2}:</span><b class="num">${fmt(entry.p2)}</b></div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:8px;font-weight:700;">
          <span>Total extra:</span><b class="num">${fmt(cb)}</b>
        </div>
      </div>
      <div class="hint" style="margin-top:16px;line-height:1.45;">
        ℹ️ Los detalles completos de reparto y gráficos no están disponibles para meses cerrados antes de la actualización de historial.
      </div>
    </div>`;
  } else {
    const totalEntra = r.entra || (r.nom + r.comb);
    const totalEspecial = entry.especiales ? entry.especiales.reduce((s, ep) => s + ep.monto, 0) : 0;
    const totalEspecialAhorro = entry.especiales ? entry.especiales.reduce((s, ep) => s + ep.monto*(1-(ep.pctRetener||0)/100), 0) : 0;
    const entra = Math.max(1, totalEntra + totalEspecial);
    const ahorro = Math.max(0, r.ahorro + totalEspecialAhorro);
    
    let histExtraBolsilloP1=0,histExtraBolsilloP2=0;
    (entry.especiales||[]).forEach(ep=>{
      const toBolsillo=ep.monto*(ep.pctRetener||0)/100;
      if(toBolsillo>0.5){
        if(ep.persona==='p1')histExtraBolsilloP1+=toBolsillo;
        else if(ep.persona==='p2')histExtraBolsilloP2+=toBolsillo;
        else{histExtraBolsilloP1+=toBolsillo/2;histExtraBolsilloP2+=toBolsillo/2;}
      }
    });
    const pg = (r.gastosDia / entra * 100);
    const ppp = (r.gustosPareja / entra * 100);
    const pp1 = ((r.gustosP1+histExtraBolsilloP1) / entra * 100);
    const pp2 = ((r.gustosP2+histExtraBolsilloP2) / entra * 100);
    const pa = (ahorro / entra * 100);
    
    const recibe = Object.keys(r.dist || {}).map(id => ({
      m: metaById(id) || { nombre: id, tipo: 'Desconocido' },
      v: r.dist[id] || 0
    })).filter(x => x.v > 0.5);
    
    h += `<div class="casc nofade">
      <div class="inc-row"><span class="inc-name">Ingresos totales</span><span class="inc-val num">${fmt(totalEntra + totalEspecial)}</span></div>
      
      <div style="margin-top:2px;margin-bottom:12px;display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:var(--gs)">
        <div style="display:flex;justify-content:space-between"><span>Fijos (nóminas):</span><b style="color:var(--ink)">${fmt(r.nom)}</b></div>
        ${r.comb > 0 ? `<div style="display:flex;justify-content:space-between"><span>Variables:</span><b style="color:var(--ink)">${fmt(r.comb)}</b></div>` : ''}
        ${entry.especiales && entry.especiales.length > 0 ? entry.especiales.map(ep => {
          const pctR=ep.pctRetener||0;
          const toSave=ep.monto*(1-pctR/100);
          const toBolsillo=ep.monto-toSave;
          const persNom=c.modo==='individual'?'':` (${ep.persona==='p1'?c.nombreP1:ep.persona==='p2'?c.nombreP2:'Ambos'})`;
          return `<div style="display:flex;justify-content:space-between"><span>Adicional — ${ep.nombre}${persNom}:</span><b style="color:var(--gb)">${fmt(ep.monto)}</b></div>${pctR>0?`<div style="display:flex;justify-content:space-between;padding-left:10px;font-size:11px"><span>↳ ${pctR}% bolsillo:</span><b style="color:var(--gs)">${fmt(toBolsillo)}</b></div><div style="display:flex;justify-content:space-between;padding-left:10px;font-size:11px"><span>↳ al plan:</span><b style="color:var(--gs)">${fmt(toSave)}</b></div>`:''}`;
        }).join('') : ''}
      </div>
      
      <div class="stack">
        <span class="st-seg st-seg-g" style="width:${pg.toFixed(1)}%"></span>
        <span class="st-seg st-seg-pp" style="width:${ppp.toFixed(1)}%"></span>
        <span class="st-seg st-seg-p1" style="width:${pp1.toFixed(1)}%"></span>
        <span class="st-seg st-seg-p2" style="width:${pp2.toFixed(1)}%"></span>
        <span class="st-seg st-seg-a" style="flex:1"></span>
      </div>
      
      <div class="leg-row"><span class="dot dot-g"></span><span class="leg-n">Gastos del hogar</span><b>${fmt(r.gastosDia)}</b></div>
      <div class="leg-row"><span class="dot dot-pp"></span><span class="leg-n">Citas y gustos en pareja</span><b>${fmt(r.gustosPareja)}</b></div>
      <div class="leg-row"><span class="dot dot-p1"></span><span class="leg-n">Libre de ${c.nombreP1}</span><b>${fmt(r.gustosP1+histExtraBolsilloP1)}</b></div>
      ${histExtraBolsilloP1>0?`<div style="display:flex;justify-content:space-between;padding:0 0 4px 20px;font-size:11.5px;color:var(--gb)"><span>↳ incluye de ingresos adicionales</span><b>${fmt(histExtraBolsilloP1)}</b></div>`:''}
      <div class="leg-row"><span class="dot dot-p2"></span><span class="leg-n">Libre de ${c.nombreP2}</span><b>${fmt(r.gustosP2+histExtraBolsilloP2)}</b></div>
      ${histExtraBolsilloP2>0?`<div style="display:flex;justify-content:space-between;padding:0 0 4px 20px;font-size:11.5px;color:var(--gb)"><span>↳ incluye de ingresos adicionales</span><b>${fmt(histExtraBolsilloP2)}</b></div>`:''}
      <div class="leg-row big"><span class="dot dot-a"></span><span class="leg-n">Ahorro e inversión</span><b>${fmt(ahorro)}</b></div>
      
      ${(()=>{
        const especiales=entry.especiales||[];
        if(especiales.length>0){
          const unifiedDist={};
          recibe.forEach(x=>{unifiedDist[x.m.id]={m:x.m,base:x.v,extra:0};});
          especiales.forEach(ep=>{
            const toSave=ep.monto*(1-(ep.pctRetener||0)/100);
            if(toSave>0.5){
              if(ep.meta==='distribuir'){
                const distEsp=distribuirAhorro(toSave,true);
                metasCompartidas().forEach(m=>{if(!unifiedDist[m.id])unifiedDist[m.id]={m,base:0,extra:0};unifiedDist[m.id].extra+=distEsp[m.id]||0;});
              }else{const md=metaById(ep.meta);if(md){if(!unifiedDist[ep.meta])unifiedDist[ep.meta]={m:md,base:0,extra:0};unifiedDist[ep.meta].extra+=toSave;}}
            }
          });
          const uList=Object.values(unifiedDist).filter(x=>(x.base+x.extra)>0.5);
          const totalAh=Math.max(1,ahorro);
          let mh=uList.map(x=>{const tot=x.base+x.extra;return `<div class="meta-lvl"><div class="lvl-row"><span class="lvl-name">${x.m.nombre} <span class="lvl-tag">· ${tipoLabel(x.m.tipo)}</span></span><span class="lvl-val num">${fmt(tot)}</span></div><div class="lvl-bar"><i style="width:${Math.max(3,Math.min(100,tot/totalAh*100)).toFixed(1)}%"></i></div>${x.extra>0?`<div style="font-size:11px;color:var(--gb);margin-top:3px;padding-left:2px">↳ incluye +${fmt(x.extra)} de ingresos adicionales</div>`:''}</div>`;}).join('');
          return mh?`<div class="meta-block"><div class="mt-title">A dónde fue el ahorro</div>${mh}</div>`:`<div class="leg-row" style="font-size:12px;color:var(--gs);margin-top:6px">No hubo ahorros distribuidos a metas en este cierre.</div>`;
        }else{
          return recibe.length>0?`<div class="meta-block"><div class="mt-title">A dónde fue el ahorro</div>${recibe.map(x=>`<div class="meta-lvl"><div class="lvl-row"><span class="lvl-name">${x.m.nombre} <span class="lvl-tag">· ${tipoLabel(x.m.tipo)}</span></span><span class="lvl-val num">${fmt(x.v)}</span></div><div class="lvl-bar"><i style="width:${Math.max(3,Math.min(100,x.v/Math.max(1,ahorro)*100)).toFixed(1)}%"></i></div></div>`).join('')}</div>`:`<div class="leg-row" style="font-size:12px;color:var(--gs);margin-top:6px">No hubo ahorros distribuidos a metas en este cierre.</div>`;
        }
      })()}
    </div>`;
  }
  
  h += `<div style="margin-top:16px;display:flex;flex-direction:column;gap:8px;">
    <button class="btn danger" id="btnDelHistEntry">Eliminar registro</button>
  </div>`;
  
  $('rh').innerHTML = h;
  
  $('hDetailBack').onclick = backFn;
  
  $('btnDelHistEntry').onclick = async () => {
    if (!await customConfirm(`¿Eliminar el registro de ${fmtMes(entry.mes)} del historial? (Esto no modificará los saldos actuales).`, true)) return;
    state.log = state.log.filter(e => e.mes !== entry.mes);
    save();
    backFn();
  };
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
  return {base,comb,prem,ahorro,gastosDia,gustos,gustosPareja,gustosP1,gustosP2,dist,nom:c.soloAhorroDirecto ? 0 : (c.nominaP1+c.nominaP2),entra:c.soloAhorroDirecto ? (base+comb) : (c.nominaP1+c.nominaP2+comb)};
}
function renderCerrar(){
  const c=state.config;
  const sortedLog = state.log.slice().sort((x, y) => y.mes.localeCompare(x.mes));
  const showLimit = 2;
  const showLogs = sortedLog.slice(0, showLimit);
  const canEdit = canEditShared();
  const dis = !canEdit ? 'disabled style="opacity:0.65;pointer-events:none;"' : '';

  let logH = '';
  if (sortedLog.length === 0) {
    logH = '<div class="card"><div class="empty">Aún no hay meses cerrados.</div></div>';
  } else {
    logH = showLogs.map(e => {
      const ec = e.config || c;
      const totalEspecialAhorro = e.especiales ? e.especiales.reduce((s, ep) => s + ep.monto * (1 - (ep.pctRetener||0)/100), 0) : 0;
      const totalAhorro = e.reparto ? (e.reparto.ahorro + totalEspecialAhorro) : (e.p1 + e.p2);
      const p1Total = (ec.nominaP1 || 0) + e.p1;
      const p2Total = (ec.nominaP2 || 0) + e.p2;
      return `<div class="card tap tap-hist" data-hmes="${e.mes}" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;padding:12px 16px;">
        <div style="flex:1">
          <div class="lm" style="font-weight:700;font-size:14.5px;">${fmtMes(e.mes)}</div>
          <div class="ls" style="font-size:12px;color:var(--gs);margin-top:2px;">${ec.nombreP1} ${fmt(p1Total)} · ${ec.nombreP2} ${fmt(p2Total)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
          ${e.aplicado ? '<span class="tag ok" style="padding:1px 5px;font-size:9px;">✓</span>' : ''}
          <span class="num" style="font-size:15px;font-weight:600;">${fmt(totalAhorro)}</span>
          ${canEdit ? `<button class="ldel delete-hist-btn" data-logm="${e.mes}" style="font-size:20px;opacity:0.6;padding:4px 6px;">×</button>` : ''}
          <span class="chev" style="color:var(--gs);opacity:0.5;font-size:18px;">›</span>
        </div>
      </div>`;
    }).join('');

    if (sortedLog.length > showLimit) {
      logH += `<button class="btn ghost sm" id="btnFullHistory" style="margin-top:8px;width:100%;">Ver historial completo (${sortedLog.length} meses) ›</button>`;
    } else {
      logH += `<button class="btn ghost sm" id="btnFullHistory" style="margin-top:8px;width:100%;">Abrir historial completo ›</button>`;
    }
  }

  $('r2').innerHTML=`
<header><div class="ey">Aportar al plan</div><h1 id="mMesDisplay" style="font-size:22px"></h1></header>
<label class="lbl" style="margin-bottom:6px">Mes</label>
<div style="display:flex; align-items:center; justify-content:space-between; height:42px; background:var(--cream); border:1px solid var(--line); border-radius:10px; overflow:hidden; margin-bottom:14px;">
  <button id="btnPrevMonth" style="background:none; border:none; width:44px; height:100%; font-size:18px; color:var(--green); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">‹</button>
  <div id="mMesTrigger" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; height:100%; font-weight:700; color:var(--ink);">
    <span id="mMesText" style="font-family:var(--sans); font-size:14.5px;">${fmtMes(selectedMonth) || selectedMonth}</span>
    <span style="color:var(--gs); font-size:9px; vertical-align:middle; margin-top:2px;">▼</span>
  </div>
  <button id="btnNextMonth" style="background:none; border:none; width:44px; height:100%; font-size:18px; color:var(--green); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">›</button>
</div>
${especialesPendientes.length ? `<div style="margin-bottom:12px;background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:0 12px"><div style="font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:var(--gs);padding-top:10px;margin-bottom:6px">Ingresos adicionales agregados</div>${especialesPendientes.map((ep,i)=>{
  const metaNom=ep.meta==='distribuir'?'Según el plan':(metaById(ep.meta)?metaById(ep.meta).nombre:'Desconocida');
  const pctR=ep.pctRetener||0;
  const persNom=c.modo==='individual'?'':`${ep.persona==='p1'?c.nombreP1:ep.persona==='p2'?c.nombreP2:'Ambos'} · `;
  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px"><div><div style="font-weight:700;color:var(--ink)">${ep.nombre}</div><div style="font-size:11px;color:var(--gs);margin-top:2px">${persNom}${pctR>0?`${pctR}% al bolsillo · `:''}${metaNom}</div></div><div style="display:flex;align-items:center;gap:4px"><span class="num" style="font-size:15px;color:var(--gb)">${fmt(ep.monto)}</span>${canEdit ? `<button class="ldel" data-epedit="${i}" style="font-size:14px;opacity:.65" title="Editar">✎</button><button class="ldel" data-epdel="${i}" style="font-size:16px">×</button>` : ''}</div></div>`;}).join('')}</div>` : ''}
${canEdit ? `<details id="detEspecial" class="card" style="margin-bottom:8px;padding:0"><summary style="font-size:14px;font-weight:600;color:var(--ink);padding:9px 14px">+ Agregar ingreso adicional</summary>
  <div class="dpad" style="padding:0 12px 10px">
    <label class="lbl">Concepto<input class="sf" id="iNom" placeholder="Comisión enero, prima junio…"></label>
    <label class="lbl" style="margin-top:5px">Monto<input class="sf money" id="iMonto" inputmode="numeric" placeholder="$0" style="margin-top:4px"></label>
    <div class="row2" style="margin-top:5px; ${c.modo === 'individual' ? 'grid-template-columns: 1fr;' : ''}">
      <label class="lbl" style="display:${c.modo==='individual'?'none':''}">¿De quién?<select class="sf" id="iPersona" style="margin-top:4px"><option value="p1">${c.nombreP1}</option><option value="p2">${c.nombreP2}</option><option value="ambos">Ambos</option></select></label>
      <label class="lbl">% al bolsillo<input class="sf" id="iPctRetener" type="number" min="0" max="100" placeholder="${c.pctPremio||0}" style="margin-top:4px"></label>
    </div>
    <label class="lbl" style="margin-top:5px">¿A dónde va el resto?<select class="sf" id="iMeta" style="margin-top:4px"><option value="distribuir">Repartir entre todas (según el plan)</option>${metasVisiblesEnFondos().map(m=>`<option value="${m.id}">${m.nombre}</option>`).join('')}</select></label>
    <div style="display:flex;gap:8px;margin-top:10px;">
      <button class="btn sm ghost" id="iSave" style="margin:0;padding:8px 6px;">Guardar para el cierre</button>
      <button class="btn sm gold" id="iSaveNow" style="margin:0;padding:8px 6px;">Aplicar de inmediato</button>
    </div>
  </div>
</details>` : ''}
<div class="stitle">Reparto del mes</div>
<div class="flow nofade" id="mflow"></div>
<button class="btn" id="mApply" style="margin-top:12px" ${dis}>Aportar</button>
${!canEdit ? `<div class="deriv" style="margin-top:12px;background:rgba(122,34,34,0.06);border-color:rgba(122,34,34,0.2);color:#7a2222;">⚠️ <b>Rol: Lector</b>. Solo los editores autorizados pueden realizar aportes al plan.</div>` : ''}
<div style="margin-top:14px"><div class="k" style="margin-bottom:6px">Meses cerrados</div>${logH}</div>`;
  function updateMesDisplay(){
    const t=$('mMesText');
    if(t)t.textContent=fmtMes(selectedMonth)||selectedMonth;
    const d=$('mMesDisplay');
    if(d)d.textContent=fmtMes(selectedMonth)||selectedMonth;
  }
  const mTrigger = $('mMesTrigger');
  if (mTrigger) {
    mTrigger.onclick = async () => {
      const newVal = await showCustomMonthPicker(selectedMonth);
      if (newVal) {
        selectedMonth = newVal;
        updateMesDisplay();
        drawFlow();
      }
    };
  }
  const btnPrev = $('btnPrevMonth');
  if (btnPrev) {
    btnPrev.onclick = () => {
      selectedMonth = shiftMonth(selectedMonth, -1);
      updateMesDisplay();
      drawFlow();
    };
  }
  const btnNext = $('btnNextMonth');
  if (btnNext) {
    btnNext.onclick = () => {
      selectedMonth = shiftMonth(selectedMonth, 1);
      updateMesDisplay();
      drawFlow();
    };
  }
  updateMesDisplay();
  $('mApply').onclick=aplicar;
  $('iSave').onclick=addIngreso;
  if($('iSaveNow')) $('iSaveNow').onclick=aplicarIngresoNowFromForm;
  $('r2').querySelectorAll('[data-epdel]').forEach(b=>b.onclick=()=>{
    especialesPendientes.splice(+b.dataset.epdel,1);
    renderCerrar();
    drawFlow();
  });
  $('r2').querySelectorAll('[data-epedit]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.epedit;
    const ep=especialesPendientes[i];
    especialesPendientes.splice(i,1);
    renderCerrar();
    drawFlow();
    if($('iNom'))$('iNom').value=ep.nombre;
    if($('iMonto'))$('iMonto').value=ep.monto;
    if($('iPersona'))$('iPersona').value=ep.persona||'p1';
    if($('iPctRetener'))$('iPctRetener').value=ep.pctRetener||'';
    if($('iMeta'))$('iMeta').value=ep.meta||'distribuir';
    const det=$('detEspecial');if(det)det.setAttribute('open','');
  });
  $('r2').querySelectorAll('.tap-hist').forEach(el => el.onclick = (e) => {
    if (e.target.closest('.delete-hist-btn')) return;
    openHistoryDetail(el.dataset.hmes, 'cerrar');
  });
  $('r2').querySelectorAll('.delete-hist-btn').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    if (!await customConfirm(`¿Eliminar el registro de ${fmtMes(b.dataset.logm)} del historial? (Esto no modificará los saldos actuales).`, true)) return;
    state.log = state.log.filter(x => x.mes !== b.dataset.logm);
    save();
    renderCerrar();
  });
  const btnFull = $('btnFullHistory');
  if (btnFull) {
    btnFull.onclick = () => openHistoryList();
  }
  drawFlow();
}
function drawFlow(animate){
  const el=$('mflow');if(!el)return;
  const r=computeReparto(0,0),c=state.config;
  const totalEspecial=especialesPendientes.reduce((s,ep)=>s+ep.monto,0);
  const totalEspecialAhorro=especialesPendientes.reduce((s,ep)=>s+ep.monto*(1-(ep.pctRetener||0)/100),0);
  const totalEntra=r.entra+totalEspecial;
  const entra=Math.max(1,totalEntra);
  const ahorro=Math.max(0,r.ahorro+totalEspecialAhorro);
  const pg=(r.gastosDia/entra*100);
  const ppp=(r.gustosPareja/entra*100);
  let extraBolsilloP1=0,extraBolsilloP2=0;
  especialesPendientes.forEach(ep=>{
    const toBolsillo=ep.monto*(ep.pctRetener||0)/100;
    if(toBolsillo>0.5){
      if(ep.persona==='p1')extraBolsilloP1+=toBolsillo;
      else if(ep.persona==='p2')extraBolsilloP2+=toBolsillo;
      else{extraBolsilloP1+=toBolsillo/2;extraBolsilloP2+=toBolsillo/2;}
    }
  });
  const pp1=((r.gustosP1+extraBolsilloP1)/entra*100);
  const pp2=((r.gustosP2+extraBolsilloP2)/entra*100);
  const pa=(ahorro/entra*100);
  const recibe=metasCompartidas().map(m=>({m,v:r.dist[m.id]||0})).filter(x=>x.v>0.5);
  const ah=Math.max(1,r.ahorro);
  
  // Habilitar o deshabilitar botón Aportar si hay ahorro negativo o es Lector
  const btnApply = $('mApply');
  if (btnApply) {
    btnApply.disabled = r.ahorro < 0 || !canEditShared();
  }

  let h='<div class="casc'+(animate?'':' nofade')+'">';
  if(r.ahorro < 0) {
    h += `<div style="background:rgba(122,34,34,0.08); border:1px solid #7a2222; padding:12px 14px; border-radius:12px; font-size:13px; color:#5a1919; line-height:1.45; margin-bottom:12px;">
      ⚠️ <b>Ahorro mensual negativo (${fmt(r.ahorro)})</b>: Sus gastos y dinero libre superan los ingresos de este mes. Ajusten las cifras en <b>Presupuesto</b> o agreguen ingresos extras para poder aportar al plan.
    </div>`;
  }
  h+=`<div class="inc-row"><span class="inc-name">Entra este mes</span><span class="inc-val num">${fmt(totalEntra)}</span></div>`;
  // desglose: fijos, extras, especiales
  h+=`<div style="margin-top:2px;margin-bottom:12px;display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:var(--gs)">`;
  h+=`<div style="display:flex;justify-content:space-between"><span>Fijos (nóminas):</span><b style="color:var(--ink)">${fmt(r.nom)}</b></div>`;
  if(totalEspecial>0){
    especialesPendientes.forEach(ep=>{
      const pctR=ep.pctRetener||0;
      const toSave=ep.monto*(1-pctR/100);
      const toBolsillo=ep.monto-toSave;
      const persNom=c.modo==='individual'?'':` (${ep.persona==='p1'?c.nombreP1:ep.persona==='p2'?c.nombreP2:'Ambos'})`;
      h+=`<div style="display:flex;justify-content:space-between"><span>${ep.nombre}${persNom}:</span><b style="color:var(--gb)">${fmt(ep.monto)}</b></div>`;
      if(pctR>0){
        h+=`<div style="display:flex;justify-content:space-between;padding-left:10px;font-size:11px"><span>↳ ${pctR}% bolsillo:</span><b style="color:var(--gs)">${fmt(toBolsillo)}</b></div>`;
        h+=`<div style="display:flex;justify-content:space-between;padding-left:10px;font-size:11px"><span>↳ al plan:</span><b style="color:var(--gs)">${fmt(toSave)}</b></div>`;
      }
    });
  }
  h+=`</div>`;
  h+=`<div class="stack">
      <span class="st-seg st-seg-g" style="width:${pg.toFixed(1)}%"></span>
      <span class="st-seg st-seg-pp" style="width:${ppp.toFixed(1)}%"></span>
      <span class="st-seg st-seg-p1" style="width:${pp1.toFixed(1)}%"></span>
      <span class="st-seg st-seg-p2" style="width:${pp2.toFixed(1)}%"></span>
      <span class="st-seg st-seg-a" style="flex:1"></span></div>`;
  h+=`<div class="leg-row"><span class="dot dot-g"></span><span class="leg-n">Gastos del hogar</span><b>${fmt(r.gastosDia)}</b></div>`;
  h+=`<div class="leg-row"><span class="dot dot-pp"></span><span class="leg-n">Citas y gustos en pareja</span><b>${fmt(r.gustosPareja)}</b></div>`;
  h+=`<div class="leg-row"><span class="dot dot-p1"></span><span class="leg-n">Libre de ${c.nombreP1} (bolsillo personal)</span><b>${fmt(r.gustosP1+extraBolsilloP1)}</b></div>`;
  if(extraBolsilloP1>0)h+=`<div style="display:flex;justify-content:space-between;padding:0 0 4px 20px;font-size:11.5px;color:var(--gb)"><span>↳ incluye de ingresos adicionales</span><b>${fmt(extraBolsilloP1)}</b></div>`;
  h+=`<div class="leg-row"><span class="dot dot-p2"></span><span class="leg-n">Libre de ${c.nombreP2} (bolsillo personal)</span><b>${fmt(r.gustosP2+extraBolsilloP2)}</b></div>`;
  if(extraBolsilloP2>0)h+=`<div style="display:flex;justify-content:space-between;padding:0 0 4px 20px;font-size:11.5px;color:var(--gb)"><span>↳ incluye de ingresos adicionales</span><b>${fmt(extraBolsilloP2)}</b></div>`;
  h+=`<div class="leg-row big"><span class="dot dot-a"></span><span class="leg-n">Para ahorrar e invertir</span><b>${fmt(ahorro)}</b></div>`;
  if(especialesPendientes.length>0){
    // Vista unificada: base + ingresos adicionales fusionados por meta
    const unifiedDist={};
    metasCompartidas().forEach(m=>{unifiedDist[m.id]={m,base:r.dist[m.id]||0,extra:0};});
    especialesPendientes.forEach(ep=>{
      const toSave=ep.monto*(1-(ep.pctRetener||0)/100);
      if(toSave>0.5){
        if(ep.meta==='distribuir'){
          const distEsp=distribuirAhorro(toSave,true);
          metasCompartidas().forEach(m=>{
            if(!unifiedDist[m.id])unifiedDist[m.id]={m,base:0,extra:0};
            unifiedDist[m.id].extra+=distEsp[m.id]||0;
          });
        }else{
          const metaDest=metaById(ep.meta);
          if(metaDest){
            if(!unifiedDist[ep.meta])unifiedDist[ep.meta]={m:metaDest,base:0,extra:0};
            unifiedDist[ep.meta].extra+=toSave;
          }
        }
      }
    });
    const unifiedList=Object.values(unifiedDist).filter(x=>(x.base+x.extra)>0.5);
    const totalAhorro=Math.max(1,ahorro);
    if(unifiedList.length){
      h+='<div class="meta-block"><div class="mt-title">A dónde va el ahorro</div>';
      let delay=0;
      unifiedList.forEach(x=>{
        const total=x.base+x.extra;
        const st=animate?`animation-delay:${delay}ms`:'';delay+=160;
        h+=`<div class="meta-lvl" style="${st}"><div class="lvl-row"><span class="lvl-name">${x.m.nombre} <span class="lvl-tag">· ${tipoLabel(x.m.tipo)}</span></span><span class="lvl-val num">${fmt(total)}</span></div><div class="lvl-bar"><i style="width:${Math.max(3,Math.min(100,total/totalAhorro*100)).toFixed(1)}%"></i></div>${x.extra>0?`<div style="font-size:11px;color:var(--gb);margin-top:3px;padding-left:2px">↳ incluye +${fmt(x.extra)} de ingresos adicionales</div>`:''}</div>`;
      });
      h+='</div>';
    }else{
      h+=`<div class="leg-row" style="font-size:12px;color:var(--gs);margin-top:6px">Aún no hay ahorro para repartir este mes.</div>`;
    }
  }else{
    if(recibe.length){
      h+='<div class="meta-block"><div class="mt-title">A dónde va el ahorro</div>';
      let delay=0;
      recibe.forEach(x=>{
        const st=animate?`animation-delay:${delay}ms`:'';delay+=160;
        h+=`<div class="meta-lvl" style="${st}"><div class="lvl-row"><span class="lvl-name">${x.m.nombre} <span class="lvl-tag">· ${tipoLabel(x.m.tipo)}</span></span><span class="lvl-val num">${fmt(x.v)}</span></div><div class="lvl-bar"><i style="width:${Math.max(3,Math.min(100,x.v/ah*100)).toFixed(1)}%"></i></div></div>`;
      });
      h+='</div>';
    }else{
      h+=`<div class="leg-row" style="font-size:12px;color:var(--gs);margin-top:6px">Aún no hay ahorro para repartir este mes.</div>`;
    }
  }
  const completedWithContributions = metasCompartidas().filter(m => m.objetivo > 0 && m.saldo >= m.objetivo && ((m.aporteFijo||0) > 0 || (m.aportePct||0) > 0));
  if(completedWithContributions.length > 0) {
    const list = completedWithContributions.map(m => `<b>${m.nombre}</b>`).join(', ');
    h += `<div class="deriv" style="margin-top:12px; background:rgba(192,138,45,0.06); border-color:rgba(192,138,45,0.25); color:var(--ink)">
      ℹ️ Las metas ${list} ya están completas. Sus aportes configurados se liberaron automáticamente y se redirigieron al ahorro sobrante de este mes.
    </div>`;
  }
  h+='</div>';
  el.className='flow';
  el.innerHTML=h;
}
async function aplicar(){
  if (!canEditShared()) { flash('No tienes permisos para aportar'); return; }
  const mes=selectedMonth;if(!mes){flash('Elige el mes');return;}
  const ex=state.log.find(e=>e.mes===mes);
  if(ex&&ex.aplicado){if(!await customConfirm('Ese mes ya se aplicó. ¿Aplicar de nuevo? Sumará otra vez a las metas.', false))return;}
  const r=computeReparto(0,0),c=state.config;
  if(r.ahorro < 0){flash('No se puede aportar: el ahorro es negativo');return;}
  state.metas.forEach(m=>{if(m.tipo!=='personal')m.saldo=Math.max(0,m.saldo+(r.dist[m.id]||0));});
  const p1Extra = especialesPendientes.filter(ep => ep.persona === 'p1').reduce((s, ep) => s + ep.monto, 0) + especialesPendientes.filter(ep => ep.persona === 'ambos').reduce((s, ep) => s + ep.monto * 0.5, 0);
  const p2Extra = especialesPendientes.filter(ep => ep.persona === 'p2').reduce((s, ep) => s + ep.monto, 0) + especialesPendientes.filter(ep => ep.persona === 'ambos').reduce((s, ep) => s + ep.monto * 0.5, 0);
  
  const prev = state.log.find(e => e.mes === mes);
  const yaInmediatos = prev ? (prev.especiales || []).filter(e => e.aplicadoInmediato) : [];
  
  const p1Inmediato = yaInmediatos.filter(e => e.persona === 'p1').reduce((s, e) => s + e.monto, 0) + yaInmediatos.filter(e => e.persona === 'ambos').reduce((s, e) => s + e.monto * 0.5, 0);
  const p2Inmediato = yaInmediatos.filter(e => e.persona === 'p2').reduce((s, e) => s + e.monto, 0) + yaInmediatos.filter(e => e.persona === 'ambos').reduce((s, e) => s + e.monto * 0.5, 0);

  // aplicar ingresos adicionales pendientes
  especialesPendientes.forEach(ep=>{
    const pctR=ep.pctRetener||0;
    const toSave=ep.monto*(1-pctR/100);
    state.ingresos.unshift({id:uid(),mes:ep.mes,nombre:ep.nombre,monto:ep.monto,meta:ep.meta,persona:ep.persona||'ambos',pctRetener:pctR});
    if(toSave>0.5){
      if(ep.meta==='distribuir'){
        const dist=distribuirAhorro(toSave, true);
        state.metas.forEach(m=>{if(m.tipo!=='personal'&&!m.dueno&&(dist[m.id]||0)>0.5)m.saldo+=dist[m.id];});
      }else{
        const m=metaById(ep.meta);if(m)m.saldo+=toSave;
      }
    }
  });
  const espSnapshot = especialesPendientes.map(ep => ({
    nombre: ep.nombre,
    monto: ep.monto,
    meta: ep.meta,
    persona: ep.persona||'ambos',
    pctRetener: ep.pctRetener||0,
    metaNombre: ep.meta === 'distribuir' ? 'Según el plan' : (metaById(ep.meta) ? metaById(ep.meta).nombre : 'Eliminada')
  }));
  
  // bolsillo personal del perfil de este teléfono
  const perfil=c.perfil,per=metaPersonal(perfil);
  const retenPersonal=especialesPendientes.reduce((s,ep)=>{
    const ret=ep.monto*(ep.pctRetener||0)/100;
    if(ep.persona===perfil)return s+ret;
    if(ep.persona==='ambos')return s+ret*0.5;
    return s;
  },0);
  
  especialesPendientes=[];
  
  const aporte=libreOf(perfil)+retenPersonal;
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
      if (m) m.saldo += dist[id];
    });
    per.saldo += rem;
  }

  const snapshot = {
    mes,
    p1: p1Extra + p1Inmediato,
    p2: p2Extra + p2Inmediato,
    aplicado: true,
    config: {
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
    especiales: yaInmediatos.concat(espSnapshot)
  };
  state.log=state.log.filter(e=>e.mes!==mes);state.log.push(snapshot);
  state.log.sort((x,y)=>y.mes.localeCompare(x.mes));
  save();
  // animar la cascada como confirmación
  renderCerrar();drawFlow(true);
  flash('Aplicado · tu bolsillo +'+fmt(aporte)+' ✓');
}
function addIngreso(){
  const nom=$('iNom').value.trim(),mes=selectedMonth||curMonth(),monto=parse($('iMonto').value),mid=$('iMeta').value;
  if(!nom||!monto){flash('Completa concepto y monto');return;}
  const persona=$('iPersona')?$('iPersona').value:'ambos';
  const pctRaw=$('iPctRetener')?$('iPctRetener').value.trim():'';
  const pctRetener=pctRaw===''?(state.config.pctPremio||0):Math.min(100,Math.max(0,Number(pctRaw)||0));
  especialesPendientes.push({nombre:nom,mes,monto,meta:mid,persona,pctRetener});
  $('iNom').value='';
  $('iMonto').value='';
  if($('iPctRetener'))$('iPctRetener').value='';
  $('iMeta').value='distribuir';
  if($('iPersona'))$('iPersona').value='p1';
  const det=$('detEspecial');if(det)det.removeAttribute('open');
  renderCerrar();
  drawFlow();
  flash('Ingreso adicional agregado — se aplicará al aportar ✓');
}
function aplicarIngresoNowFromForm(){
  if (!canEditShared()) { flash('No tienes permisos'); return; }
  const nom=$('iNom').value.trim(),mes=selectedMonth||curMonth(),monto=parse($('iMonto').value),mid=$('iMeta').value;
  if(!nom||!monto){flash('Completa concepto y monto');return;}
  const persona=$('iPersona')?$('iPersona').value:'ambos';
  const pctRaw=$('iPctRetener')?$('iPctRetener').value.trim():'';
  const pctRetener=pctRaw===''?(state.config.pctPremio||0):Math.min(100,Math.max(0,Number(pctRaw)||0));
  const ep = { id: uid(), nombre: nom, mes, monto, meta: mid, persona, pctRetener };
  aplicarIngresoInmediato(ep);
  $('iNom').value='';
  $('iMonto').value='';
  if($('iPctRetener'))$('iPctRetener').value='';
  $('iMeta').value='distribuir';
  if($('iPersona'))$('iPersona').value='p1';
  const det=$('detEspecial');if(det)det.removeAttribute('open');
}
function aplicarIngresoInmediato(ep){
  const pctR = ep.pctRetener || 0;
  const toSave = ep.monto * (1 - pctR/100);
  const c = state.config;
  state.ingresos.unshift({id:ep.id,mes:ep.mes,nombre:ep.nombre,monto:ep.monto,meta:ep.meta,persona:ep.persona||'ambos',pctRetener:pctR,aplicadoInmediato:true,fecha:today()});
  if(toSave>0.5){
    if(ep.meta==='distribuir'){
      const dist=distribuirAhorro(toSave, true);
      state.metas.forEach(m=>{if(m.tipo!=='personal'&&!m.dueno&&(dist[m.id]||0)>0.5)m.saldo+=dist[m.id];});
    }else{
      const m=metaById(ep.meta);if(m)m.saldo+=toSave;
    }
  }
  const ret = (pctR / 100) * ep.monto;
  const perfil = c.perfil;
  const per = metaPersonal(perfil);
  let share = 0;
  if(ep.persona===perfil) share = ret;
  else if((ep.persona||'ambos')==='ambos') share = ret*0.5;
  if(share>0 && per){
    const { dist, rem } = distribuirAhorroIndividual(perfil, share, true);
    Object.keys(dist).forEach(id => {
      const m = metaById(id);
      if (m) m.saldo += dist[id];
    });
    per.saldo += rem;
    if(!Array.isArray(per.inmediatosAplicados)) per.inmediatosAplicados = [];
    per.inmediatosAplicados.push(ep.id);
  }
  let entry = state.log.find(e=>e.mes===ep.mes);
  if(!entry){
    entry = {mes:ep.mes,p1:0,p2:0,aplicado:false,parcial:true,especiales:[]};
    state.log.push(entry);
  }
  entry.especiales = entry.especiales||[];
  entry.especiales.push({id:ep.id,nombre:ep.nombre,monto:ep.monto,meta:ep.meta,persona:ep.persona||'ambos',pctRetener:pctR,metaNombre:ep.meta==='distribuir'?'Según el plan':(metaById(ep.meta)?metaById(ep.meta).nombre:'Eliminada'),aplicadoInmediato:true,fecha:today()});
  state.log.sort((x,y)=>y.mes.localeCompare(x.mes));
  save();
  renderCerrar();
  drawFlow(true);
  flash('Ingreso aplicado de inmediato ✓');
}

/* =========================================================
   FLUJO (presupuesto editable)
   ========================================================= */
function renderFlujo(){
  const c=state.config;
  const base=computeBase();
  const total=c.nominaP1+c.nominaP2;
  const pGas=total?Math.round(c.gastos/total*100):0;
  const pPP=total?Math.round(c.planPareja/total*100):0;
  const pL1=total?Math.round(c.libreP1/total*100):0;
  const pL2=total?Math.round(c.libreP2/total*100):0;
  const pAh=Math.max(0,100-pGas-pPP-pL1-pL2);
  const dis = !canEditShared() ? 'disabled style="opacity:0.65;pointer-events:none;"' : '';
  
  let selectorHtml = `
    <div class="seg dark-seg" style="margin-bottom:16px;">
      <button id="flujoCalc" class="${!c.soloAhorroDirecto?'on':''}" ${dis}>Calcular con ingresos y gastos</button>
      <button id="flujoDirect" class="${c.soloAhorroDirecto?'on':''}" ${dis}>Fijar solo el ahorro</button>
    </div>
  `;

  let body = '';
  if (c.soloAhorroDirecto) {
    body = `
      <div class="card dark">
        <div class="k">Ahorro base mensual</div>
        <div class="num big" id="flujoBase">${fmt(base)}</div>
        <div class="muted sm" style="margin-top:4px">Monto fijo destinado al ahorro colectivo</div>
      </div>
      <div class="stitle">Configuración del Ahorro</div>
      <div class="card">
        <label class="lbl">Ahorro mensual conjunto</label>
        <input class="sf money" id="pAhorroDirecto" inputmode="numeric" value="${fmt(c.ahorroDirecto)}" style="margin-top:6px" ${dis}>
        <div class="hint">Este es el monto fijo que destinarán al ahorro colectivo cada mes.</div>
      </div>
    `;
  } else {
    body = `
      <div class="card dark">
        <div class="k">Ahorro base mensual</div>
        <div class="num big" id="flujoBase">${fmt(base)}</div>
        <div class="muted sm" style="margin-top:4px">Nóminas − gastos − gustos</div>
        <div class="stack" style="margin-top:12px;background:rgba(246,241,230,.06)">
          <span class="st-seg" style="width:${pGas}%;background:#8a7f70"></span>
          <span class="st-seg st-seg-pp" style="width:${pPP}%"></span>
          <span class="st-seg st-seg-p1" style="width:${pL1}%"></span>
          <span class="st-seg st-seg-p2" style="width:${pL2}%"></span>
          <span class="st-seg" style="flex:1;background:#3d8c64"></span>
        </div>
        <div style="font-size:12px;color:rgba(246,241,230,.6);display:flex;justify-content:space-between;margin-top:4px">
          <span>Gastos ${pGas}%</span><span>Gustos ${pPP+pL1+pL2}%</span><span style="color:var(--gb);font-weight:700">Ahorro ${pAh}%</span>
        </div>
      </div>
      <div class="stitle">Nóminas netas</div>
      <div class="card">
        <label class="lbl">Nómina neta de ${c.nombreP1}<br><span style="font-weight:400;font-size:11px;color:var(--gs)">Ya sin salud y pensión</span></label>
        <input class="sf money" id="pN1" inputmode="numeric" value="${fmt(c.nominaP1)}" style="margin-top:6px" ${dis}>
        <label class="lbl" style="margin-top:12px">Nómina neta de ${c.nombreP2}<br><span style="font-weight:400;font-size:11px;color:var(--gs)">Ya sin salud y pensión</span></label>
        <input class="sf money" id="pN2" inputmode="numeric" value="${fmt(c.nominaP2)}" style="margin-top:6px" ${dis}>
      </div>
      <div class="stitle">Gastos del hogar</div>
      <div class="card">
        <label class="lbl">Total gastos fijos</label>
        <input class="sf money" id="pGas" inputmode="numeric" value="${fmt(c.gastos)}" style="margin-top:6px" ${dis}>
        <div class="hint">Arriendo, servicios, mercado, transporte… Todo en una sola cifra.</div>
      </div>
      <div class="stitle">Gustos · para disfrutar</div>
      <div class="card">
        <label class="lbl">En pareja (citas, salidas…)</label>
        <input class="sf money" id="pPP" inputmode="numeric" value="${fmt(c.planPareja)}" style="margin-top:6px" ${dis}>
        <div class="row2" style="margin-top:12px">
          <label class="lbl">Libre de ${c.nombreP1}<input class="sf money" id="pL1" inputmode="numeric" value="${fmt(c.libreP1)}" style="margin-top:4px" ${dis}></label>
          <label class="lbl">Libre de ${c.nombreP2}<input class="sf money" id="pL2" inputmode="numeric" value="${fmt(c.libreP2)}" style="margin-top:4px" ${dis}></label>
        </div>
        <div class="hint">Lo de "en pareja" se gasta juntos; el "libre" de cada uno va a su bolsillo sin rendir cuentas.</div>
      </div>
    `;
  }

  $('r3').innerHTML=`
<header><div class="ey">Presupuesto mensual</div><h1>Presupuesto</h1></header>
${selectorHtml}
${body}`;
  attachFlujo();
}

function attachFlujo(){
  const c=state.config;
  const dis = !canEditShared();
  if (dis) return;
  
  const fCalc = $('flujoCalc');
  if (fCalc) {
    fCalc.onclick = () => {
      c.soloAhorroDirecto = false;
      save();
      rerender();
    };
  }
  const fDirect = $('flujoDirect');
  if (fDirect) {
    fDirect.onclick = () => {
      c.soloAhorroDirecto = true;
      save();
      rerender();
    };
  }

  if (c.soloAhorroDirecto) {
    const el = $('pAhorroDirecto');
    if (el) {
      el.addEventListener('focus', () => { el.value = String(c.ahorroDirecto || 0); el.select(); });
      el.addEventListener('blur', () => { c.ahorroDirecto = parse(el.value); save(); rerender(); });
    }
  } else {
    const money=(id,key)=>{const el=$(id);if(!el)return;
      el.addEventListener('focus',()=>{el.value=String(c[key]||0);el.select();});
      el.addEventListener('blur',()=>{c[key]=parse(el.value);save();rerender();});};
    money('pN1','nominaP1');money('pN2','nominaP2');money('pGas','gastos');money('pPP','planPareja');money('pL1','libreP1');money('pL2','libreP2');
  }
}

/* =========================================================
   AJUSTES (configuración)
   ========================================================= */
function renderPlan(){
  const c=state.config;
  const isIndiv = c.modo === 'individual';
  const detExtrasOpen = $('detExtras') ? $('detExtras').hasAttribute('open') : false;
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
        Perfil asignado por tu cuenta: <b style="color:var(--gb)">Soy ${perfilNombre(c.perfil)}</b>
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
  <button class="btn gold" id="bInstallPWA" style="display:${deferredPrompt?'block':'none'};margin-top:12px">Instalar Aplicación</button>
  <div id="pwaIosHint" style="display:${isIOS()?'block':'none'};margin-top:10px;background:rgba(246,241,230,.05);border:1px solid var(--line);border-radius:10px;padding:12px;color:rgba(246,241,230,.85)">
    <div style="font-weight:700;margin-bottom:6px;color:var(--gb)">Instrucciones para iPhone / iPad (Safari):</div>
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
              <div class="k" style="margin-bottom:4px;color:var(--gb);">Pareja Conectada</div>
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
                ? '⚠️ <b>Modo lectura activado</b>. Solo puedes visualizar la información de las metas compartidas, los gastos y el presupuesto. Tu bolsillo personal sigue estando disponible.'
                : '✓ Tienes permisos de <b>Editor</b>. Puedes realizar aportes, modificar metas y rellenar presupuestos.'}
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
      <div style="background:rgba(28,58,44,.04);border:1px dashed var(--line);border-radius:10px;padding:12px;text-align:center;font-family:monospace;font-size:14.5px;color:var(--gold);margin-top:8px;word-break:break-all;user-select:all;" id="valPlanId">
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
        <div class="hint" style="margin-top:0;margin-bottom:12px;line-height:1.45;">
          ☁️ <b>Sincronización activa:</b> Tus datos se guardan de forma automática en tu cuenta en la nube. No necesitas respaldos manuales.
        </div>
        <button class="btn ghost" id="bResetSaldos" style="border-color:rgba(192,138,45,.4);color:var(--gold);margin-bottom:12px;" ${dis}>Reiniciar saldos a $0</button>
        <button class="btn danger" id="bReset" ${dis}>Borrar todos los datos</button>
        <div class="hint" style="margin-top:6px;font-size:11px;color:rgba(235,94,85,.75)">
          ⚠️ Esta acción restablecerá tu app local y eliminará permanentemente la información compartida de este plan en la nube.
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
        <button class="btn gold" id="btnSettingsEmailSubmit" style="width:100%;margin-top:4px;">
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
        <div class="hint" style="margin-top:0;margin-bottom:12px;line-height:1.45;">
          📲 <b>Modo Local activo:</b> Tus datos solo se guardan en este teléfono. Genera un respaldo manual para transferir tus datos o no perderlos si cambias de dispositivo.
        </div>
        <button class="mini" id="bExp">Generar respaldo</button><button class="mini" id="bImp" ${dis}>Restaurar</button>
        <textarea class="bktx" id="bTxt" placeholder="Aquí aparece el respaldo. Para restaurar, pega y toca Restaurar."></textarea>
        <button class="btn ghost" id="bResetSaldos" style="border-color:rgba(192,138,45,.4);color:var(--gold);margin-bottom:12px;" ${dis}>Reiniciar saldos a $0</button>
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
 
<details id="detExtras" ${detExtrasOpen ? 'open' : ''}><summary>Ingresos adicionales</summary><div class="dpad">
  <label class="lbl">% por defecto al bolsillo</label><input class="sf" id="pPct" inputmode="numeric" value="${c.pctPremio}" ${dis}>
  <div class="hint">Al agregar un ingreso adicional (comisión, bono, prima…) este porcentaje se pre-rellena en el campo "% al bolsillo". Pueden cambiarlo por ítem.</div>
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
  $('pPct').addEventListener('blur',()=>{c.pctPremio=Math.max(0,Math.min(100,parse($('pPct').value)));save();rerenderPlanKeepOpen();});
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
          await auth.signInWithRedirect(provider);
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
          await currentUser.linkWithRedirect(provider);
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
    bExp.onclick=()=>{$('bTxt').value=JSON.stringify(state);flash('Respaldo generado');};
  }
  const bImp = $('bImp');
  if (bImp) {
    bImp.onclick=()=>{try{const o=JSON.parse($('bTxt').value);if(!o.metas)throw 0;
      const perfil=c.perfil,miPersonal=JSON.parse(JSON.stringify(metaPersonal(perfil)));
      state=o;normalize();state.config.perfil=perfil;
      const idx=state.metas.findIndex(m=>m.tipo==='personal'&&m.dueno===perfil);if(idx>=0)state.metas[idx]=miPersonal;
      save();go(0);flash('Respaldo restaurado ✓');}catch(e){flash('Respaldo inválido');}};
  }
  const bResetSaldos = $('bResetSaldos');
  if (bResetSaldos) {
    bResetSaldos.onclick = async () => {
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
  $('bReset').onclick=async()=>{if(!await customConfirm('¿Borrar todos los datos?', true))return;state={config:Object.assign({},CFG_DEF),metas:metasEjemplo().concat(metasPersonales()),log:[],ingresos:[],gastos:[]};save();startOnboarding();};
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
const OB_TOTAL=9;
function startOnboarding(){
  if (currentUser) {
    if (localStorage.getItem('isInvited') === 'true') {
      obStep = 2;
    } else {
      obStep = 1;
    }
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
  $('obNext').style.display=obStep===0?'none':'block';
  $('obSkip').style.display=(obStep===0 || localStorage.getItem('isInvited') === 'true')?'none':'block';
  $('obNext').textContent=obStep===OB_TOTAL-1?'Empezar':'Continuar';
  const minStep = (localStorage.getItem('isInvited') === 'true') ? 2 : 1;
  const backBtn = $('obBack');
  if (backBtn) backBtn.style.display = (obStep > minStep) ? 'block' : 'none';
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
          <button class="btn gold" id="btnObEmailSubmit" style="width:100%;margin-top:4px;">
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
  }else if(obStep===1){
    const isIndiv = c.modo === 'individual';
    h=`<div class="ob-step on"><div class="ob-eyebrow">Paso 1 de 7</div>
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
      <div class="ob-h" style="font-size:22px;margin-top:14px;">${isIndiv?'¿Cómo te llamas?':'¿Quiénes son?'}</div>
      <div class="ob-p" style="margin-top:4px;">${isIndiv?'Así personalizamos tu plan con tu nombre.':'Así personalizamos el plan con sus nombres.'}</div>
      <div class="ob-field"><label class="lbl">Persona 1</label><input class="sf" id="obNom1" value="${c.nombreP1==='Persona 1'?'':c.nombreP1}" placeholder="Tu nombre"></div>
      <div class="ob-field" id="obNom2Field" style="display:${isIndiv?'none':''}"><label class="lbl">Persona 2</label><input class="sf" id="obNom2" value="${c.nombreP2==='Persona 2'?'':c.nombreP2}" placeholder="Su nombre"></div></div>`;
  }else if(obStep===2){
    h=`<div class="ob-step on"><div class="ob-eyebrow">Paso 2 de 7</div>
      <div class="ob-h">¿De quién es<br>este teléfono?</div>
      <div class="ob-p">Cada uno instala la app en el suyo. En este teléfono verás y llenarás tu bolsillo personal; el otro hace lo mismo en el suyo.</div>
      <div class="ob-field"><div class="seg dark-seg"><button id="obPf1" class="${c.perfil==='p1'?'on':''}">Soy ${c.nombreP1}</button><button id="obPf2" class="${c.perfil==='p2'?'on':''}">Soy ${c.nombreP2}</button></div></div></div>`;
  }else if(obStep===3){
    const isIndiv = c.modo === 'individual';
    h=`<div class="ob-step on"><div class="ob-eyebrow">Paso 3 de 7</div>
      <div class="ob-h">¿Cómo quieres<br>armar el plan?</div>
      <div class="ob-p">Puedes calcular el ahorro restando gastos de tus ingresos, o ingresar directamente un monto fijo mensual de ahorro.</div>
      <div class="seg dark-seg" style="margin-top:14px;margin-bottom:14px;">
        <button id="obCalcFlow" class="${!c.soloAhorroDirecto?'on':''}">Ingresos y Gastos</button>
        <button id="obDirectFlow" class="${c.soloAhorroDirecto?'on':''}">Solo Ahorro</button>
      </div>`;
    if (c.soloAhorroDirecto) {
      h+=`<div class="ob-field">
        <label class="lbl">¿Cuánto quieres ahorrar al mes en total?</label>
        <input class="amt money" id="obAhorroDirecto" inputmode="numeric" value="${c.ahorroDirecto?fmt(c.ahorroDirecto):''}" placeholder="$1.000.000">
      </div>`;
    } else {
      h+=`<div class="ob-field"><label class="lbl">${isIndiv?'Tu nómina neta':'Nómina neta de '+c.nombreP1}</label><input class="amt money" id="obN1" inputmode="numeric" value="${c.nominaP1?fmt(c.nominaP1):''}" placeholder="$3.000.000"></div>
      ${!isIndiv ? `<div class="ob-field"><label class="lbl">Nómina neta de ${c.nombreP2}</label><input class="amt money" id="obN2" inputmode="numeric" value="${c.nominaP2?fmt(c.nominaP2):''}" placeholder="$3.000.000"></div>` : ''}
      <div class="ob-field"><label class="lbl">Gastos del mes (arriendo, servicios, mercado…)</label><input class="amt money" id="obGas" inputmode="numeric" value="${c.gastos?fmt(c.gastos):''}" placeholder="$2.365.000"></div>`;
    }
    h+=`</div>`;
  }else if(obStep===4){
    const isIndiv = c.modo === 'individual';
    if(isIndiv){
      h=`<div class="ob-step on"><div class="ob-eyebrow">Paso 4 de 7</div>
        <div class="ob-h">¿Cuánto apartas<br>para disfrutar?</div>
        <div class="ob-p">Además del ahorro, sepárate algo para gastos libres de entretenimiento y gustos personales. Lo que no gastes se acumulará en tu bolsillo.</div>
        <div class="ob-field">
          <label class="lbl">Tu dinero libre mensual</label>
          <input class="amt money" id="obL1" inputmode="numeric" value="${c.libreP1?fmt(c.libreP1):''}" placeholder="$400.000">
        </div>
        <div class="hint" style="margin-top:10px">Puedes dejarlo en $0 y ajustarlo después en Presupuesto.</div>
        </div>`;
    } else {
      h=`<div class="ob-step on"><div class="ob-eyebrow">Paso 4 de 7</div>
        <div class="ob-h">¿Cuánto apartan<br>para disfrutar?</div>
        <div class="ob-p">Además del ahorro, separen algo para vivir bien. Lo de pareja se gasta juntos; lo libre de cada uno va a su bolsillo sin rendir cuentas.</div>
        <div class="ob-field"><label class="lbl">En pareja (citas, salidas…)</label><input class="amt money" id="obPP" inputmode="numeric" value="${c.planPareja?fmt(c.planPareja):''}" placeholder="$1.000.000"></div>
        <div class="ob-field" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label class="lbl">Libre de ${c.nombreP1}<input class="amt money" id="obL1" inputmode="numeric" value="${c.libreP1?fmt(c.libreP1):''}" placeholder="$400.000" style="margin-top:4px"></label>
          <label class="lbl">Libre de ${c.nombreP2}<input class="amt money" id="obL2" inputmode="numeric" value="${c.libreP2?fmt(c.libreP2):''}" placeholder="$400.000" style="margin-top:4px"></label>
        </div>
        <div class="hint" style="margin-top:10px">Pueden dejarlo en $0 y ajustarlo después en Presupuesto.</div>
        </div>`;
    }
  }else if(obStep===5){
    h=`<div class="ob-step on"><div class="ob-eyebrow">Paso 5 de 7</div>
      <div class="ob-h">¿Cómo quieres<br>distribuir el ahorro?</div>
      <div class="ob-p">Elige cómo repartir lo que sobra cada mes entre sus metas. Lo pueden cambiar cuando quieran.</div>
      <div class="ob-field">
        <div class="seg dark-seg" id="obEstSeg">
          <button id="obEstSeq" class="${c.estrategia==='secuencial'?'on':''}">Prioritaria primero</button>
          <button id="obEstSim" class="${c.estrategia==='simultaneo'?'on':''}">Simultáneo</button>
          <button id="obEstCas" class="${c.estrategia==='cascada'?'on':''}">En cascada</button>
        </div>
      </div>
      <div id="obEstHint" style="margin-top:14px;background:rgba(246,241,230,.1);border:1px solid rgba(246,241,230,.2);border-radius:12px;padding:12px 14px;font-size:13.5px;color:rgba(246,241,230,.85);line-height:1.5">
        ${c.estrategia==='secuencial'?'<b style="color:var(--gb)">Prioritaria primero:</b> Primero se cubren los aportes fijos de cada meta y luego todo el ahorro sobrante va a la meta #1 hasta llenarla.'
          :c.estrategia==='simultaneo'?'<b style="color:var(--gb)">Simultáneo:</b> El ahorro se divide en paralelo entre todas las metas según los % y montos que configuren.'
          :'<b style="color:var(--gb)">En cascada:</b> Llena cada meta en orden estricto de prioridad, una por una, antes de pasar a la siguiente.'}
      </div>
      </div>`;
  }else if(obStep===6){
    h=`<div class="ob-step on"><div class="ob-eyebrow">Paso 6 de 7</div>
      <div class="ob-h">¿Reciben<br>ingresos adicionales?</div>
      <div class="ob-p">Comisiones, bonos, prima, freelances… Al registrar cada ingreso puedes elegir qué % va a tu bolsillo y qué % va al ahorro. Aquí configura el porcentaje por defecto.</div>
      <div class="ob-field"><label class="lbl">% por defecto al bolsillo</label>
        <input class="amt" id="obPct" inputmode="numeric" value="${c.pctPremio}" placeholder="20" style="margin-top:6px">
        <div id="obPctPreview" style="margin-top:8px;font-size:13px;color:rgba(246,241,230,.7);line-height:1.4">
          Por defecto: <b>${c.pctPremio}%</b> al bolsillo · <b>${100-c.pctPremio}%</b> al ahorro — editable por ítem
        </div>
      </div>
      </div>`;
  }else if(obStep===7){
    obMetaTipo='sueno';
    const _rRows=obReparto.map((x,i)=>`<div class="grow" style="gap:6px"><input data-orn="${i}" value="${(x.n||'').replace(/"/g,'&quot;')}" placeholder="Tipo (ej: Acciones)" style="flex:1;font-family:var(--sans)"><input data-orp="${i}" inputmode="numeric" value="${x.pct}" style="width:54px;text-align:center">%<button class="del" data-ordel="${i}" style="margin-left:2px">×</button></div>`).join('');
    const _rSum=obReparto.reduce((s,r)=>s+(+r.pct||0),0);
    h=`<div class="ob-step on"><div class="ob-eyebrow">Paso 7 de 7</div>
      <div class="ob-h">¿Tienes una primera<br>meta de ahorro?</div>
      <div class="ob-p">Agréga la ahora o créala después cuando quieras.</div>
      <div class="ob-field"><label class="lbl">¿Qué quieres lograr?</label><input class="sf" id="obMetaNom" placeholder="ej: Viaje a Europa, Carro, Apartamento…"></div>
      <div class="ob-field"><label class="lbl">Tipo</label>
        <div class="seg dark-seg" style="margin-top:6px;flex-wrap:wrap;gap:4px">
          <button id="obTipoSueno" class="on">🌟 Sueño</button>
          <button id="obTipoImprev">🛡️ Imprevistos</button>
          <button id="obTipoInvertir">📈 Inversión</button>
        </div>
        <div class="hint" id="obTipoHint" style="margin-top:8px">Una meta con fecha u objetivo concreto: viaje, carro, apartamento…</div>
      </div>
      <div class="ob-field" id="obRepartoSec" style="display:none">
        <label class="lbl">Cómo distribuyen la inversión <span style="font-weight:400;opacity:.7;font-size:13px">— pueden cambiar después</span></label>
        <div id="obRepartoBox">${_rRows}</div>
        <button class="btn sm ghost" id="obRepartoAdd" style="margin-top:6px">+ Agregar tipo</button>
        <div class="hint" style="margin-top:4px;color:${_rSum!==100&&obReparto.length?'#a23':'var(--gs)'}">Suma: ${_rSum}%${obReparto.length&&_rSum!==100?' · debería sumar 100%':''}</div>
      </div>
      <div class="ob-field"><label class="lbl">¿Cuánto necesitas? <span style="font-weight:400;opacity:.7">(opcional)</span></label><input class="amt money" id="obMetaObj" inputmode="numeric" placeholder="$15.000.000"></div>
      <div class="hint" style="margin-top:14px">Si aún no saben la cifra exacta, déjenlo en $0 y la ajustan después.</div>
      </div>`;
  }else if(obStep===8){
    h=`<div class="ob-step on"><div class="ob-eyebrow">Así funciona</div>
      <div class="ob-h">El dinero del mes,<br>repartido solo</div>
      <div class="ob-p">Cada mes registras lo que entró y el plan lo reparte: gastos, la parte personal de cada uno, y lo que queda hacia las metas.</div>
      <div class="flow" id="obFlow" style="margin-top:18px"></div></div>`;
  }
  inner.innerHTML=h;
  attachOb();
  if(obStep===8)setTimeout(()=>obDrawFlow(),150);
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
            // El plugin RC no construye el GoogleSignInClient nativo en load();
            // initialize() lo fuerza. clientId = Web client (type 3), requerido por requestIdToken.
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
            await auth.signInWithRedirect(provider);
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
      };
      obModoIndiv.onclick=()=>{
        c.modo='individual';
        obModoIndiv.classList.add('on');
        obModoPareja.classList.remove('on');
        const field = $('obNom2Field'); if(field) field.style.display='none';
      };
    }
  }
  if(obStep===2){
    $('obPf1').onclick=()=>{c.perfil='p1';renderOb();};
    $('obPf2').onclick=()=>{c.perfil='p2';renderOb();};
  }
  if(obStep===3){
    $('obCalcFlow').onclick=()=>{c.soloAhorroDirecto=false;renderOb();};
    $('obDirectFlow').onclick=()=>{
      c.soloAhorroDirecto=true;
      renderOb();
    };
  }
  if(obStep===5){
    const btnHint=$('obEstHint');
    const setEst=(e)=>{
      ['obEstSeq','obEstSim','obEstCas'].forEach(id=>$(id)&&$(id).classList.remove('on'));
      const labels={secuencial:'<b>Prioritaria primero:</b> Primero se cubren los aportes fijos de cada meta y luego todo el ahorro sobrante va a la meta #1 hasta llenarla.',
        simultaneo:'<b>Simultáneo:</b> El ahorro se divide en paralelo entre todas las metas según los % y montos que configuren.',
        cascada:'<b>En cascada:</b> Llena cada meta en orden estricto de prioridad, una por una, antes de pasar a la siguiente.'};
      state.config.estrategia=e;
      const activeId={secuencial:'obEstSeq',simultaneo:'obEstSim',cascada:'obEstCas'}[e];
      $(activeId).classList.add('on');
      if(btnHint)btnHint.innerHTML=labels[e];
    };
    $('obEstSeq').onclick=()=>setEst('secuencial');
    $('obEstSim').onclick=()=>setEst('simultaneo');
    $('obEstCas').onclick=()=>setEst('cascada');
  }
  if(obStep===6){
    const pctInput=$('obPct'),preview=$('obPctPreview');
    pctInput.addEventListener('input',()=>{
      const v=Math.max(0,Math.min(100,parseInt(pctInput.value)||0));
      if(preview)preview.innerHTML=`Por defecto: <b>${v}%</b> al bolsillo · <b>${100-v}%</b> al ahorro — editable por ítem`;
    });
  }
  if(obStep===7){
    const btnS=$('obTipoSueno'),btnP=$('obTipoImprev'),btnI=$('obTipoInvertir');
    const TIPO_HINTS={sueno:'Una meta con fecha u objetivo concreto: viaje, carro, apartamento…',imprevistos:'Se llena primero cada mes, antes que las otras metas. Ideal como colchón de emergencias.',invertir:'Recibe lo que sobre del ahorro. Sin fecha límite; puedes definir cómo distribuirla abajo.'};
    const renderObRep=()=>{
      const box=$('obRepartoBox');if(!box)return;
      const rSum=obReparto.reduce((s,r)=>s+(+r.pct||0),0);
      box.innerHTML=obReparto.map((x,i)=>`<div class="grow" style="gap:6px"><input data-orn="${i}" value="${(x.n||'').replace(/"/g,'&quot;')}" placeholder="Tipo (ej: Acciones)" style="flex:1;font-family:var(--sans)"><input data-orp="${i}" inputmode="numeric" value="${x.pct}" style="width:54px;text-align:center">%<button class="del" data-ordel="${i}" style="margin-left:2px">×</button></div>`).join('');
      const sec=$('obRepartoSec');const hintEl=sec&&sec.querySelector('.hint');
      if(hintEl){hintEl.textContent=`Suma: ${rSum}%`+(obReparto.length&&rSum!==100?' · debería sumar 100%':'');hintEl.style.color=rSum!==100&&obReparto.length?'#a23':'var(--gs)';}
      box.querySelectorAll('[data-ordel]').forEach(b=>b.onclick=()=>{obReparto.splice(+b.dataset.ordel,1);renderObRep();});
      box.querySelectorAll('[data-orn]').forEach(el=>el.addEventListener('blur',()=>{obReparto[+el.dataset.orn].n=el.value.trim();}));
      box.querySelectorAll('[data-orp]').forEach(el=>el.addEventListener('blur',()=>{obReparto[+el.dataset.orp].pct=Math.max(0,Math.min(100,parse(el.value)));renderObRep();}));
    };
    const setTipo=(t)=>{
      obMetaTipo=t;
      [btnS,btnP,btnI].forEach(b=>b&&b.classList.remove('on'));
      ({sueno:btnS,imprevistos:btnP,invertir:btnI})[t].classList.add('on');
      const hint=$('obTipoHint');if(hint)hint.textContent=TIPO_HINTS[t]||'';
      const sec=$('obRepartoSec');if(sec)sec.style.display=t==='invertir'?'':'none';
      const nom=$('obMetaNom');if(nom)nom.placeholder=t==='imprevistos'?'ej: Fondo de emergencias, Colchón…':'ej: Viaje a Europa, Carro, Apartamento…';
    };
    btnS.onclick=()=>setTipo('sueno');
    btnP.onclick=()=>setTipo('imprevistos');
    btnI.onclick=()=>setTipo('invertir');
    renderObRep();
    const ra=$('obRepartoAdd');
    if(ra)ra.onclick=()=>{obReparto.push({n:'',pct:0});renderObRep();setTimeout(()=>{const box=$('obRepartoBox');if(box){const inp=box.querySelectorAll('[data-orn]');inp[inp.length-1]&&inp[inp.length-1].focus();}},50);};
  }
}
function obSaveStep(){
  const c=state.config;
  if(obStep===1){
    c.nombreP1=$('obNom1').value.trim()||'Persona 1';
    if(c.modo==='individual') {
      c.nombreP2='';
    } else {
      c.nombreP2=$('obNom2').value.trim()||'Persona 2';
    }
  }
  if(obStep===3){
    if (c.soloAhorroDirecto) {
      c.ahorroDirecto=parse($('obAhorroDirecto').value)||c.ahorroDirecto;
    } else {
      c.nominaP1=parse($('obN1').value)||c.nominaP1;
      if(c.modo==='individual'){
        c.nominaP2=0;
      } else {
        c.nominaP2=parse($('obN2').value)||c.nominaP2;
      }
      const gv=parse($('obGas').value);if(gv)c.gastos=gv;
    }
  }
  if(obStep===4){
    if(c.modo==='individual'){
      c.planPareja=0;
      c.libreP2=0;
      const l1=parse($('obL1').value);if(l1)c.libreP1=l1;
    } else {
      const pp=parse($('obPP').value);if(pp)c.planPareja=pp;
      const l1=parse($('obL1').value);if(l1)c.libreP1=l1;
      const l2=parse($('obL2').value);if(l2)c.libreP2=l2;
    }
  }
  if(obStep===6){const pct=parseInt($('obPct').value)||c.pctPremio;c.pctPremio=Math.max(0,Math.min(100,pct));}
  if(obStep===7){
    const nom=$('obMetaNom')?$('obMetaNom').value.trim():'';
    if(nom){
      const obj=parse($('obMetaObj')?$('obMetaObj').value:'');
      const existeInv=obMetaTipo==='invertir'&&inversionAbierta();
      if(!existeInv){
        const prio=metasCompartidas().length;
        state.metas.push({id:uid(),nombre:nom,tipo:obMetaTipo,saldo:0,objetivo:obj||0,aporteFijo:0,aportePct:0,fecha:null,prioridad:prio,reparto:obMetaTipo==='invertir'?obReparto.map(r=>({n:r.n,pct:r.pct})):null});
      }
    }
  }
}
function obDrawFlow(){
  const el=$('obFlow');if(!el)return;
  const c=state.config;
  const isIndiv = c.modo === 'individual';
  const v = avgVar() / 2;
  const r = computeReparto(v, v);
  const entra = Math.max(1, r.entra);
  const pg = r.gastosDia / entra * 100;
  const ppp = r.gustosPareja / entra * 100;
  const pp1 = r.gustosP1 / entra * 100;
  const pp2 = r.gustosP2 / entra * 100;
  const pa = r.ahorro / entra * 100;

  let h='<div class="casc">';
  h+=`<div class="inc-row"><span class="inc-name">Entra este mes</span><span class="inc-val num">${fmt(r.entra)}</span></div>`;
  h+=`<div class="hint" style="margin-top: -4px; margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 11.5px; color: var(--gs)">
    <span>Ingresos nómina: <b>${fmt(r.nom)}</b></span>
    ${r.comb > 0 ? `<span>Variables (extras): <b>${fmt(r.comb)}</b></span>` : ''}
  </div>`;
  h+=`<div class="stack">
      <span class="st-seg st-seg-g" style="width:${pg.toFixed(1)}%"></span>
      ${!isIndiv ? `<span class="st-seg st-seg-pp" style="width:${ppp.toFixed(1)}%"></span>` : ''}
      <span class="st-seg st-seg-p1" style="width:${pp1.toFixed(1)}%"></span>
      ${!isIndiv ? `<span class="st-seg st-seg-p2" style="width:${pp2.toFixed(1)}%"></span>` : ''}
      <span class="st-seg st-seg-a" style="flex:1"></span></div>`;
  h+=`<div class="leg-row"><span class="dot dot-g"></span><span class="leg-n">Gastos fijos</span><b>${fmt(r.gastosDia)}</b></div>`;
  if(!isIndiv) h+=`<div class="leg-row"><span class="dot dot-pp"></span><span class="leg-n">Citas y gustos en pareja</span><b>${fmt(r.gustosPareja)}</b></div>`;
  h+=`<div class="leg-row"><span class="dot dot-p1"></span><span class="leg-n">${isIndiv ? 'Dinero libre' : `Libre de ${c.nombreP1}`}</span><b>${fmt(r.gustosP1)}</b></div>`;
  if(!isIndiv) h+=`<div class="leg-row"><span class="dot dot-p2"></span><span class="leg-n">Libre de ${c.nombreP2}</span><b>${fmt(r.gustosP2)}</b></div>`;
  h+=`<div class="leg-row big"><span class="dot dot-a"></span><span class="leg-n">Para ahorrar e invertir</span><b>${fmt(r.ahorro)}</b></div>`;
  h+='</div>';
  el.innerHTML=h;
}
$('obNext').onclick=()=>{
  obSaveStep();
  const isInv = localStorage.getItem('isInvited') === 'true';
  if(isInv && obStep === 2) {
    finishOnboarding();
    return;
  }
  if(obStep>=OB_TOTAL-1){finishOnboarding();return;}
  if(obStep===1 && state.config.modo === 'individual'){
    obStep=3; // saltar paso 2
  } else if(obStep===3 && state.config.soloAhorroDirecto){
    obStep=5;
  } else {
    obStep++;
  }
  renderOb();
};
$('obBack').onclick=()=>{
  obSaveStep();
  if(obStep===3 && state.config.modo === 'individual'){
    obStep=1; // volver saltando paso 2
  } else if(obStep===5 && state.config.soloAhorroDirecto){
    obStep=3;
  } else {
    obStep--;
  }
  renderOb();
};
$('obSkip').onclick=()=>{
  state.config.modo='pareja';
  state.config.nominaP1=3000000;
  state.config.nominaP2=3000000;
  state.config.gastos=2365000;
  state.config.planPareja=1000000;
  state.config.libreP1=400000;
  state.config.libreP2=400000;
  state.config.ahorroDirecto=1000000;
  finishOnboarding();
};
function finishOnboarding(){
  state.config.onboarded=true;
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
  
  // Cargar datos locales primero
  const raw = await store.get();
  if (raw) {
    try { state = { ...state, ...JSON.parse(raw) }; } catch(e) {}
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

      // Si no hay datos locales reales (onboarding sin hacer, sin historial y sin metas con saldo),
      // buscamos si este usuario ya tiene un plan existente en Firestore para cargarlo.
      const hasLocalData = state.config.onboarded || 
                           state.metas.some(m => m.tipo !== 'personal' && m.saldo > 0) || 
                           (state.log && state.log.length > 0);

      if (!hasLocalData) {
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
          await db.collection('meta').doc(currentPlanId).update({
            ownerEmail: user.email || 'Usuario de Google',
            ownerName: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario')
          }).catch(e => {});
        } else {
          state.config.perfil = 'p2';
          if (user.displayName && (state.config.nombreP2 === 'Persona 2' || !state.config.nombreP2)) {
            state.config.nombreP2 = user.displayName;
          }
          localStorage.setItem('isInvited', 'true');
          await db.collection('meta').doc(currentPlanId).update({
            partnerUid: user.uid,
            partnerEmail: user.email || 'Usuario de Google',
            partnerName: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario')
          }).catch(e => {});
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
        await db.collection('meta').doc(currentPlanId).set({
          ownerUid: user.uid,
          ownerEmail: user.email || 'Usuario de Google',
          ownerName: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario'),
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
          if (localStorage.getItem('isInvited') === 'true') {
            obStep = 2;
          } else {
            obStep = 1;
          }
          $('onb').classList.add('on');
          renderOb();
        }
      } else {
        // No se pudo cargar remote o es un plan nuevo/vacío sin datos
        if (!state.config.onboarded) {
          if (localStorage.getItem('isInvited') === 'true') {
            obStep = 2;
          } else {
            obStep = 1;
          }
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
        if (localStorage.getItem('isInvited') === 'true') {
          obStep = 2;
        } else {
          obStep = 1;
        }
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
