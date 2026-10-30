// Visitor log for the portfolio site.
// POST /visit      records one visit (IP, approximate location, device, referrer).
// GET  /admin      private page that lists visits (asks for the admin key).
// GET  /api/visits JSON list of visits; requires the X-Admin-Key header.

const ALLOWED_ORIGINS = ["https://patrik-portfolio-omega.vercel.app"];
const KEEP_SECONDS = 60 * 60 * 24 * 365; // keep each visit for a year
const REPEAT_WINDOW = 60 * 30; // count the same IP once per 30 minutes

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function clip(value, max) {
  return String(value || "").slice(0, max);
}

function sameKey(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function recordVisit(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!ALLOWED_ORIGINS.includes(origin)) return new Response(null, { status: 403 });

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const seenKey = "seen:" + ip;
  if (await env.VISITS.get(seenKey)) return new Response(null, { status: 204, headers: cors(origin) });

  let body = {};
  try { body = await request.json(); } catch { /* empty body is fine */ }
  const cf = request.cf || {};
  const visit = {
    t: new Date().toISOString(),
    ip,
    city: clip(cf.city, 60),
    region: clip(cf.region, 60),
    country: clip(cf.country, 4),
    org: clip(cf.asOrganization, 80),
    ua: clip(request.headers.get("User-Agent"), 220),
    ref: clip(body.ref, 160),
    page: clip(body.page, 80),
  };
  // Stored as key metadata so the admin list needs a single read.
  await env.VISITS.put(`v:${visit.t}:${crypto.randomUUID().slice(0, 8)}`, "", { metadata: visit, expirationTtl: KEEP_SECONDS });
  await env.VISITS.put(seenKey, "1", { expirationTtl: REPEAT_WINDOW });
  return new Response(null, { status: 204, headers: cors(origin) });
}

async function listVisits(request, env) {
  if (!env.ADMIN_KEY || !sameKey(request.headers.get("X-Admin-Key"), env.ADMIN_KEY)) {
    return Response.json({ error: "Wrong admin key." }, { status: 401 });
  }
  const visits = [];
  let cursor;
  do {
    const page = await env.VISITS.list({ prefix: "v:", cursor });
    for (const k of page.keys) if (k.metadata) visits.push(k.metadata);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && visits.length < 5000);
  visits.sort((a, b) => (a.t < b.t ? 1 : -1));
  return Response.json({ visits }, { headers: { "Cache-Control": "no-store" } });
}

const ADMIN_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Portfolio Visitors</title>
<style>
:root{--bg:#f5f6f3;--card:#fff;--ink:#15181d;--muted:#5d636d;--rule:#dcdfe2;--accent:#0e6b62}
@media (prefers-color-scheme:dark){:root{--bg:#111417;--card:#181c20;--ink:#e8eaed;--muted:#9aa1ab;--rule:#2a3037;--accent:#4fc2b4;color-scheme:dark}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 "Segoe UI",Helvetica,Arial,sans-serif}
main{max-width:1100px;margin:0 auto;padding:32px max(16px,env(safe-area-inset-left,0px))}
h1{font:500 2rem Georgia,serif;margin:0 0 4px}
.muted{color:var(--muted)}
form{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}
input{flex:1;min-width:220px;font:inherit;padding:10px 12px;border:1px solid var(--rule);border-radius:8px;background:var(--card);color:var(--ink)}
button{font:inherit;font-weight:600;padding:10px 18px;border:0;border-radius:8px;background:var(--accent);color:#fff;cursor:pointer}
.stats{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0 20px}
.stat{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:12px 16px;min-width:140px}
.stat b{display:block;font-size:1.6rem;font-variant-numeric:tabular-nums}
.table{overflow-x:auto;background:var(--card);border:1px solid var(--rule);border-radius:10px}
table{border-collapse:collapse;width:100%;min-width:760px}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--rule);vertical-align:top}
th{font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
td.ip{font-family:Consolas,monospace}
.err{color:#c0392b}
</style></head><body><main>
<h1>Portfolio visitors</h1>
<p class="muted">Each visitor is counted once per 30 minutes. Locations are approximate, based on the IP address.</p>
<form id="f"><label for="k" class="muted" style="position:absolute;left:-9999px">Admin key</label><input id="k" type="password" placeholder="Admin key" autocomplete="current-password"><button>Show visitors</button></form>
<p id="msg" class="muted"></p>
<div id="out" hidden>
  <div class="stats"><div class="stat"><b id="total">0</b><span class="muted">Visits</span></div><div class="stat"><b id="unique">0</b><span class="muted">Unique IPs</span></div><div class="stat"><b id="today">0</b><span class="muted">Last 24 hours</span></div></div>
  <div class="table"><table><thead><tr><th>When</th><th>IP address</th><th>Location</th><th>Network</th><th>Device</th><th>Came from</th></tr></thead><tbody id="rows"></tbody></table></div>
</div>
<script>
var k=document.getElementById('k'),msg=document.getElementById('msg');
try{k.value=sessionStorage.getItem('ak')||''}catch(e){}
function device(ua){if(!ua)return'';var os=/Windows/.test(ua)?'Windows':/iPhone|iPad/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Mac OS/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Other';var b=/Edg\\//.test(ua)?'Edge':/Chrome\\//.test(ua)?'Chrome':/Firefox\\//.test(ua)?'Firefox':/Safari\\//.test(ua)?'Safari':/bot|crawl|spider/i.test(ua)?'Bot':'Other';return b+' on '+os}
function td(t,c){var e=document.createElement('td');e.textContent=t;if(c)e.className=c;return e}
async function load(){msg.className='muted';msg.textContent='Loading...';
 var r=await fetch('/api/visits',{headers:{'X-Admin-Key':k.value}});var j=await r.json().catch(function(){return{}});
 if(!r.ok){msg.className='err';msg.textContent=j.error||'Could not load visitors.';return}
 try{sessionStorage.setItem('ak',k.value)}catch(e){}
 var v=j.visits||[],rows=document.getElementById('rows');rows.textContent='';
 v.forEach(function(x){var tr=document.createElement('tr');tr.append(td(new Date(x.t).toLocaleString()),td(x.ip,'ip'),td([x.city,x.region,x.country].filter(Boolean).join(', ')),td(x.org||''),td(device(x.ua)),td(x.ref||'Direct'));rows.append(tr)});
 document.getElementById('total').textContent=v.length;
 document.getElementById('unique').textContent=new Set(v.map(function(x){return x.ip})).size;
 document.getElementById('today').textContent=v.filter(function(x){return Date.now()-new Date(x.t)<864e5}).length;
 msg.textContent=v.length?'':'No visits yet.';document.getElementById('out').hidden=false}
document.getElementById('f').addEventListener('submit',function(e){e.preventDefault();load()});
if(k.value)load();
</script></main></body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (url.pathname === "/visit" && request.method === "POST") return recordVisit(request, env);
    if (url.pathname === "/api/visits" && request.method === "GET") return listVisits(request, env);
    if (url.pathname === "/admin" || url.pathname === "/") {
      return new Response(ADMIN_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
    }
    return new Response("Not found", { status: 404 });
  },
};
