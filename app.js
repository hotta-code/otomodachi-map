const STORAGE_KEY="hoppekun-otomodachi-pref-v1";
const OVERSEAS_KEY="hoppekun-otomodachi-over-v1";
const PREF={1:"北海道",2:"青森県",3:"岩手県",4:"宮城県",5:"秋田県",6:"山形県",7:"福島県",8:"茨城県",9:"栃木県",10:"群馬県",11:"埼玉県",12:"千葉県",13:"東京都",14:"神奈川県",15:"新潟県",16:"富山県",17:"石川県",18:"福井県",19:"山梨県",20:"長野県",21:"岐阜県",22:"静岡県",23:"愛知県",24:"三重県",25:"滋賀県",26:"京都府",27:"大阪府",28:"兵庫県",29:"奈良県",30:"和歌山県",31:"鳥取県",32:"島根県",33:"岡山県",34:"広島県",35:"山口県",36:"徳島県",37:"香川県",38:"愛媛県",39:"高知県",40:"福岡県",41:"佐賀県",42:"長崎県",43:"熊本県",44:"大分県",45:"宮崎県",46:"鹿児島県",47:"沖縄県"};
const REGIONS=[
{name:"北海道",ids:[1],color:"#74b7eb"},
{name:"東北",ids:[2,3,4,5,6,7],color:"#8ed18f"},
{name:"関東",ids:[8,9,10,11,12,13,14],color:"#b5e56a"},
{name:"中部",ids:[15,16,17,18,19,20,21,22,23],color:"#f4cf54"},
{name:"近畿",ids:[24,25,26,27,28,29,30],color:"#ffad4c"},
{name:"中国",ids:[31,32,33,34,35],color:"#ff8f8c"},
{name:"四国",ids:[36,37,38,39],color:"#ef77ad"},
{name:"九州・沖縄",ids:[40,41,42,43,44,45,46,47],color:"#af8ee9"}];
const COLOR=new Map(REGIONS.flatMap(r=>r.ids.map(id=>[id,r.color])));
const B={minLon:123.6,maxLon:146.2,minLat:24,maxLat:45.8};
const $=id=>document.getElementById(id);
const E={svg:$("japanMap"),visited:$("visitedCount"),grand:$("grandTotal"),overSum:$("overseasSummaryTotal"),overCountries:$("overseasSummaryCountries"),prefList:$("prefectureList"),overForm:$("overseasForm"),overName:$("overseasName"),overCount:$("overseasCount"),overList:$("overseasList"),overFooter:$("overseasCountries"),regions:$("regionList"),japan:$("japanTotal"),overseas:$("overseasTotal"),selected:$("selectedName"),input:$("friendInput"),minus:$("minusButton"),plus:$("plusButton"),apply:$("applyButton"),reset:$("resetButton"),png:$("pngButton"),pdf:$("pdfButton"),share:$("shareButton")};
let state=load(STORAGE_KEY,{}),over=load(OVERSEAS_KEY,[]),sel=13,paths=new Map();
init();

