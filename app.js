/* سنگ‌یاب — نمایش کارخانه‌های سنگ صنعتی روی نقشه با داده‌ی Google Sheet */

const COLUMNS = {
  name:'نام کارخانه', lat:'عرض جغرافیایی', lng:'طول جغرافیایی', address:'آدرس',
  products:'محصولات', sizes:'سایزهای برش', manager:'نام مدیریت',
  managerPhone:'تماس مدیریت', salesPhone:'تماس فروش',
  prices:'قیمت محصولات', hours:'ساعت کاری', status:'وضعیت'
};
const MAP_CENTER = [32.65, 51.42], MAP_ZOOM = 12;
let map, cluster, allFactories = [];

/* ---------- ابزارها ---------- */
const $ = s => document.querySelector(s);
const norm = v => (v ?? '').toString().trim();
const isTrueActive = v => /فعال|active/i.test(norm(v)) && !/غیر\s*فعال|inactive/i.test(norm(v));
const isDigits = v => /\d{6,}/.test(norm(v).replace(/\D/g,''));

function escapeHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

/* ---------- نقشه ---------- */
function initMap(){
  map = L.map('map',{zoomControl:true}).setView(MAP_CENTER, MAP_ZOOM);
  // کاشی‌های OpenStreetMap France — بدون نیاز به کلید API
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.fr/osm/{z}/{x}/{y}.png',{
    maxZoom:20, subdomains:'abc',
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, tiles &copy; <a href="https://www.openstreetmap.fr" target="_blank" rel="noopener">OpenStreetMap France</a>'});
  // جایگزین بدون کلید API: Wikimedia Maps
  const wikimedia = L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, tiles &copy; <a href="https://maps.wikimedia.org" target="_blank" rel="noopener">Wikimedia</a>'});
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
    maxZoom:19, attribution:'Tiles &copy; Esri'});
  osm.addTo(map);
  L.control.layers({'نقشه استاندارد (OSM فرانسه)':osm,'نقشه ویکی‌مدیا':wikimedia,'تصاویر ماهواره‌ای':sat}).addTo(map);
  cluster = L.markerClusterGroup({showCoverageOnHover:false, maxClusterRadius:45});
  map.addLayer(cluster);
}

function pinIcon(active){
  return L.divIcon({
    className:'', iconSize:[26,36], iconAnchor:[13,36], popupAnchor:[0,-32],
    html:'<div class="marker-pin '+(active?'ok':'off')+'"></div>'
  });
}

function popupHtml(f){
  const st = f.active
    ? '<span class="badge ok">فعال</span>' : '<span class="badge off">غیرفعال</span>';
  return '<b>'+escapeHtml(f.name)+'</b><br>'+st+
    (f.address?'<br>📍 '+escapeHtml(f.address):'')+
    (f.products?'<br>🪨 '+escapeHtml(f.products):'')+
    '<br><button class="btn btn-primary" onclick="openModalById('+f.id+')">جزئیات کامل</button>';
}

function renderMarkers(list){
  cluster.clearLayers();
  list.forEach(f=>{
    if(!f.lat || !f.lng) return;
    const m = L.marker([f.lat, f.lng], {icon: pinIcon(f.active), title:f.name});
    m.bindPopup(popupHtml(f));
    m.on('click', ()=> openModal(f));
    m._factoryId = f.id;
    cluster.addLayer(m);
  });
}

/* ---------- لیست ---------- */
function renderList(list){
  const el = $('#factoryList');
  $('#resultCount').textContent = list.length ? list.length+' کارخانه یافت شد' : '';
  if(!list.length){
    el.innerHTML = '<div class="state">🏭 کارخانه‌ای مطابق جستجو/فیلتر شما یافت نشد.</div>';
    return;
  }
  el.innerHTML = list.map(f=>`
    <div class="card" data-id="${f.id}">
      <h3>${escapeHtml(f.name)}
        <span class="badge ${f.active?'ok':'off'}">${f.active?'فعال':'غیرفعال'}</span></h3>
      ${f.address?`<p>📍 ${escapeHtml(f.address)}</p>`:''}
      ${f.products?`<p>🪨 ${escapeHtml(f.products)}</p>`:''}
      ${f.hours?`<p>🕐 ${escapeHtml(f.hours)}</p>`:''}
    </div>`).join('');
  el.querySelectorAll('.card').forEach(c=>{
    c.addEventListener('click', ()=>{
      const f = allFactories.find(x=>x.id==c.dataset.id);
      openModal(f);
      if(f.lat&&f.lng) map.flyTo([f.lat,f.lng], 15, {duration:.8});
      if(window.innerWidth<=820) $('#sidebar').classList.remove('open');
    });
  });
}

