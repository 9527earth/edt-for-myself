import { connect as c } from 'cloudflare:sockets';

const VER = 'mini-2.5-stable';
const U = 'aaa6b096-1165-4bbe-935c-99f4ec902d02';
const P = 'sjc.o00o.ooo:443';
const S5 = '';
const GS5 = false;
let mode = 1;
const CT = 30000;
const HB = 15000;

function vU(u) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(u);
}

if (!vU(U)) throw new Error('Bad UUID');

async function waitOpen(sock) {
  let tid;
  await Promise.race([
    sock.opened,
    new Promise((_, rej) => {
      tid = setTimeout(() => rej(new Error('timeout')), CT);
    })
  ]).finally(() => {
    if (tid) clearTimeout(tid);
  });
}

export default {
  async fetch(r) {
    const u = r.headers.get('Upgrade');
    if (!u || u.toLowerCase() !== 'websocket') {
      return Response.redirect('https://example.com', 301);
    }
    const url = new URL(r.url);
    const tp = url.pathname + url.search;
    const pm = tp.match(/p=([^&]*)/);
    const sm = tp.match(/s5=([^&]*)/);
    const gm = tp.match(/gs5=([^&]*)/);
    const px = pm ? pm[1] : P;
    const s5 = sm ? sm[1] : S5;
    const gs5 = gm ? (gm[1] === '1' || (gm[1] && gm[1].toLowerCase() === 'true')) : GS5;
    return vWS(r, px, s5, gs5);
  }
};

async function vWS(r, px, s5, gs5) {
  const wp = new WebSocketPair();
  const cl = wp[0];
  const sv = wp[1];
  sv.accept();
  const eh = r.headers.get('sec-websocket-protocol') || '';
  const rs = mRS(sv, eh);
  let rr = { v: null };
  let uw = null;
  let dns = false;
  rs.pipeTo(new WritableStream({
    async write(ch) {
      try {
        const d = nU8(ch);
        if (!d.length) return;
        if (dns && uw) {
          uw(d);
          return;
        }
        if (rr.v) {
          await bW(rr.v, d);
          return;
        }
        const p = pVH(d.buffer, U);
        if (p.err) throw new Error(p.msg);
        const { ar, pr, ri, vv, udp } = p;
        if (udp) {
          if (pr !== 53) throw new Error('udp only 53');
          dns = true;
          const vh = new Uint8Array([vv[0], 0]);
          const ip = d.slice(ri);
          const w = await hUDP(sv, vh);
          uw = w.w.bind(w);
          if (ip.length) uw(ip);
          return;
        }
        const vh = new Uint8Array([vv[0], 0]);
        const ip = d.slice(ri);
        hTCP(rr, ar, pr, ip, sv, vh, px, s5, gs5);
      } catch (e) {}
    }
  })).catch(() => {});
  return new Response(null, { status: 101, webSocket: cl });
}

async function s5conn(h, pt, s5cfg) {
  const s = c({ hostname: s5cfg.h, port: s5cfg.pt });
  await waitOpen(s);
  const sw = s.writable.getWriter();
  const sr = s.readable.getReader();
  const te = new TextEncoder();
  try {
    await sw.write(new Uint8Array([5, 2, 0, 2]));
    const ar = (await sr.read()).value;
    if (ar[1] === 0x02) {
      if (!s5cfg.u || !s5cfg.p) throw new Error('auth required');
      const apk = new Uint8Array([
        1,
        s5cfg.u.length,
        ...te.encode(s5cfg.u),
        s5cfg.p.length,
        ...te.encode(s5cfg.p)
      ]);
      await sw.write(apk);
      const apr = (await sr.read()).value;
      if (apr[0] !== 0x01 || apr[1] !== 0x00) throw new Error('auth failed');
    }
    let atyp;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h)) {
      atyp = new Uint8Array([1, ...h.split('.').map(Number)]);
    } else if (/^[0-9a-fA-F:]+$/.test(h)) {
      const [pf = '', sf = ''] = h.split('::');
      const pfp = pf.split(':').filter(Boolean);
      const sfp = sf.split(':').filter(Boolean);
      const pad = 8 - (pfp.length + sfp.length);
      const full = [...pfp, ...Array(pad).fill('0'), ...sfp];
      const ipb = full.flatMap(f => {
        const n = parseInt(f || '0', 16);
        return [(n >> 8) & 0xff, n & 0xff];
      });
      atyp = new Uint8Array([4, ...ipb]);
    } else {
      atyp = new Uint8Array([3, h.length, ...te.encode(h)]);
    }
    await sw.write(new Uint8Array([5, 1, 0, ...atyp, pt >> 8, pt & 0xff]));
    const res = (await sr.read()).value;
    if (res[0] !== 0x05 || res[1] !== 0x00) throw new Error('connect failed');
    sw.releaseLock();
    sr.releaseLock();
    return s;
  } catch (e) {
    try {
      sw.releaseLock();
      sr.releaseLock();
      s.close();
    } catch {}
    throw e;
  }
}

