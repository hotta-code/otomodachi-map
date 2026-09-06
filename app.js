const TOTAL=47;
const STORAGE_KEY="otomodachi-map-pref-v2";
const OVERSEAS_KEY="otomodachi-map-overseas-v2";

const PREF={
  1:"北海道",2:"青森県",3:"岩手県",4:"宮城県",5:"秋田県",6:"山形県",7:"福島県",
  8:"茨城県",9:"栃木県",10:"群馬県",11:"埼玉県",12:"千葉県",13:"東京都",14:"神奈川県",
  15:"新潟県",16:"富山県",17:"石川県",18:"福井県",19:"山梨県",20:"長野県",21:"岐阜県",
  22:"静岡県",23:"愛知県",24:"三重県",25:"滋賀県",26:"京都府",27:"大阪府",28:"兵庫県",
  29:"奈良県",30:"和歌山県",31:"鳥取県",32:"島根県",33:"岡山県",34:"広島県",35:"山口県",
  36:"徳島県",37:"香川県",38:"愛媛県",39:"高知県",40:"福岡県",41:"佐賀県",42:"長崎県",
  43:"熊本県",44:"大分県",45:"宮崎県",46:"鹿児島県",47:"沖縄県"
};

const REGIONS=[
  {name:"北海道",ids:[1],color:"#69add0"},
  {name:"東北",ids:[2,3,4,5,6,7],color:"#65b8b2"},
  {name:"関東",ids:[8,9,10,11,12,13,14],color:"#6fad75"},
  {name:"中部",ids:[15,16,17,18,19,20,21,22,23],color:"#e8c454"},
  {name:"関西",ids:[24,25,26,27,28,29,30],color:"#dda364"},
  {name:"中国",ids:[31,32,33,34,35],color:"#a888bd"},
  {name:"四国",ids:[36,37,38,39],color:"#d98691"},
  {name:"九州・沖縄",ids:[40,41,42,43,44,45,46,47],color:"#df7168"}
];
const COLOR=new Map(REGIONS.flatMap(r=>r.ids.map(id=>[id,r.color])));
const DISPLAY_BOUNDS={minLon:123.6,maxLon:146.2,minLat:24,maxLat:45.8};

const E={
  svg:document.getElementById("japanMap"),
  visited:document.getElementById("visitedCount"),
  grand:document.getElementById("grandTotal"),
  grandBottom:document.getElementById("grandTotalBottom"),
  list:document.getElementById("prefectureList"),
  visitedFooter:document.getElementById("visitedFooter"),
  regionList:document.getElementById("regionList"),
  japanTotal:document.getElementById("japanTotal"),
  overseasTotal:document.getElementById("overseasTotal"),
  overseasForm:document.getElementById("overseasForm"),
  overseasName:document.getElementById("overseasName"),
  overseasCount:document.getElementById("overseasCount"),
  overseasList:document.getElementById("overseasList"),
  overseasCountries:document.getElementById("overseasCountries"),
  overseasSummaryTotal:document.getElementById("overseasSummaryTotal"),
  overseasSummaryCountries:document.getElementById("overseasSummaryCountries"),
  selectedName:document.getElementById("selectedName"),
  friendInput:document.getElementById("friendInput"),
  minus:document.getElementById("minusButton"),
  plus:document.getElementById("plusButton"),
  apply:document.getElementById("applyButton"),
  reset:document.getElementById("resetButton"),
  screenshot:document.getElementById("screenshotButton"),
  pdf:document.getElementById("pdfButton"),
  png:document.getElementById("pngButton"),
  share:document.getElementById("shareButton")
};

let state=loadState();
let overseas=loadOverseas();
let selected=13;
const paths=new Map();

init();

function init(){
  if(!window.JAPAN_PREFECTURES_GEOJSON){
    E.svg.outerHTML="<p>日本地図を読み込めませんでした。</p>";
    return;
  }
  buildMap(window.JAPAN_PREFECTURES_GEOJSON);
  E.overseasForm.addEventListener("submit",addOverseas);
  E.minus.addEventListener("click",()=>changeSelected(-1));
  E.plus.addEventListener("click",()=>changeSelected(1));
  E.apply.addEventListener("click",applySelected);
  E.friendInput.addEventListener("keydown",e=>{if(e.key==="Enter")applySelected()});
  E.reset.addEventListener("click",resetAll);
  E.screenshot.addEventListener("click",toggleScreenshot);
  E.pdf.addEventListener("click",()=>window.print());
  E.png.addEventListener("click",savePng);
  E.share.addEventListener("click",shareMap);
  render();
  selectPrefecture(13,false);
}

