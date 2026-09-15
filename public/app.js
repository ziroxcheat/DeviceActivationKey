const $=s=>document.querySelector(s);
let records=[];

async function api(url,opt={}) {
  const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opt});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||"Request failed");
  return j;
}
function show(id,text,ok=false){const e=$(id);e.textContent=text;e.className="msg "+(ok?"ok":"err");setTimeout(()=>{e.textContent="";e.className="msg"},3500)}
function validDate(s){const [d,m,y]=s.split("-").map(Number);if(!d||!m||!y)return false;const x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d}
function expired(s){if(!validDate(s))return true;const [d,m,y]=s.split("-").map(Number);const end=new Date(y,m-1,d,23,59,59);return end < new Date()}
function render(){
  const q=$("#search").value.toLowerCase();
  const filtered=records.map((x,i)=>({...x,_i:i})).filter(x=>(x.key+x.device_id).toLowerCase().includes(q));
  $("#rows").innerHTML=filtered.length?filtered.map(x=>`
    <tr data-i="${x._i}">
      <td><input class="dev" value="${esc(x.device_id)}"></td>
      <td><input class="key" value="${esc(x.key)}"></td>
      <td><input class="exp" value="${esc(x.expirydate)}" placeholder="DD-MM-YYYY"></td>
      <td><input class="offline" type="checkbox" ${x.Allowoffline?"checked":""}></td>
      <td><span class="pill ${expired(x.expirydate)?"off":""}">${expired(x.expirydate)?"Expired":"Active"}</span></td>
      <td><div class="actions"><button class="save">Save</button><button class="danger del">Delete</button></div></td>
    </tr>`).join(""):`<tr><td colspan="6" class="empty">No records found.</td></tr>`;
  $("#total").textContent=records.length;
  $("#expired").textContent=records.filter(x=>expired(x.expirydate)).length;
  $("#active").textContent=records.length-Number($("#expired").textContent);
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function load(){
  try{records=await api("/api/data");render()}catch(e){show("#msg",e.message)}
}
$("#loginForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/login",{method:"POST",body:JSON.stringify({password:$("#password").value})});$("#login").hidden=true;$("#app").hidden=false;load()}catch(e){show("#loginMsg",e.message)}};
$("#logout").onclick=async()=>{await api("/api/logout",{method:"POST"});location.reload()};
$("#reload").onclick=load;
$("#search").oninput=render;
$("#add").onclick=()=>{records.push({device_id:"",key:"",expirydate:"31-12-2026",Allowoffline:false});render();window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"})};
$("#rows").onclick=async e=>{
  const tr=e.target.closest("tr");if(!tr)return;const i=Number(tr.dataset.i);
  if(e.target.classList.contains("save")){
    const dev=tr.querySelector(".dev").value.trim(),key=tr.querySelector(".key").value.trim(),exp=tr.querySelector(".exp").value.trim();
    if(!dev||!key||!validDate(exp))return show("#msg","Fill Device ID, Key and a valid DD-MM-YYYY date.");
    records[i]={device_id:dev,key,expirydate:exp,Allowoffline:tr.querySelector(".offline").checked};
    try{await api("/api/data",{method:"PUT",body:JSON.stringify(records)});show("#msg","Saved to GitHub successfully.",true);render()}catch(err){show("#msg",err.message)}
  }
  if(e.target.classList.contains("del")){
    if(!confirm("Delete this activation record?"))return;
    records.splice(i,1);
    try{await api("/api/data",{method:"PUT",body:JSON.stringify(records)});show("#msg","Deleted and synced to GitHub.",true);render()}catch(err){show("#msg",err.message)}
  }
};
(async()=>{try{const m=await api("/api/me");if(m.authenticated){$("#login").hidden=true;$("#app").hidden=false;load()}}catch{}})();