function applyFilters(){
  const q = $('#searchInput').value.trim().toLowerCase();
  const st = document.querySelector('.chip.active').dataset.status;
  const list = allFactories.filter(f=>{
    const okSt = st==='all' || (st==='active'? f.active : !f.active);
    const hay = (f.name+' '+f.address+' '+f.products+' '+f.sizes+' '+f.manager).toLowerCase();
    return okSt && (!q || hay.includes(q));
  });
  renderList(list);
  renderMarkers(list);
}

/* ---------- مودال ---------- */
function row(label, val){
  if(!norm(val)) return '';
  return `<div class="row"><div class="label">${label}</div><div class="val">${escapeHtml(val)}</div></div>`;
}
function openModal(f){
  if(!f) return;
  let coord = '';
  if(f.lat && f.lng) coord = f.lat.toFixed(6)+','+f.lng.toFixed(6);
  const gmaps = coord ? 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(coord) : '';
  $('#modalBody').innerHTML = `
    <h2>${escapeHtml(f.name)}</h2>
    <div class="status-line"><span class="badge ${f.active?'ok':'off'}">${f.active?'فعال':'غیرفعال'}</span></div>
    ${row('📍 آدرس', f.address)}
    ${row('🪨 محصولات', f.products)}
    ${row('📏 سایزهای برش', f.sizes)}
    ${row('👤 نام مدیریت', f.manager)}
    ${isDigits(f.managerPhone)?row('📞 تماس مدیریت', `<a class="tel" href="tel:${f.managerPhone.replace(/\s/g,'')}">${escapeHtml(f.managerPhone)}</a>`):row('📞 تماس مدیریت', f.managerPhone)}
    ${isDigits(f.salesPhone)?row('☎️ تماس فروش', `<a class="tel" href="tel:${f.salesPhone.replace(/\s/g,'')}">${escapeHtml(f.salesPhone)}</a>`):row('☎️ تماس فروش', f.salesPhone)}
    ${row('💰 قیمت محصولات', f.prices)}
    ${row('🕐 ساعت کاری', f.hours)}
    <div style="margin-top:14px">
      ${gmaps?`<a class="btn btn-green" href="${gmaps}" target="_blank" rel="noopener">🧭 مسیریابی در گوگل‌مپ</a>`:''}
      ${coord?`<button class="btn btn-amber" onclick="copyCoord('${coord}')">📋 کپی مختصات</button>`:''}
    </div>`;
  $('#modalBackdrop').classList.add('show');
}
function openModalById(id){ openModal(allFactories.find(x=>x.id===id)); }
function copyCoord(c){ navigator.clipboard.writeText(c).then(()=>{
  const b=event.target; const t=b.textContent; b.textContent='✅ کپی شد!';
  setTimeout(()=>b.textContent=t,1500);
});}

/* ---------- داده ---------- */
function showState(html, cls=''){
  $('#stateBox').innerHTML = `<div class="state ${cls}">${html}</div>`;
  $('#factoryList').innerHTML = '';
}
function showSpinner(){ showState('<div class="spinner"></div>در حال دریافت اطلاعات کارخانه‌ها…'); }

/* ---------- منبع CSV (تنظیمات کاربر یا پیش‌فرض) ---------- */
const SETTINGS_PASSWORD = '129315';
function getCsvUrl(){
  try{ return localStorage.getItem('custom_csv_url') || CONFIG.PUBLIC_CSV_URL; }
  catch(e){ return CONFIG.PUBLIC_CSV_URL; }
}


