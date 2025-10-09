import { connect as c } from 'cloudflare:sockets';
const VER='mini-2.5-final';
const U='aaa6b096-1165-4bbe-935c-99f4ec902d02'; // UUID
const P='sjc.o00o.ooo:443'; // 备用代理 IP:端口
const S5=''; // SOCKS5 代理地址（user:pass@host:port）
const GS5=false; // 全局 SOCKS5（true 全部走 S5）
let mode=1; // 1=实时发送(低延迟) 2=顺序队列(更稳)

function vU(u){return/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(u);}if(!vU(U))throw new Error('Bad UUID');

export default{async fetch(r){const u=r.headers.get('Upgrade');if(!u||u.toLowerCase()!=='websocket')return Response.redirect('https://example.com',301);
const url=new URL(r.url),tp=url.pathname+url.search,pm=tp.match(/p=([^&]*)/),sm=tp.match(/s5=([^&]*)/),gm=tp.match(/gs5=([^&]*)/);
const px=pm?pm[1]:P,s5=sm?sm[1]:S5,gs5=gm?(gm[1]==='1'||(gm[1]&&gm[1].toLowerCase()==='true')):GS5;return vWS(r,px,s5,gs5);}};

async function vWS(r,px,s5,gs5){const wp=new WebSocketPair(),cl=wp[0],sv=wp[1];sv.accept();
const eh=r.headers.get('sec-websocket-protocol')||'',rs=mRS(sv,eh);let rSocket=null,uw=null,dns=false;
rs.pipeTo(new WritableStream({async write(ch){const d=nU8(ch);if(!d.length)return;if(dns&&uw){uw(d);return;}
if(rSocket){const w=rSocket.writable.getWriter();try{await w.write(d);}finally{w.releaseLock();}return;}
const p=pVH(d.buffer,U);if(p.err)throw new Error(p.msg);const{ar,pr,ri,vv,udp}=p;
if(udp){if(pr!==53)throw new Error('udp only 53');dns=true;const vh=new Uint8Array([vv[0],0]),ip=d.slice(ri),w=await hUDP(sv,vh);uw=w.w.bind(w);if(ip.length)uw(ip);return;}
const vh=new Uint8Array([vv[0],0]),ip=d.slice(ri);hTCP(ar,pr,ip,sv,vh,px,s5,gs5).then(s=>rSocket=s).catch(()=>{safeCloseSocket(rSocket);safeCloseWebSocket(sv);});},
close(){safeCloseSocket(rSocket);safeCloseWebSocket(sv);},abort(){safeCloseSocket(rSocket);safeCloseWebSocket(sv);}})).catch(()=>{safeCloseSocket(rSocket);safeCloseWebSocket(sv);});
return new Response(null,{status:101,webSocket:cl});}

async function hTCP(a,p,fp,sv,vh,px,s5,gs5){const s5cfg=s5?pS5(s5):null;let socket=null;
async function connectDirect(h,pt){const s=c({hostname:h,port:pt});await s.opened;if(fp&&fp.length){const w=s.writable.getWriter();try{await w.write(fp);}finally{w.releaseLock();}}return s;}
async function connectS5(h,pt){const s=await s5conn(h,pt,s5cfg);if(fp&&fp.length){const w=s.writable.getWriter();try{await w.write(fp);}finally{w.releaseLock();}}return s;}
try{if(gs5&&s5cfg){socket=await connectS5(a,p);r2w(socket,sv,vh).catch(()=>{});return socket;}
try{socket=await connectDirect(a,p);r2w(socket,sv,vh).catch(()=>{});return socket;}catch{safeCloseSocket(socket);socket=null;}
if(s5cfg){try{socket=await connectS5(a,p);r2w(socket,sv,vh).catch(()=>{});return socket;}catch{safeCloseSocket(socket);socket=null;}}
const[ph,pp]=pHP(px,p);socket=await connectDirect(ph,pp);r2w(socket,sv,vh).catch(()=>{});return socket;}
catch(e){safeCloseSocket(socket);safeCloseWebSocket(sv);throw e;}}