function loadState(){
  try{
    const v=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!v||typeof v!=="object")return {};
    return Object.fromEntries(Object.entries(v).map(([id,n])=>[+id,Math.max(0,Math.floor(+n||0))]).filter(([id,n])=>PREF[id]&&n>0));
  }catch{return {}}
}
function loadOverseas(){
  try{
    const v=JSON.parse(localStorage.getItem(OVERSEAS_KEY));
    return Array.isArray(v)?v.map(x=>({name:String(x.name||"").trim(),count:Math.max(1,Math.floor(+x.count||1))})).filter(x=>x.name):[];
  }catch{return []}
}
function persist(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  localStorage.setItem(OVERSEAS_KEY,JSON.stringify(overseas));
}
function count(id){return state[id]||0}
function getOverseasTotal(){return overseas.reduce((s,x)=>s+x.count,0)}

function buildMap(geojson){
  const features=geojson.features.map(trimFeature);
  const bounds=getBounds(features);
  const width=760,height=980,margin=4;
  const scale=Math.min((width-margin*2)/(bounds.maxLon-bounds.minLon),(height-margin*2)/(bounds.maxLat-bounds.minLat));
  const mapWidth=(bounds.maxLon-bounds.minLon)*scale,mapHeight=(bounds.maxLat-bounds.minLat)*scale;
  const offsetX=(width-mapWidth)/2,offsetY=(height-mapHeight)/2;
  const project=([lon,lat])=>[offsetX+(lon-bounds.minLon)*scale,offsetY+(bounds.maxLat-lat)*scale];
  E.svg.setAttribute("viewBox",`${offsetX-margin} ${offsetY-margin} ${mapWidth+margin*2} ${mapHeight+margin*2}`);
  const g=document.createElementNS("http://www.w3.org/2000/svg","g");
  E.svg.appendChild(g);
  features.sort((a,b)=>a.properties.id-b.properties.id).forEach(f=>{
    const id=+f.properties.id;
    const p=document.createElementNS("http://www.w3.org/2000/svg","path");
    p.setAttribute("d",geometryToPath(f.geometry,project));
    p.setAttribute("class","prefecture");
    p.setAttribute("tabindex","0");
    p.setAttribute("aria-label",PREF[id]);
    p.addEventListener("click",()=>selectPrefecture(id,true));
    p.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectPrefecture(id,true)}});
    g.appendChild(p);paths.set(id,p);
  });
}
function trimFeature(feature){
  const polygons=feature.geometry.type==="Polygon"?[feature.geometry.coordinates]:feature.geometry.coordinates;
  const kept=polygons.filter(poly=>(poly[0]||[]).some(([lon,lat])=>lon>=DISPLAY_BOUNDS.minLon&&lon<=DISPLAY_BOUNDS.maxLon&&lat>=DISPLAY_BOUNDS.minLat&&lat<=DISPLAY_BOUNDS.maxLat));
  return {...feature,geometry:{type:"MultiPolygon",coordinates:kept.length?kept:polygons}};
}
function getBounds(features){
  const b={minLon:Infinity,maxLon:-Infinity,minLat:Infinity,maxLat:-Infinity};
  features.forEach(f=>visitCoordinates(f.geometry.coordinates,([lon,lat])=>{b.minLon=Math.min(b.minLon,lon);b.maxLon=Math.max(b.maxLon,lon);b.minLat=Math.min(b.minLat,lat);b.maxLat=Math.max(b.maxLat,lat)}));
  return b;
}
function visitCoordinates(coords,cb){if(typeof coords[0]==="number")return cb(coords);coords.forEach(x=>visitCoordinates(x,cb))}
function geometryToPath(geometry,project){
  const polygons=geometry.type==="Polygon"?[geometry.coordinates]:geometry.coordinates;
  return polygons.map(poly=>poly.map(ring=>ring.map((pt,i)=>{const[x,y]=project(pt);return`${i?"L":"M"}${x.toFixed(2)} ${y.toFixed(2)}`}).join(" ")+" Z").join(" ")).join(" ");
}