/* ---------- واکشی CSV گوگل‌شیت با رفع خطای CORS ---------- */
// ابتدا Papa.parse با download:true (خودِ Papa فایل را می‌خواند)،
// و در صورت خطای CORS، آدرس از طریق پروکسی allorigins و سپس corsproxy.io امتحان می‌شود.
const CORS_PROXIES = [
  u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),
  u=>'https://corsproxy.io/?url='+encodeURIComponent(u)
];

function parseCsvRows(text){
  const parsed = Papa.parse(text.trim(), {header:true, skipEmptyLines:true, transformHeader:h=>h.trim()});
  return parsed.data || [];
}

function parseCsvRemote(url){
  // تلاش اول: دانلود مستقیم توسط Papa Parse (download: true)
  return new Promise((resolve, reject)=>{
    Papa.parse(url, {
      download: true, header: true, skipEmptyLines: true,
      transformHeader: h=>h.trim(),
      complete: res => {
        const rows = (res.data || []).filter(r => r && Object.keys(r).length);
        if (rows.length) return resolve(rows);
        reject(new Error('empty-direct'));
      },
      error: err => reject(err)
    });
  }).catch(err => {
    // تلاش دوم و سوم: دور زدن CORS با پروکسی‌ها
    let attempt = 0, lastErr = err;
    function tryProxy(){
      if(attempt >= CORS_PROXIES.length) throw lastErr;
      const wrapped = CORS_PROXIES[attempt++]();
      return fetch(wrapped, {cache:'no-store'})
        .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(text => {
          const rows = parseCsvRows(text);
          if (rows.length) return rows;
          throw new Error('پاسخ خالی از پروکسی');
        })
        .catch(e => { lastErr = e; return tryProxy(); });
    }
    return tryProxy();
  });
}

function loadData(){
  showSpinner();
  const baseUrl = getCsvUrl();
  if(!baseUrl || baseUrl.includes('YOUR_GOOGLE_SHEET_CSV_URL_HERE')){
    showState('⚠️ آدرس گوگل‌شیت تنظیم نشده است.<br>با کلیک روی آیکون ⚙️ در بالای صفحه وارد تنظیمات شوید و لینک CSV را ذخیره کنید.<br>راهنمای کامل در فایل README_FA.md موجود است.','error-state');
    return;
  }
  const url = baseUrl + (baseUrl.includes('?')?'&':'?') + 'cb=' + Date.now();
  parseCsvRemote(url)
    .then(rows=>{
      allFactories = rows.map((r,i)=>({
        id:i,
        name: norm(r[COLUMNS.name]),
        lat: parseFloat(norm(r[COLUMNS.lat]).replace(/[٫،]/g,'.')),
        lng: parseFloat(norm(r[COLUMNS.lng]).replace(/[٫،]/g,'.')),
        address: norm(r[COLUMNS.address]),
        products: norm(r[COLUMNS.products]),
        sizes: norm(r[COLUMNS.sizes]),
        manager: norm(r[COLUMNS.manager]),
        managerPhone: norm(r[COLUMNS.managerPhone]),
        salesPhone: norm(r[COLUMNS.salesPhone]),
        prices: norm(r[COLUMNS.prices]),
        hours: norm(r[COLUMNS.hours]),
        status: norm(r[COLUMNS.status]),
        active: isTrueActive(norm(r[COLUMNS.status]))
      })).filter(f=>f.name);
      const geo = allFactories.filter(f=>!isNaN(f.lat)&&!isNaN(f.lng));
      if(!allFactories.length){
        showState('📭 هیچ داده‌ای در گوگل‌شیت یافت نشد.','error-state');
      } else {
        $('#stateBox').innerHTML = '';
        applyFilters();
        if(geo.length){
          map.fitBounds(L.latLngBounds(geo.map(f=>[f.lat,f.lng])).pad(.25));
        }
      }
    })
    .catch(err=>{
      console.error(err);
      showState('❌ خطا در دریافت داده‌ها.<br><small>اتصال اینترنت، لینک انتشار CSV و تنظیمات «Publish to web» را بررسی کنید.<br><small>'+escapeHtml(err.message)+'</small></small>','error-state');
    });
}

