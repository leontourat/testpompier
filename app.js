const KEY="ma-tournee-v1";
let state={year:new Date().getFullYear(),houses:[]};
let currentPage="home", map, markers=[];
const $=id=>document.getElementById(id);
const statuses={to_visit:["🔵","À visiter"],sold:["🟢","Calendrier vendu"],absent:["🟠","Absent"],refused:["🔴","Refus"]};

function load(){try{const raw=localStorage.getItem(KEY);if(raw)state={...state,...JSON.parse(raw)};}catch(e){}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll();}
function money(n){return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(Number(n)||0)}
function fmtDate(d){return d?new Intl.DateTimeFormat("fr-FR",{dateStyle:"short"}).format(new Date(d)):"—"}
function statusBadge(s){const x=statuses[s]||statuses.to_visit;return `<span class="badge ${s}">${x[0]} ${x[1]}</span>`}
function go(page){currentPage=page;document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.dataset.page===page));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.go===page));if(page==="map")setTimeout(()=>{initMap();if(map)setTimeout(()=>map.invalidateSize(true),120)},120);renderAll();}
document.addEventListener("click",e=>{const btn=e.target.closest("[data-go]");if(btn)go(btn.dataset.go);const close=e.target.closest("[data-close]");if(close)closeModal(close.dataset.close)});

function openModal(id){$(id).classList.add("open");$(id).setAttribute("aria-hidden","false")}
function closeModal(id){$(id).classList.remove("open");$(id).setAttribute("aria-hidden","true")}
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));

function openAdd(h=null){
  $("houseForm").reset();$("houseId").value="";$("calendars").value=0;$("amount").value=0;$("status").value="to_visit";$("gpsStatus").textContent="Pas encore enregistrée";$("modalTitle").textContent="Ajouter une maison";
  if(h){$("modalTitle").textContent="Modifier la maison";$("houseId").value=h.id;$("address").value=h.address;$("firstName").value=h.firstName||"";$("lastName").value=h.lastName||"";$("status").value=h.status;$("calendars").value=h.calendars;$("amount").value=h.amount;$("note").value=h.note||"";$("gpsStatus").textContent=h.lat?`${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`:"Pas encore enregistrée";}
  openModal("houseModal");
}
$("quickAdd").onclick=()=>openAdd();$("addHouseBtn").onclick=()=>openAdd();
$("houseForm").onsubmit=e=>{e.preventDefault();const id=$("houseId").value||crypto.randomUUID();const old=state.houses.find(h=>h.id===id);const h={id,address:$("address").value.trim(),firstName:$("firstName").value.trim(),lastName:$("lastName").value.trim(),status:$("status").value,calendars:Number($("calendars").value)||0,amount:Number($("amount").value)||0,note:$("note").value.trim(),lat:old?.lat??null,lng:old?.lng??null,date:old?.date||new Date().toISOString(),year:state.year};const i=state.houses.findIndex(x=>x.id===id);if(i>=0)state.houses[i]=h;else state.houses.unshift(h);closeModal("houseModal");save();};

