// ==UserScript==
// @name         Glass Slide-In Center Panel v2
// @namespace    http://tampermonkey.net/
// @version      3.66
// @description  Branded slide-in + modal; Storage/SSO/Licenses from tstools JSON; Access from usermgr.jsp; Version/Build from myfavoriteproj.jsp with strict parsing & fallbacks.
// @match        https://*.esko-saas.com/WebCenter/*
// @author       David Cebula (DACE)
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/esko-presales/browser-userscripts/refs/heads/main/wcr-modal-menu.js
// @updateURL    https://raw.githubusercontent.com/esko-presales/browser-userscripts/refs/heads/main/wcr-modal-menu.js
// ==/UserScript==
/*
# codeName: need a better name so we can start selling at fall fairs with grandmas pickles.js
#
# ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~   Notes:   ---------------------------------------
#
#>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Version 2.0 <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
#   Added Additional Corner Button to the Modal to give install details for presales
#
#>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Version 1.0 <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
#   Option Click to see a modal slide out to get you to relevnt menu items when the
#.  Configuration is hiding required menus for admins
*/

(function(){
  "use strict";

  /** Config */
  const DEBUG = false;
  const TSTOOLS_ROOT  = '/WebCenter/tstools/';
  const INDEX_CANDIDATES = ['testresources.json','testsources.json','testsuites.json'];
  const USERMGR_PATH = '/WebCenter/usermgr.jsp';

  /** Helpers */
  const log = (...a)=>DEBUG&&console.log('[wcr]',...a);
  const $ = (sel, root=document)=>root.querySelector(sel);
  const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));
  const esc = (s)=>String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const abs = (root, path)=>{
	if (!path) return root;
	if (/^https?:\/\//i.test(path)) return path;
	if (path.startsWith('/')) return location.origin + path;
	return root.replace(/\/+$/,'/') + path;
  };
  async function getJSON(url){
	const r = await fetch(url, { credentials:'same-origin', cache:'no-cache' });
	if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
	return r.json();
  }
  async function firstJSON(root, names){
	for (const n of names){
	  try { const u = abs(root, n); const d = await getJSON(u); log('index OK', u); return d; }
	  catch(e){ log('index miss', n, e?.message); }
	} return null;
  }

  /** Slide-in panel */
  const idx = location.href.indexOf('/WebCenter/');
  const base = (idx!==-1) ? location.href.slice(0, idx+11) : location.origin + '/WebCenter/';
  const cols = [
	[{label:'Preferences',page:'sitedefaults.jsp'},{label:'Menus',page:'menus.jsp'},{label:'Dashboards',page:'dashboards.jsp'},{label:'Task Lists',page:'mytasktypes.jsp'}],
	[{label:'Searches',page:'mysavedsearches.jsp'},{label:'Projects',page:'projsearch.jsp'},{label:'Documents',page:'alldocsearch.jsp'},{label:'Tasks',page:'wctasksearch.jsp'}],
	[{label:'Favourites',page:'myfavoriteproj.jsp'},{label:'Projects',page:'myallprojects.jsp'},{label:'Categories',page:'attcategorymgr.jsp'},{label:'Lists',page:'lists.jsp'}]
  ];

  const slide = document.createElement('div');
  slide.id = 'tm-slide-panel';
  slide.innerHTML = `
	<div id="tm-link-container">
	  ${cols.map(col=>`<div class="tm-col">${
		col.map(l=>`<a data-href="${base}${l.page}">${l.label}</a>`).join('')
	  }</div>`).join('')}
	</div>
	<button id="tm-help-btn" type="button" title="System info">?</button>
  `;
  document.body.appendChild(slide);

  slide.addEventListener('click', e=>{
	const a = e.target.closest('a[data-href]');
	if (!a) return;
	e.preventDefault();
	const t = window.open(a.dataset.href, '_blank'); t&&t.focus();
	slide.style.left='-100%';
  });

  let hold=null;
  document.addEventListener('keydown', e=>{
	if (e.key==='Alt' && !hold){ hold=setTimeout(()=>{ slide.style.left='33%'; }, 1000); }
  });
  document.addEventListener('keyup', e=>{
	if (e.key==='Alt'){ clearTimeout(hold); hold=null; slide.style.left='-100%'; }
  });

  /** Modal */
  const overlay = document.createElement('div');
  overlay.id='tm-modal-overlay';
  overlay.innerHTML = `
	<div id="tm-modal" role="dialog" aria-modal="true" aria-labelledby="tm-modal-title">
	  <div id="tm-modal-header">
		<img id="tm-title-logo" alt="WebCenter" src="https://www.esko.com/static/uploads/2024/04/webcenter.svg">
		<span id="tm-modal-title">WebCenter …</span>
	  </div>
	  <div id="tm-modal-subtle">Build: —</div>
	  <button id="tm-modal-close" type="button" aria-label="Close">×</button>

	  <div id="tm-modal-content">
		<div class="tm-bar" id="tm-bar-web"><div class="tm-bar-label">Web Server</div><div class="tm-pill"><div class="tm-pill-fill"></div></div><div class="tm-pill-text">…</div></div>
		<div class="tm-bar" id="tm-bar-app"><div class="tm-bar-label">App Server</div><div class="tm-pill"><div class="tm-pill-fill"></div></div><div class="tm-pill-text">…</div></div>
		<div class="tm-bar" id="tm-bar-file"><div class="tm-bar-label">Filestore</div><div class="tm-pill"><div class="tm-pill-fill"></div></div><div class="tm-pill-text">…</div></div>

		<div class="tm-sep"></div>

		<div id="tm-licenses">
		  <div class="tm-sub">Licenses</div><br>
		  <div class="tm-lic-cols">
			<ul class="tm-list" id="tm-lic-col1"></ul>
			<ul class="tm-list" id="tm-lic-col2"></ul>
		  </div>
		</div>

		<div class="tm-sep"></div>

		<div class="tm-bar" id="tm-bar-sso"><div class="tm-bar-label">SSO Configuration</div><div class="tm-pill"><div class="tm-pill-fill"></div></div><div class="tm-pill-text">Configured: N/A</div></div>

		<div id="tm-usermgr">
		  <div class="tm-sub">User Access</div><br>
		  <div class="tm-kvline tm-kv-center" id="tm-access-line">License Model: —  Purchased: — |  Active Users: — |  Total Users: —</div>
		</div>
	  </div>
	</div>
  `;
  document.body.appendChild(overlay);

  $('#tm-help-btn').addEventListener('click', e=>{ e.stopPropagation(); openModal(); });
  $('#tm-modal-close', overlay).addEventListener('click', ()=>overlay.style.display='none');
  overlay.addEventListener('click', e=>{ if (!e.target.closest('#tm-modal')) overlay.style.display='none'; });

  function openModal(){
	overlay.style.display='flex';
	updateVersionAndBuildFromMyFav(); // <-- use working JSP-based parser
	loadAllData();
  }

  /** Styles */
  const css = document.createElement('style');
  css.textContent = `
	:root{ --tm-graphite:#444B53; --tm-lime:#A6C044; --tm-light:#F5F7FF; --tm-blue:#0B6CF0; --tm-orange:#FFA640; --tm-sep:#D7DBE0; --tm-qmark-size:22px; --tm-logo-size:31px; --tm-title-size:26px; }
	#tm-slide-panel{ position:fixed; top:50%; left:-100%; transform:translate(-50%,-50%); padding:40px; background:rgba(255,255,255,.2);
	  color:#000; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); transition:left .3s ease; z-index:9999;
	  box-shadow:0 4px 20px rgba(0,0,0,.3); border-radius:.1in; border:1px solid rgba(255,255,255,.4); max-width:90%; box-sizing:border-box; }
	#tm-link-container{ display:flex; column-gap:40px; } .tm-col{ display:flex; flex-direction:column; } .tm-col a{ color:#000; text-decoration:none; font-weight:bold; margin:4px 0; cursor:pointer; }
	#tm-help-btn{ position:absolute; top:8px; right:8px; width:var(--tm-qmark-size); height:var(--tm-qmark-size); padding:0; border-radius:50%; border:1px solid #bdbdbd; background:#eee; color:#555; font-weight:700; line-height:calc(var(--tm-qmark-size)-2px); text-align:center; cursor:pointer; }

	#tm-modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index:10001; display:none; }
	#tm-modal{
	  width:520px; max-width:90vw; max-height:85vh; padding:12px 18px 12px;
	  background:var(--tm-light); color:var(--tm-graphite); border-radius:.1in; border:1px solid rgba(0,0,0,.08); box-shadow:0 6px 18px rgba(0,0,0,.2);
	  display:flex; flex-direction:column; position:relative; overflow:hidden;
	}
	#tm-modal-header{ display:flex; align-items:center; justify-content:center; gap:14px; margin:0 28px 2px; color:var(--tm-graphite); font-weight:800; font-size:var(--tm-title-size); white-space:nowrap; }
	#tm-title-logo{ width:var(--tm-logo-size); height:var(--tm-logo-size); }
	#tm-modal-subtle{ color:#9EA6B0; font-size:13.5px; font-weight:700; text-align:center; margin-top:-2px; margin-bottom:8px; }
	#tm-modal-close{ position:absolute; top:6px; right:8px; width:24px; height:24px; padding:0; border-radius:50%; border:1px solid #bdbdbd; background:#fff; color:#555; font-weight:700; line-height:22px; text-align:center; cursor:pointer; }

	#tm-modal-content{ font-size:13px; display:flex; flex-direction:column; gap:10px; overflow:auto; }

	.tm-bar{ display:flex; align-items:center; gap:10px; } .tm-bar-label{ min-width:140px; font-weight:700; }
	.tm-pill{ flex:1 1 auto; height:18px; background:rgba(68,75,83,.25); border:1px solid rgba(68,75,83,.35); border-radius:999px; position:relative; overflow:hidden; }
	.tm-pill-fill{ position:absolute; left:0; top:0; bottom:0; width:0%; background:var(--tm-lime); border-right:1px solid rgba(0,0,0,.15); transition:width .35s ease; }
	.tm-pill-fill.warn{ background:var(--tm-orange); }
	.tm-pill-text{ margin-left:6px; min-width:170px; font-weight:600; }

	.tm-sub{ font-weight:800; margin-top:2px; text-align:center; }
	.tm-sep{ height:1px; background:var(--tm-sep); opacity:.85; margin:6px 0 4px; }

	/* Two real blocks for licenses */
	.tm-lic-cols{ display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:start; }
	.tm-list{ list-style:none; padding:0; margin:0; color:var(--tm-graphite) !important; font-size:14px; line-height:1.35; }
	.tm-list li{ display:flex; align-items:flex-start; gap:6px; margin:2px 0; }
	.tm-list li .chk{ width:14px; text-align:center; font-weight:900; }
	.tm-list li .chk.blue{ color:var(--tm-blue); }
	.tm-list li .chk.green{ color:var(--tm-lime) !important; }
	.tm-list li .label{ color:var(--tm-graphite) !important; font-size:14px; }
	.tm-list li.priority .label{ font-weight:800; }

	/* Access line centered */
	.tm-kvline{ display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap; text-align:center; }
	.tm-kvline.tm-kv-center{ justify-content:center; }
	.tm-kvline .blk{ font-weight:700; }
	.tm-kvline .muted{ opacity:.85; }
	.tm-kvline .pipe{ opacity:.55; }
  `;
  document.head.appendChild(css);

  /** Version & Build from /WebCenter/myfavoriteproj.jsp (DOMParser; handles “Build r14”) */
  async function updateVersionAndBuildFromMyFav(){
	const titleEl = $('#tm-modal-title');
	const subtle  = $('#tm-modal-subtle');
	let version=null, build=null;

	try {
	  const res  = await fetch(location.origin + '/WebCenter/myfavoriteproj.jsp', { credentials:'same-origin', cache:'no-cache' });
	  const html = await res.text();
	  const doc  = new DOMParser().parseFromString(html, 'text/html');
	  const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();

	  version =
		(text.match(/\b(?:WebCenter\s*)?((?:\d{2}\.\d{2})(?:\.\d+)*)\b/)||[])[1] || null;

	  let mBuild =
		text.match(/\bbuildString\b["']?\s*[:=]\s*["']?([A-Za-z0-9._:-]{2,})["']?/i) ||
		text.match(/\bBuild\s+(?:String|No\.?|Number|ID)\s*[:=]?\s*([A-Za-z0-9._:-]{2,})\b/i) ||
		text.match(/\bBuild\s*(?:Version|ID)?\s*[:=]?\s*(?!String\b)([A-Za-z0-9._:-]{2,})\b/i) ||
		text.match(/\bBuild\s+(?!String\b)([Rr]\d{1,5})\b/);

	  build = mBuild ? mBuild[1] : null;

	  if (build) {
		build = build.replace(/^["'\s:]+|["'\s:]+$/g,'');
		if (!/[A-Za-z0-9]/.test(build) || /^string$/i.test(build)) build = null;
	  }
	} catch(e) { log('version/build fetch fail', e?.message); }

	titleEl.textContent = `WebCenter ${version || '—'}`;
	subtle.textContent  = `Build: ${build || '—'}`;
  }

  /** Data loads */
  async function loadAllData(){
	try{
	  const [a,b] = await Promise.all([ loadTSTools(), loadAccess() ]);
	  applyTSTools(a);
	  applyAccess(b);
	}catch(e){ log('loadAllData error', e); }
  }

  async function loadTSTools(){
	const root = location.origin + TSTOOLS_ROOT;
	const idx = await firstJSON(root, INDEX_CANDIDATES);
	if (!idx || !idx.testsources) throw new Error('no tstools index');

	const tests = (await Promise.all(idx.testsources.map(async(ts)=>{
	  try{ const url = abs(root, ts.src); const data = await getJSON(url); return Array.isArray(data?.tests) ? data.tests : []; }
	  catch(_){ return []; }
	}))).flat();

	const byTitle = re => tests.find(t => re.test(String(t.title||'')));
	const tWeb  = byTitle(/Web\s*Server\s*Disk\s*Space/i);
	const tApp  = byTitle(/Application\s*Server\s*Disk\s*Space/i);
	const tFile = byTitle(/Filestore\s*Disk\s*Space/i);
	const tSSO  = byTitle(/SSO\s*(?:Certificate|Configuration)\s*Check/i);
	const tLic  = byTitle(/License\s*Check/i);

	async function exec(t){ if(!t) return null; try{ const j = await getJSON(abs(root, t.url)); return j?.result||null; }catch(_){ return null; } }

	const [rWeb, rApp, rFile, rSSO, rLic] = await Promise.all([exec(tWeb),exec(tApp),exec(tFile),exec(tSSO),exec(tLic)]);

	return {
	  web:  parseDisk(rWeb),
	  app:  parseDisk(rApp),
	  file: parseDisk(rFile, true),
	  sso:  parseSSO(rSSO),
	  modules: parseLicenses(rLic)
	};
  }

  async function loadAccess(){
	try{
	  const r = await fetch(location.origin + USERMGR_PATH, { credentials:'same-origin', cache:'no-cache' });
	  if (!r.ok) throw new Error(`HTTP ${r.status}`);
	  const html = await r.text();
	  const doc = new DOMParser().parseFromString(html,'text/html');

	  // License type + purchased (Concurrent row preferred)
	  const scope = $('#license-info', doc) || doc;
	  const table = scope.querySelector('.wcr-table table') || scope.querySelector('table');
	  let licType=null, purchased=null;
	  if (table){
		let rows = $$('tbody tr', table); if (!rows.length) rows = $$('tr', table).slice(1);
		const row = rows.find(tr=>/concurrent/i.test(tr.textContent)) || rows[0];
		if (row){
		  const cells = $$('td,th', row).map(td=>(td.textContent||'').replace(/\s+/g,' ').trim());
		  if (cells[0]) licType = cells[0].replace(/\blicenses?\b/i,'').trim();
		  for (let i=1;i<cells.length;i++){ const m=cells[i].match(/^\d+/); if(m){ purchased=+m[0]; break; } }
		}
	  }

	  // Users
	  const user = $('#user-info', doc) || doc;
	  const pull = (re)=>{
		for (const g of $$('.form-group, .user-info-row', user)){
		  const lbl=(g.querySelector('label, abbr')?.textContent||'').trim();
		  if (re.test(lbl)){ const p=g.querySelector('.form-entry.value p'); const m=p?.textContent?.match(/\d+/); return m?+m[0]:null; }
		} return null;
	  };
	  return { licType, purchased, totalUsers: pull(/total\s*users/i), activeUsers: pull(/active\s*users/i) };
	}catch(e){ log('access err', e); return {}; }
  }

  /** Parsers */
  function parseDisk(res, preferDetails=false){
	if (!res) return null;
	const grab = s=>{
	  if (!s) return null;
	  const m = /(\d+(?:\.\d+)?)\s*out of\s*(\d+(?:\.\d+)?)\s*GB\s*remaining/i.exec(s);
	  return m ? { remaining:+m[1], total:+m[2] } : null;
	};
	let p = grab(res.description);
	if (p) return p;
	if (preferDetails && res.details){
	  let worst=null, min=Infinity;
	  res.details.split(/\n| - /).forEach(line=>{
		const q=grab(line); if(q && q.total>0){ const r=q.remaining/q.total; if(r<min){min=r; worst=q;} }
	  });
	  if (worst) return worst;
	}
	return grab(res.details)||null;
  }
  function parseSSO(res){
	if (!res) return null;
	const t = `${res.description||''}\n${res.details||''}`;
	const c = (t.match(/Found\s+(\d+)\s+SSO\s+certificates?/i)||[])[1];
	const noneExpired = /none\s+are\s+expired/i.test(t);
	const anyExpired  = /expired/i.test(t) && !noneExpired;
	return { count: c?+c:null, healthy: noneExpired ? true : (anyExpired ? false : null) };
  }
  function parseLicenses(res){
	const out=[]; if(!res) return out;
	const text = String(res.details || res.description || '').trim(); if(!text) return out;
	const after = (text.match(/Overview of available modules:\s*([\s\S]+)/i)||[])[1] || text;

	after.split(/\n/).forEach(line=>{
	  const m=line.match(/^\s*[–\-•]\s*(.+?)\s*$/); if(m&&m[1]) out.push(m[1]);
	});
	if (!out.length){
	  after.split(/\s+[–\-]\s+/).forEach(part=>{
		const c=part.trim(); if(c && !/^Overview of available modules:?$/i.test(c)) out.push(c);
	  });
	}
	return Array.from(new Set(out.map(s=>s.replace(/\s+/g,' ').trim()))).filter(Boolean);
  }

  /** Apply to UI */
  function setBar(sel, remaining, total){
	const row=$(sel); if(!row) return;
	const fill=$('.tm-pill-fill',row), txt=$('.tm-pill-text',row);
	if(!remaining||!total||total<=0){ fill.style.width='0%'; fill.classList.remove('warn'); txt.textContent='N/A'; return; }
	const pct=Math.max(0,Math.min(100,(remaining/total)*100));
	fill.style.width=pct.toFixed(1)+'%'; fill.classList.remove('warn');
	txt.textContent=`${remaining} of ${total} GB remaining`;
  }
  function setSSO(count, healthy){
	const row=$('#tm-bar-sso'); if(!row) return;
	const fill=$('.tm-pill-fill',row), txt=$('.tm-pill-text',row);
	txt.textContent=`Configured: ${typeof count==='number'?count:'N/A'}`;
	fill.classList.remove('warn');
	if(healthy===true) fill.style.width='100%';
	else if(healthy===false){ fill.style.width='0%'; fill.classList.add('warn'); }
	else fill.style.width='0%';
  }

  // Only two priority items (green ✓ + bold rename). PackShots is regular/blue.
  const PRIORITY = [
	{ re:/Packaging\s+Content\s+Management/i, display:'Content Management Packaging' },
	{ re:/ESKO\s+Advanced\s+Color/i,          display:'Color Trace' }
  ];
  function setLicenses(mods){
	const col1=$('#tm-lic-col1'), col2=$('#tm-lic-col2'); if(!col1||!col2) return;
	col1.innerHTML=''; col2.innerHTML='';
	const seen=new Set(); const norm=s=>s.replace(/\s*\(.*?\)\s*$/,'').trim();

	const prioritized=[], others=[];
	(mods||[]).forEach(raw=>{
	  const base=norm(raw); let hit=false;
	  for (const p of PRIORITY){
		if(p.re.test(base)){ const key=p.display; if(!seen.has(key)){ prioritized.push({label:p.display, priority:true}); seen.add(key);} hit=true; break; }
	  }
	  if(!hit){ if(!seen.has(base)){ others.push({label:base, priority:false}); seen.add(base);} }
	});

	const list = [...prioritized, ...others];
	const mid = Math.ceil(list.length/2);
	const left = list.slice(0, mid);
	const right= list.slice(mid);

	const render = (li, item)=>{
	  li.className = item.priority ? 'priority' : '';
	  const chkClass = item.priority ? 'chk green' : 'chk blue';
	  li.innerHTML = `<span class="${chkClass}">✓</span><span class="label">${esc(item.label)}</span>`;
	};

	left.forEach(item=>{ const li=document.createElement('li'); render(li,item); col1.appendChild(li); });
	right.forEach(item=>{ const li=document.createElement('li'); render(li,item); col2.appendChild(li); });
  }

  function applyTSTools(d){
	setBar('#tm-bar-web',  d.web?.remaining,  d.web?.total);
	setBar('#tm-bar-app',  d.app?.remaining,  d.app?.total);
	setBar('#tm-bar-file', d.file?.remaining, d.file?.total);
	setSSO(d.sso?.count, d.sso?.healthy);
	setLicenses(d.modules||[]);
  }

  function applyAccess(u){
	const licType = (u?.licType || '—');
	const purchased = (typeof u?.purchased==='number' ? u.purchased : '—');
	const total = (typeof u?.totalUsers==='number' ? u.totalUsers : '—');
	const active = (typeof u?.activeUsers==='number' ? u.activeUsers : '—');

	const line = `License Model: ${licType}  Purchased: ${purchased} |  Active Users: ${active} |  Total Users: ${total}`;
	$('#tm-access-line').textContent = line;
  }

})();