async function r2w(rs,sv,vh){let h=vh;const r=rs.readable.getReader();let sq=Promise.resolve();
try{while(true){const rec=await r.read();if(!rec)break;const{value,done}=rec;if(done)break;if(!value)continue;const u=nU8(value);
if(h){const b=new Uint8Array(h.length+u.length);b.set(h,0);b.set(u,h.length);if(mode===1)safeSend(sv,b);else sq=sq.then(()=>safeSend(sv,b)).catch(()=>{});h=null;}
else{if(mode===1)safeSend(sv,u);else sq=sq.then(()=>safeSend(sv,u)).catch(()=>{});}}}
catch(e){safeCloseSocket(rs);safeCloseWebSocket(sv);}finally{try{r.releaseLock();}catch{}if(mode===2)await sq.catch(()=>{});}return true;}

async function s5conn(h,pt,s5cfg){const s=c({hostname:s5cfg.h,port:s5cfg.pt});let sw=null,sr=null,threw=false;
try{await s.opened;sw=s.writable.getWriter();sr=s.readable.getReader();const te=new TextEncoder();
await sw.write(new Uint8Array([5,2,0,2]));const arR=await sr.read();if(!arR||arR.done)throw new Error('s5 no response');const ar=arR.value;
if(ar[1]===0x02){if(!s5cfg.u||!s5cfg.p)throw new Error('auth required');const apk=new Uint8Array([1,s5cfg.u.length,...te.encode(s5cfg.u),s5cfg.p.length,...te.encode(s5cfg.p)]);
await sw.write(apk);const aprR=await sr.read();if(!aprR||aprR.done)throw new Error('s5 auth no response');const apr=aprR.value;if(apr[0]!==0x01||apr[1]!==0x00)throw new Error('auth failed');}
let atyp;if(/^(\d{1,3}\.){3}\d{1,3}$/.test(h))atyp=new Uint8Array([1,...h.split('.').map(Number)]);
else if(/^[0-9a-fA-F:]+$/.test(h)){const[pf='',sf='']=h.split('::'),pfp=pf.split(':').filter(Boolean),sfp=sf.split(':').filter(Boolean);
const pad=8-(pfp.length+sfp.length),full=[...pfp,...Array(pad).fill('0'),...sfp];const ipb=full.flatMap(f=>{const n=parseInt(f||'0',16);return[(n>>8)&0xff,n&0xff];});atyp=new Uint8Array([4,...ipb]);}
else atyp=new Uint8Array([3,h.length,...te.encode(h)]);
await sw.write(new Uint8Array([5,1,0,...atyp,pt>>8,pt&0xff]));const resR=await sr.read();if(!resR||resR.done)throw new Error('s5 connect no response');const res=resR.value;
if(res[0]!==0x05||res[1]!==0x00)throw new Error('connect failed');return s;}
catch(e){threw=true;throw e;}finally{try{if(sw)sw.releaseLock();}catch{}try{if(sr)sr.releaseLock();}catch{}if(threw)try{s.close();}catch{}}}

async function hUDP(sv,vh){let hs=false;const ts=new TransformStream(),rd=ts.readable.getReader(),wr=ts.writable.getWriter();
rd.read().then(function proc({done,value}){if(done){try{rd.releaseLock();}catch{}return;}
try{const d=nU8(value);if(!d||d.length<2){rd.read().then(proc);return;}const len=(d[0]<<8)|d[1];if(d.length<2+len){rd.read().then(proc);return;}const q=d.slice(2,2+len);
fetch('https://1.1.1.1/dns-query',{method:'POST',headers:{'content-type':'application/dns-message'},body:q}).then(async res=>{
const dr=new Uint8Array(await res.arrayBuffer()),lb=new Uint8Array([(dr.length>>8)&255,dr.length&255]);let out;
if(hs){out=new Uint8Array(2+dr.length);out.set(lb,0);out.set(dr,2);}else{out=new Uint8Array(vh.length+2+dr.length);out.set(vh,0);out.set(lb,vh.length);out.set(dr,vh.length+2);hs=true;}
safeSend(sv,out.buffer);}).catch(()=>{}).finally(()=>rd.read().then(proc));}catch{rd.read().then(proc);}});return{w:async ch=>{if(ch&&ch.length)try{await wr.write(ch);}catch{}}};}