async function hTCP(rr, a, p, fp, sv, vh, px, s5, gs5) {
  async function dc(h, pt) {
    const s = c({ hostname: h, port: pt });
    await waitOpen(s);
    return s;
  }
  const s5cfg = s5 ? pS5(s5) : null;
  if (gs5 && s5cfg) {
    try {
      const ss = await s5conn(a, p, s5cfg);
      rr.v = ss;
      if (fp.length) await bW(ss, fp);
      r2w(ss, sv, vh);
      sHB(ss, sv);
      return;
    } catch {}
  }
  try {
    const ds = await dc(a, p);
    rr.v = ds;
    if (fp.length) await bW(ds, fp);
    r2w(ds, sv, vh);
    sHB(ds, sv);
    return;
  } catch {}
  if (s5cfg) {
    try {
      const ss = await s5conn(a, p, s5cfg);
      rr.v = ss;
      if (fp.length) await bW(ss, fp);
      r2w(ss, sv, vh);
      sHB(ss, sv);
      return;
    } catch {}
  }
  const [ph, pp] = pHP(px, p);
  try {
    const ps = await dc(ph, pp);
    rr.v = ps;
    if (fp.length) await bW(ps, fp);
    r2w(ps, sv, vh);
    sHB(ps, sv);
  } catch {
    safeClose(sv, null);
  }
}

async function r2w(rs, sv, vh) {
  let h = vh;
  const r = rs.readable.getReader();
  let sq = Promise.resolve();
  try {
    while (true) {
      const { value, done } = await r.read();
      if (done) break;
      if (!value) continue;
      const u = nU8(value);
      if (h) {
        const b = new Uint8Array(h.length + u.length);
        b.set(h, 0);
        b.set(u, h.length);
        if (mode === 1) {
          safeSend(sv, b);
        } else {
          sq = sq.then(() => safeSend(sv, b)).catch(() => {});
        }
        h = null;
      } else {
        if (mode === 1) {
          safeSend(sv, u);
        } else {
          sq = sq.then(() => safeSend(sv, u)).catch(() => {});
        }
      }
    }
  } finally {
    try {
      r.releaseLock();
    } catch {}
    if (mode === 2) sq.finally(() => {});
  }
}

async function bW(s, d) {
  if (!s._wq) s._wq = Promise.resolve();
  s._wq = s._wq.then(async () => {
    const w = s.writable.getWriter();
    try {
      await w.write(d);
    } finally {
      w.releaseLock();
    }
  }).catch(() => {});
}

function sHB(s, sv) {
  if (!s || !sv) return;
  const hbi = setInterval(async () => {
    try {
      const w = s.writable.getWriter();
      await w.write(new Uint8Array([0]));
      w.releaseLock();
      safeSend(sv, new Uint8Array(0));
    } catch {
      clearInterval(hbi);
      safeClose(sv, s);
    }
  }, HB);
  const cleanup = () => {
    clearInterval(hbi);
    safeClose(null, s);
  };
  sv.addEventListener?.('close', cleanup);
  sv.addEventListener?.('error', cleanup);
}

async function hUDP(sv, vh) {
  let hs = false;
  const ts = new TransformStream();
  const rd = ts.readable.getReader();
  rd.read().then(function proc({ done, value }) {
    if (done) return;
    try {
      const d = nU8(value);
      if (!d || d.length < 2) {
        rd.read().then(proc);
        return;
      }
      const len = (d[0] << 8) | d[1];
      if (d.length < 2 + len) {
        rd.read().then(proc);
        return;
      }
      const q = d.slice(2, 2 + len);
      fetch('https://1.1.1.1/dns-query', {
        method: 'POST',
        headers: { 'content-type': 'application/dns-message' },
        body: q
      }).then(async res => {
        const dr = new Uint8Array(await res.arrayBuffer());
        const lb = new Uint8Array([(dr.length >> 8) & 255, dr.length & 255]);
        let out;
        if (hs) {
          out = new Uint8Array(2 + dr.length);
          out.set(lb, 0);
          out.set(dr, 2);
        } else {
          out = new Uint8Array(vh.length + 2 + dr.length);
          out.set(vh, 0);
          out.set(lb, vh.length);
          out.set(dr, vh.length + 2);
          hs = true;
        }
        safeSend(sv, out.buffer);
      }).catch(() => {}).finally(() => rd.read().then(proc));
    } catch {
      rd.read().then(proc);
    }
  });
  const wr = ts.writable.getWriter();
  return {
    w: async ch => {
      if (ch && ch.length) {
        try {
          await wr.write(ch);
        } catch {}
      }
    }
  };
}