function selectPrefecture(id,focusInput){
  selected=id;
  E.selectedName.textContent=PREF[id];
  E.friendInput.value=count(id);
  renderMap();
  if(focusInput){E.friendInput.focus();E.friendInput.select()}
}
function changeSelected(delta){
  const n=Math.max(0,Math.min(9999,count(selected)+delta));
  if(n)state[selected]=n;else delete state[selected];
  E.friendInput.value=n;persist();render();
}
function applySelected(){
  const n=Math.max(0,Math.min(9999,Math.floor(+E.friendInput.value||0)));
  if(n)state[selected]=n;else delete state[selected];
  persist();render();
}
function addOverseas(e){
  e.preventDefault();
  const name=E.overseasName.value.trim(),n=Math.max(1,Math.min(9999,Math.floor(+E.overseasCount.value||1)));
  if(!name)return;
  const existing=overseas.find(x=>x.name.toLocaleLowerCase("ja")===name.toLocaleLowerCase("ja"));
  if(existing)existing.count=n;else overseas.push({name,count:n});
  E.overseasName.value="";E.overseasCount.value="1";persist();render();
}
function removeOverseas(i){overseas.splice(i,1);persist();render()}
function resetAll(){
  if(!confirm("おともだちMAPの記録をすべて初期化しますか？"))return;
  state={};overseas=[];persist();render();selectPrefecture(13,false);
}
function toggleScreenshot(){
  const active=document.body.classList.toggle("screenshot-mode");
  E.screenshot.textContent=active?"通常表示に戻る":"▣ スクショ表示";
  window.scrollTo({top:0,behavior:"smooth"});
}
function render(){
  const ids=Object.keys(state).map(Number).filter(id=>count(id)>0).sort((a,b)=>count(b)-count(a)||a-b);
  const japan=ids.reduce((s,id)=>s+count(id),0),ot=getOverseasTotal(),grand=japan+ot;

  E.visited.textContent=ids.length;E.visitedFooter.textContent=ids.length;
  E.grand.textContent=grand;E.grandBottom.textContent=`${grand}体`;
  E.japanTotal.textContent=`${japan}体`;E.overseasTotal.textContent=`${ot}体`;

  E.list.innerHTML=ids.length?ids.map(id=>`<div class="pref-row"><button type="button" data-id="${id}">${PREF[id]}</button><strong>${count(id)}体</strong></div>`).join(""):'<p class="empty">まだいません</p>';
  E.list.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>selectPrefecture(+b.dataset.id,true)));

  E.overseasList.innerHTML=overseas.length?overseas.map((x,i)=>`<div class="overseas-row"><span>${escapeHtml(x.name)}</span><strong>${x.count}体</strong><button type="button" data-i="${i}" aria-label="削除">×</button></div>`).join(""):'<p class="empty">まだいません</p>';
  E.overseasList.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>removeOverseas(+b.dataset.i)));
  E.overseasCountries.textContent=overseas.length;
  E.overseasSummaryTotal.textContent=ot;
  E.overseasSummaryCountries.textContent=overseas.length;

  E.regionList.innerHTML=REGIONS.map(r=>{
    const n=r.ids.reduce((s,id)=>s+count(id),0);
    return `<div class="region-row"><i class="region-dot" style="background:${r.color}"></i><span>${r.name}エリア</span><strong>${n}体</strong></div>`;
  }).join("");

  E.friendInput.value=count(selected);
  renderMap();
}
function renderMap(){
  paths.forEach((p,id)=>{
    p.style.fill=count(id)>0?COLOR.get(id):"#eadfce";
    p.classList.toggle("selected",id===selected);
  });
}
async function savePng(){
  if(typeof html2canvas==="undefined"){alert("画像保存機能を読み込めませんでした。");return}
  const wasScreenshot=document.body.classList.contains("screenshot-mode");
  if(!wasScreenshot)document.body.classList.add("screenshot-mode");
  try{
    const canvas=await html2canvas(document.getElementById("appShell"),{
      backgroundColor:"#f7ecd9",scale:2,useCORS:true,logging:false
    });
    const a=document.createElement("a");
    a.download=`otomodachi-map-${new Date().toISOString().slice(0,10)}.png`;
    a.href=canvas.toDataURL("image/png");
    a.click();
  }finally{
    if(!wasScreenshot)document.body.classList.remove("screenshot-mode");
  }
}
async function shareMap(){
  const data={title:"ほっぺくんのおともだちMAP",text:"ほっぺくんのおともだちMAP",url:location.href};
  if(navigator.share){
    try{await navigator.share(data)}catch(e){}
  }else{
    try{await navigator.clipboard.writeText(location.href);alert("URLをコピーしました。")}
    catch(e){prompt("このURLをコピーしてください",location.href)}
  }
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