$("gpsBtn").onclick=()=>{if(!navigator.geolocation){$("gpsStatus").textContent="GPS indisponible";return}navigator.geolocation.getCurrentPosition(pos=>{$("gpsStatus").textContent=`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;$("gpsBtn").dataset.lat=pos.coords.latitude;$("gpsBtn").dataset.lng=pos.coords.longitude;const id=$("houseId").value;if(id){const h=state.houses.find(x=>x.id===id);if(h){h.lat=pos.coords.latitude;h.lng=pos.coords.longitude;save()}}else{window._pendingGPS={lat:pos.coords.latitude,lng:pos.coords.longitude}}},()=>$("gpsStatus").textContent="Position refusée",{enableHighAccuracy:true,timeout:10000});};
$("houseForm").addEventListener("submit",()=>{if(window._pendingGPS){const id=$("houseId").value;const h=state.houses.find(x=>x.id===id)||state.houses[0];if(h){h.lat=window._pendingGPS.lat;h.lng=window._pendingGPS.lng}window._pendingGPS=null;localStorage.setItem(KEY,JSON.stringify(state))}});

function openDetail(id){const h=state.houses.find(x=>x.id===id);if(!h)return;$("detailTitle").textContent=h.address;$("detailContent").innerHTML=`<div class="detail-card">${statusBadge(h.status)}<h3>${esc((h.firstName+" "+h.lastName).trim()||"Personne non renseignée")}</h3><div class="detail-grid"><div><small>Calendriers</small><b>${h.calendars}</b></div><div><small>Montant</small><b>${money(h.amount)}</b></div><div><small>Dernier passage</small><b>${fmtDate(h.date)}</b></div><div><small>Tournée</small><b>${h.year}</b></div></div></div>${h.note?`<div class="detail-card">📝 ${esc(h.note)}</div>`:""}<div class="detail-actions"><button class="secondary-btn" onclick="editHouse('${h.id}')">Modifier</button><button class="danger-btn" onclick="deleteHouse('${h.id}')">Supprimer</button></div>`;openModal("detailModal")}
window.editHouse=id=>{closeModal("detailModal");openAdd(state.houses.find(h=>h.id===id))};
window.deleteHouse=id=>{if(confirm("Supprimer cette maison ?")){state.houses=state.houses.filter(h=>h.id!==id);closeModal("detailModal");save()}};

function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function filtered(){const q=$("searchInput").value.toLowerCase().trim(), f=$("statusFilter").value;return state.houses.filter(h=>(f==="all"||h.status===f)&&(!q||`${h.address} ${h.firstName} ${h.lastName}`.toLowerCase().includes(q))).sort((a,b)=>new Date(b.date)-new Date(a.date))}
$("searchInput").oninput=renderHouses;$("statusFilter").onchange=renderHouses;

function row(h){return `<div class="house-row" onclick="openDetail('${h.id}')"><div class="house-main"><strong>${esc(h.address)}</strong><small>${esc((h.firstName+" "+h.lastName).trim()||"Personne non renseignée")} · ${h.calendars} calendrier${h.calendars>1?"s":""} · ${money(h.amount)}</small></div>${statusBadge(h.status)}</div>`}
function renderHouses(){const list=filtered();$("houseList").innerHTML=list.length?list.map(row).join(""):`<div class="empty">Aucune maison trouvée.<br><br>Ajoute ta première maison avec le bouton +.</div>`}
function renderHome(){const houses=state.houses, visited=houses.filter(h=>h.status!=="to_visit").length, remaining=houses.filter(h=>h.status==="to_visit").length, c=houses.reduce((a,h)=>a+h.calendars,0), m=houses.reduce((a,h)=>a+h.amount,0);$("homeYear").textContent=state.year;$("statVisited").textContent=visited;$("statRemaining").textContent=remaining;$("statCalendars").textContent=c;$("statMoney").textContent=money(m);const recent=houses.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);$("recentList").innerHTML=recent.length?recent.map(row).join(""):`<div class="empty">Aucun passage enregistré pour le moment.</div>`}
function renderStats(){const h=state.houses,c=h.reduce((a,x)=>a+x.calendars,0),m=h.reduce((a,x)=>a+x.amount,0),v=h.filter(x=>x.status!=="to_visit").length,avg=v?m/v:0;$("statsPanel").innerHTML=`<div class="big-stat"><b>${money(m)}</b><span>Total récolté</span></div><div class="big-stat"><b>${c}</b><span>Calendriers vendus</span></div><div class="big-stat"><b>${v}</b><span>Maisons visitées</span></div><div class="big-stat"><b>${money(avg)}</b><span>Moyenne par maison visitée</span></div>`;$("statusStats").innerHTML=Object.entries(statuses).map(([k,x])=>`<div class="status-line"><span>${x[0]} ${x[1]}</span><b>${h.filter(z=>z.status===k).length}</b></div>`).join("")}
function initMap(){if(!window.L)return;if(map)map.remove();map=L.map("map").setView([46.6,-0.33],13);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);markers=[];const points=state.houses.filter(h=>h.lat&&h.lng);points.forEach(h=>{const icon=L.divIcon({className:"custom-marker",html:`<div class="pin ${h.status}"></div>`,iconSize:[18,18],iconAnchor:[9,9],popupAnchor:[0,-9]});const marker=L.marker([h.lat,h.lng],{icon}).addTo(map).bindPopup(`<b>${esc(h.address)}</b><br>${esc((h.firstName+" "+h.lastName).trim()||"Personne non renseignée")}<br>${statuses[h.status][0]} ${statuses[h.status][1]}<br><br><button onclick="openDetail('${h.id}')">Ouvrir la fiche</button>`);markers.push(marker)});if(points.length)map.fitBounds(L.latLngBounds(points.map(h=>[h.lat,h.lng])),{padding:[35,35]});setTimeout(()=>map.invalidateSize(true),150)}
function renderAll(){renderHome();renderHouses();renderStats();if(currentPage==="map"&&map)initMap()}
$("settingsBtn").onclick=()=>{ $("yearInput").value=state.year;openModal("settingsModal")};
$("yearInput").onchange=()=>{state.year=Number($("yearInput").value)||new Date().getFullYear();state.houses.forEach(h=>h.year=h.year||state.year);save()};
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`ma-tournee-${state.year}.json`;a.click();URL.revokeObjectURL(a.href)};
$("importInput").onchange=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);save();closeModal("settingsModal");alert("Sauvegarde importée.")}catch{alert("Fichier invalide.")}};r.readAsText(file)};
$("resetBtn").onclick=()=>{if(confirm("Supprimer toutes les données de cette application ?")){state={year:new Date().getFullYear(),houses:[]};save();closeModal("settingsModal")}};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
load();renderAll();go("home");