function safeSend(ws, data) {
  if (!ws || data == null) return;
  try {
    ws.send(data);
  } catch {}
}

function safeClose(sv, s) {
  try {
    s?.close?.();
  } catch {}
  try {
    sv?.close?.();
  } catch {}
}

function pVH(b, uid) {
  if (!b || b.byteLength < 24) return { err: 1, msg: 'invalid header' };
  const d = new Uint8Array(b);
  const v = d[0];
  const ub = Uint8Array.from(uid.replace(/-/g, '').match(/.{2}/g).map(x => parseInt(x, 16)));
  for (let i = 0; i < 16; i++) {
    if (d[1 + i] !== ub[i]) return { err: 1, msg: 'uuid mismatch' };
  }
  const ol = d[17];
  const cmd = d[18 + ol];
  if (cmd !== 1 && cmd !== 2) return { err: 1, msg: 'invalid cmd' };
  const udp = cmd === 2;
  const pi = 18 + ol + 1;
  const pr = new DataView(b, pi, 2).getUint16(0);
  let ai = pi + 2;
  let ar = '';
  const at = d[ai++];
  if (at === 1) {
    ar = Array.from(d.slice(ai, ai + 4)).join('.');
    ai += 4;
  } else if (at === 2) {
    const alen = d[ai++];
    ar = new TextDecoder().decode(b.slice(ai, ai + alen));
    ai += alen;
  } else if (at === 3) {
    const dv = new DataView(b, ai, 16);
    const segs = [];
    for (let i = 0; i < 8; i++) {
      segs.push(dv.getUint16(i * 2).toString(16));
    }
    ar = segs.join(':');
    ai += 16;
  } else {
    return { err: 1, msg: 'invalid atyp' };
  }
  return { err: 0, ar, pr, ri: ai, vv: new Uint8Array([v]), udp };
}

function pS5(str) {
  const ati = str.includes('@') ? str.lastIndexOf('@') : -1;
  const hp = ati !== -1 ? str.slice(ati + 1) : str;
  const [h, pt] = pHP(hp);
  if (ati === -1) return { u: '', p: '', h, pt };
  const up = str.slice(0, ati);
  const ci = up.lastIndexOf(':');
  if (ci === -1) return { u: '', p: '', h, pt };
  return {
    u: up.slice(0, ci),
    p: up.slice(ci + 1),
    h,
    pt
  };
}

function nU8(x) {
  if (!x) return new Uint8Array(0);
  if (x instanceof Uint8Array) return x;
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  return new Uint8Array(0);
}

function b642u(b) {
  if (!b) return { ed: null, er: null };
  try {
    let s = b.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const raw = atob(s);
    return { ed: Uint8Array.from(raw, c => c.charCodeAt(0)), er: null };
  } catch (e) {
    return { ed: null, er: e };
  }
}

function mRS(ws, eh) {
  let closed = false;
  return new ReadableStream({
    start(ctrl) {
      ws.addEventListener('message', evt => {
        if (!closed) ctrl.enqueue(evt.data);
      });
      ws.addEventListener('close', () => {
        if (!closed) ctrl.close();
      });
      ws.addEventListener('error', err => {
        ctrl.error(err);
      });
      const { ed } = b642u(eh);
      if (ed) ctrl.enqueue(ed);
    },
    cancel() {
      closed = true;
      try {
        ws.close();
      } catch {}
    }
  });
}

function pHP(s, defp = 443) {
  if (!s) return [null, defp];
  if (s.includes(']:')) {
    const parts = s.split(']:');
    return [parts[0] + ']', Number(parts[1]) || defp];
  }
  const parts = s.split(':');
  if (parts.length === 2) {
    return [parts[0], Number(parts[1]) || defp];
  }
  return [s, defp];
}