/* ---------- رویدادها ---------- */
$('#searchInput').addEventListener('input', applyFilters);
$('#statusFilters').addEventListener('click', e=>{
  if(!e.target.classList.contains('chip')) return;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  e.target.classList.add('active');
  applyFilters();
});
$('#modalClose').addEventListener('click', ()=> $('#modalBackdrop').classList.remove('show'));
$('#modalBackdrop').addEventListener('click', e=>{ if(e.target.id==='modalBackdrop') e.currentTarget.classList.remove('show'); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') $('#modalBackdrop').classList.remove('show'); });
$('#mobileToggle').addEventListener('click', ()=> $('#sidebar').classList.toggle('open'));


/* ---------- تنظیمات اتصال (رمز + مودال) ---------- */
const $pw = () => $('#pwInput');
function openPwModal(){
  $('#pwError').hidden = true;
  $pw().value = '';
  $('#pwBackdrop').classList.add('show');
  setTimeout(()=>$pw().focus(), 50);
}
function tryPassword(){
  if($pw().value === SETTINGS_PASSWORD){
    $('#pwBackdrop').classList.remove('show');
    openSettingsModal();
  } else {
    $('#pwError').hidden = false;
    $pw().select();
  }
}
function openSettingsModal(){
  $('#csvUrlInput').value = (localStorage.getItem('custom_csv_url') || CONFIG.PUBLIC_CSV_URL || '');
  $('#testResult').innerHTML = '';
  $('#settingsBackdrop').classList.add('show');
}
function showToast(msg, ok){
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + (ok ? 'toast-ok' : 'toast-bad');
  t.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>{ t.hidden = true; t.classList.remove('show'); }, 3000);
}

$('#settingsBtn').addEventListener('click', openPwModal);
$('#pwSubmit').addEventListener('click', tryPassword);
$pw().addEventListener('keydown', e=>{ if(e.key==='Enter') tryPassword(); });
$('#pwCancel').addEventListener('click', ()=> $('#pwBackdrop').classList.remove('show'));
$('#pwBackdrop').addEventListener('click', e=>{ if(e.target.id==='pwBackdrop') e.currentTarget.classList.remove('show'); });

$('#settingsClose').addEventListener('click', ()=> $('#settingsBackdrop').classList.remove('show'));
$('#settingsBackdrop').addEventListener('click', e=>{ if(e.target.id==='settingsBackdrop') e.currentTarget.classList.remove('show'); });

$('#saveUrlBtn').addEventListener('click', ()=>{
  const v = $('#csvUrlInput').value.trim();
  if(!v){ showToast('آدرس نمی‌تواند خالی باشد.', false); return; }
  try{ localStorage.setItem('custom_csv_url', v); }catch(e){}
  showToast('✅ آدرس ذخیره شد. در حال بارگذاری مجدد داده‌ها…', true);
  setTimeout(()=>{ $('#settingsBackdrop').classList.remove('show'); loadData(); }, 900);
});
$('#testUrlBtn').addEventListener('click', ()=>{
  const v = $('#csvUrlInput').value.trim();
  const box = $('#testResult');
  if(!v){ box.innerHTML = '<span class="test-bad">❌ آدرس خالی است.</span>'; return; }
  box.innerHTML = '<span class="test-wait">⏳ در حال بررسی اتصال…</span>';
  const u = v + (v.includes('?')?'&':'?') + 'cb=' + Date.now();
  parseCsvRemote(u)
    .then(rows=>{
      if(!rows.length) throw new Error('هیچ ردیفی خوانده نشد (احتمالاً لینک CSV نیست).');
      box.innerHTML = '<span class="test-ok">✅ اتصال برقرار است ('+rows.length+' ردیف خوانده شد).</span>';
    })
    .catch(err=>{
      box.innerHTML = '<span class="test-bad">❌ خطا در اتصال: '+escapeHtml(err.message)+'</span>';
    });
});
$('#resetUrlBtn').addEventListener('click', ()=>{
  try{ localStorage.removeItem('custom_csv_url'); }catch(e){}
  $('#csvUrlInput').value = CONFIG.PUBLIC_CSV_URL || '';
  $('#testResult').innerHTML = '';
  showToast('♻️ به آدرس پیش‌فرض برگردانده شد.', true);
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ $('#pwBackdrop').classList.remove('show'); $('#settingsBackdrop').classList.remove('show'); } });

/* ---------- شروع ---------- */
initMap();
loadData();