function safeCloseWebSocket(ws){if(!ws)return;try{ws.close();}catch{}}
function safeCloseSocket(s){if(!s)return;try{s.close();}catch{}}
function safeSend(ws,data){if(!ws||data==null)return;try{ws.send(data);}catch{}}

function pVH(b,uid){if(!b||b.byteLength<24)return{err:1,msg:'invalid header'};const d=new Uint8Array(b),v=d[0];
const ub=Uint8Array.from(uid.replace(/-/g,'').match(/.{2}/g).map(x=>parseInt(x,16)));for(let i=0;i<16;i++)if(d[1+i]!==ub[i])return{err:1,msg:'uuid mismatch'};
const ol=d[17],cmd=d[18+ol];if(cmd!==1&&cmd!==2)return{err:1,msg:'invalid cmd'};const udp=cmd===2,pi=18+ol+1,pr=new DataView(b,pi,2).getUint16(0);let ai=pi+2,ar='';const at=d[ai++];
if(at===1){ar=Array.from(d.slice(ai,ai+4)).join('.');ai+=4;}else if(at===2){const alen=d[ai++];ar=new TextDecoder().decode(b.slice(ai,ai+alen));ai+=alen;}
else if(at===3){const dv=new DataView(b,ai,16),segs=[];for(let i=0;i<8;i++)segs.push(dv.getUint16(i*2).toString(16));ar=segs.join(':');ai+=16;}else return{err:1,msg:'invalid atyp'};
return{err:0,ar,pr,ri:ai,vv:new Uint8Array([v]),udp};}

function pS5(str){const ati=str.includes('@')?str.lastIndexOf('@'):-1,hp=ati!==-1?str.slice(ati+1):str;const[h,pt]=pHP(hp);
if(ati===-1)return{u:'',p:'',h,pt};const up=str.slice(0,ati),ci=up.lastIndexOf(':');if(ci===-1)return{u:'',p:'',h,pt};return{u:up.slice(0,ci),p:up.slice(ci+1),h,pt};}
function nU8(x){if(!x)return new Uint8Array(0);if(x instanceof Uint8Array)return x;if(x instanceof ArrayBuffer)return new Uint8Array(x);
if(ArrayBuffer.isView(x))return new Uint8Array(x.buffer,x.byteOffset,x.byteLength);return new Uint8Array(0);}
function b642u(b){if(!b)return{ed:null,er:null};try{let s=b.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const raw=atob(s);return{ed:Uint8Array.from(raw,c=>c.charCodeAt(0)),er:null};}catch(e){return{ed:null,er:e};}}
function mRS(ws,eh){let closed=false;return new ReadableStream({start(ctrl){ws.addEventListener('message',evt=>{if(!closed)ctrl.enqueue(evt.data);});
ws.addEventListener('close',()=>{if(!closed){closed=true;ctrl.close();}});ws.addEventListener('error',err=>{ctrl.error(err);});
const{ed}=b642u(eh);if(ed)ctrl.enqueue(ed);},cancel(){closed=true;try{ws.close();}catch{}}});}
function pHP(s,defp=443){if(!s)return[null,defp];if(s.includes(']:')){const parts=s.split(']:');return[parts[0]+']',Number(parts[1])||defp];}
const parts=s.split(':');if(parts.length===2)return[parts[0],Number(parts[1])||defp];return[s,defp];}