function load(k,f){try{const v=JSON.parse(localStorage.getItem(k));return v??f}catch{return f}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));localStorage.setItem(OVERSEAS_KEY,JSON.stringify(over))}
function c(id){return Math.max(0,+state[id]||0)}
function overTotal(){return over.reduce((s,x)=>s+x.count,0)}
function init(){
 if(!window.JAPAN_PREFECTURES_GEOJSON){alert("日本地図データを読み込めませんでした。");return}
 buildMap(window.JAPAN_PREFECTURES_GEOJSON);
 E.overForm.addEventListener("submit",addOver);
 E.minus.onclick=()=>change(-1);E.plus.onclick=()=>change(1);E.apply.onclick=apply;E.input.addEventListener("keydown",e=>{if(e.key==="Enter")apply()});
 E.reset.onclick=resetAll;E.png.onclick=savePng;E.pdf.onclick=()=>print();E.share.onclick=shareMap;
 select(13,false);render();
}
function trimFeature(f){
 const polys=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;
 const kept=polys.filter(p=>(p[0]||[]).some(([lon,lat])=>lon>=B.minLon&&lon<=B.maxLon&&lat>=B.minLat&&lat<=B.maxLat));
 return {...f,geometry:{type:"MultiPolygon",coordinates:kept.length?kept:polys}}
}
function visit(x,cb){if(typeof x[0]==="number")return cb(x);x.forEach(y=>visit(y,cb))}
function bounds(fs){const b={minLon:Infinity,maxLon:-Infinity,minLat:Infinity,maxLat:-Infinity};fs.forEach(f=>visit(f.geometry.coordinates,([x,y])=>{b.minLon=Math.min(b.minLon,x);b.maxLon=Math.max(b.maxLon,x);b.minLat=Math.min(b.minLat,y);b.maxLat=Math.max(b.maxLat,y)}));return b}
function geomPath(g,proj){const polys=g.type==="Polygon"?[g.coordinates]:g.coordinates;return polys.map(p=>p.map(r=>r.map((pt,i)=>{const[x,y]=proj(pt);return`${i?"L":"M"}${x.toFixed(2)} ${y.toFixed(2)}`}).join(" ")+" Z").join(" ")).join(" ")}
function buildMap(geo){
 const fs=geo.features.map(trimFeature),bd=bounds(fs),w=760,h=980,m=4,s=Math.min((w-m*2)/(bd.maxLon-bd.minLon),(h-m*2)/(bd.maxLat-bd.minLat)),mw=(bd.maxLon-bd.minLon)*s,mh=(bd.maxLat-bd.minLat)*s,ox=(w-mw)/2,oy=(h-mh)/2;
 const proj=([lon,lat])=>[ox+(lon-bd.minLon)*s,oy+(bd.maxLat-lat)*s];
 E.svg.setAttribute("viewBox",`${ox-m} ${oy-m} ${mw+m*2} ${mh+m*2}`);
 const g=document.createElementNS("http://www.w3.org/2000/svg","g");E.svg.appendChild(g);
 fs.sort((a,b)=>a.properties.id-b.properties.id).forEach(f=>{const id=+f.properties.id,p=document.createElementNS(g.namespaceURI,"path");p.setAttribute("d",geomPath(f.geometry,proj));p.classList.add("prefecture");p.tabIndex=0;p.setAttribute("aria-label",PREF[id]);p.onclick=()=>select(id,true);p.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(id,true)}};g.appendChild(p);paths.set(id,p)});
}
function select(id,focus){sel=id;E.selected.textContent=PREF[id];E.input.value=c(id);paint();if(focus){E.input.focus();E.input.select()}}
function change(d){const n=Math.max(0,Math.min(9999,c(sel)+d));n?state[sel]=n:delete state[sel];E.input.value=n;save();render()}
function apply(){const n=Math.max(0,Math.min(9999,Math.floor(+E.input.value||0)));n?state[sel]=n:delete state[sel];save();render()}
function addOver(e){e.preventDefault();const name=E.overName.value.trim(),n=Math.max(1,Math.min(9999,Math.floor(+E.overCount.value||1)));if(!name)return;const x=over.find(x=>x.name.toLowerCase()===name.toLowerCase());x?x.count=n:over.push({name,count:n});E.overName.value="";E.overCount.value=1;save();render()}
function removeOver(i){over.splice(i,1);save();render()}
function resetAll(){if(confirm("ほっぺくんのおともだちMAPの記録をすべてリセットしますか？")){state={};over=[];save();select(13,false);render()}}
function paint(){paths.forEach((p,id)=>{p.style.fill=c(id)>0?COLOR.get(id):"#f3eadc";p.classList.toggle("selected",id===sel)})}
function render(){
 const ids=Array.from({length:47},(_,i)=>i+1),visited=ids.filter(id=>c(id)>0),jp=visited.reduce((s,id)=>s+c(id),0),ot=overTotal(),gt=jp+ot;
 E.visited.textContent=visited.length;E.grand.textContent=gt;E.overSum.textContent=ot;E.overCountries.textContent=over.length;E.japan.textContent=jp+"体";E.overseas.textContent=ot+"体";
 E.prefList.innerHTML=ids.map(id=>`<div class="pref-row"><i class="dot" style="background:${COLOR.get(id)}"></i><button data-id="${id}">${PREF[id]}</button><b>${c(id)}</b></div>`).join("");
 E.prefList.querySelectorAll("button").forEach(b=>b.onclick=()=>select(+b.dataset.id,true));
 E.overList.innerHTML=over.length?over.map((x,i)=>`<div class="over-row"><span>${esc(x.name)}</span><b>${x.count}体</b><button data-i="${i}">×</button></div>`).join(""):'<p class="empty">まだ登録されていません。</p>';
 E.overList.querySelectorAll("button").forEach(b=>b.onclick=()=>removeOver(+b.dataset.i));E.overFooter.textContent=over.length;
 E.regions.innerHTML=REGIONS.map(r=>`<div class="region-row"><i class="dot" style="background:${r.color}"></i><span>${r.name}エリア</span><b>${r.ids.reduce((s,id)=>s+c(id),0)}</b></div>`).join("");
 E.input.value=c(sel);paint();save();
}
function esc(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
async function savePng(){
 if(typeof html2canvas==="undefined"){alert("画像保存機能を読み込めませんでした。");return}
 const canvas=await html2canvas($("appCapture"),{backgroundColor:"#f5dfc1",scale:2,useCORS:true,logging:false});
 const a=document.createElement("a");a.download=`hoppekun-otomodachi-map-${new Date().toISOString().slice(0,10)}.png`;a.href=canvas.toDataURL("image/png");a.click();
}
async function shareMap(){
 const d={title:"ほっぺくんのおともだちMAP",text:"ほっぺくんのおともだちMAP",url:location.href};
 if(navigator.share){try{await navigator.share(d)}catch{}}
 else{try{await navigator.clipboard.writeText(location.href);alert("URLをコピーしました。")}catch{prompt("このURLをコピーしてください",location.href)}}
}
