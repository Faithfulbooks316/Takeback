// Netlify function: fetches a public URL and extracts titles, meta, headings, links, images.
const dns = require("dns").promises;
const net = require("net");

const MAX_BYTES = 2 * 1024 * 1024;
const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const l = ip.toLowerCase();
  if (l.startsWith("::ffff:")) return isPrivateIp(l.slice(7));
  return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe8") ||
    l.startsWith("fe9") || l.startsWith("fea") || l.startsWith("feb");
}

async function assertPublic(u) {
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) URLs are allowed");
  const addrs = await dns.lookup(u.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error("Private/internal addresses are blocked");
  }
}

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const strip = (s) => decode(s.replace(/<[^>]*>/g, ""));
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? "") : "";
};
const abs = (href, base) => { try { return new URL(href, base).href; } catch { return null; } };

function parse(html, base) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const meta = {};
  for (const t of html.match(/<meta\b[^>]*>/gi) || []) {
    const k = attr(t, "name") || attr(t, "property");
    if (k) meta[k] = attr(t, "content");
  }
  const headings = [];
  for (const m of html.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = strip(m[2]);
    if (text) headings.push({ level: m[1].toLowerCase(), text });
  }
  const links = [];
  const seen = new Set();
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const url = abs(attr(m[1], "href"), base);
    if (url && /^https?:/.test(url) && !seen.has(url)) {
      seen.add(url);
      links.push({ url, text: strip(m[2]).slice(0, 120) });
    }
  }
  const images = [];
  for (const t of html.match(/<img\b[^>]*>/gi) || []) {
    const url = abs(attr(t, "src"), base);
    if (url && /^https?:/.test(url)) images.push({ url, alt: attr(t, "alt") });
  }
  return { title: title ? strip(title) : "", meta, headings, links, images };
}

exports.handler = async (event) => {
  const target = (event.queryStringParameters || {}).url;
  if (!target) return json(400, { error: "Missing ?url=" });
  try {
    let u = new URL(/^https?:\/\//i.test(target) ? target : "https://" + target);
    let res;
    for (let i = 0; i < 4; i++) {
      await assertPublic(u);
      res = await fetch(u, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "TakebackScraper/1.0" },
      });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) { u = new URL(loc, u); continue; }
      break;
    }
    if (res.status >= 300 && res.status < 400) throw new Error("Too many redirects");
    const buf = Buffer.from(await res.arrayBuffer()).subarray(0, MAX_BYTES);
    const data = parse(buf.toString("utf8"), u.href);
    return json(200, { url: u.href, status: res.status, ...data });
  } catch (e) {
    return json(502, { error: String(e.message || e) });
  }
};
