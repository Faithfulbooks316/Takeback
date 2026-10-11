const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u) ? esc(u) : "#");

document.querySelectorAll(".tabs button").forEach((b) => b.onclick = () => {
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
  ["scrape", "nmap"].forEach((id) => $("#" + id).classList.toggle("hidden", id !== b.dataset.tab));
});

$("#sform").onsubmit = async (e) => {
  e.preventDefault();
  const out = $("#sout");
  out.innerHTML = "<p>Scraping…</p>";
  try {
    const r = await fetch("/api/scrape?url=" + encodeURIComponent($("#url").value.trim()));
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Request failed");
    out.innerHTML =
      `<h2>${esc(d.title) || "(no title)"}</h2><p>HTTP ${d.status} — ${esc(d.url)}</p>` +
      `<h2>Meta</h2><ul>${Object.entries(d.meta).map(([k, v]) => `<li><b>${esc(k)}</b>: ${esc(v)}</li>`).join("")}</ul>` +
      `<h2>Headings (${d.headings.length})</h2><ul>${d.headings.map((h) => `<li>${h.level}: ${esc(h.text)}</li>`).join("")}</ul>` +
      `<h2>Links (${d.links.length})</h2><ul>${d.links.map((l) => `<li><a href="${safeUrl(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.text || l.url)}</a></li>`).join("")}</ul>` +
      `<h2>Images (${d.images.length})</h2><div class="thumbs">${d.images.slice(0, 60).map((i) => `<img loading="lazy" src="${safeUrl(i.url)}" alt="${esc(i.alt)}">`).join("")}</div>` +
      `<p><button class="alt" id="json">Download JSON</button></p>`;
    $("#json").onclick = () => save("scrape.json", JSON.stringify(d, null, 2), "application/json");
  } catch (err) {
    out.innerHTML = `<p class="err">${esc(err.message)}</p>`;
  }
};

function save(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const shq = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
function build() {
  const t = $("#target").value.trim();
  // Target is shell-quoted; extra flags are user-supplied options for their own device.
  return ["nmap", $("#profile").value, $("#extra").value.trim(), t ? shq(t) : "<target>"].filter(Boolean).join(" ");
}
const refresh = () => ($("#cmd").textContent = build());
["#target", "#profile", "#extra"].forEach((s) => $(s).addEventListener("input", refresh));
refresh();
$("#copy").onclick = () => navigator.clipboard.writeText(build());
$("#dl").onclick = () => save("scan.sh", `#!/data/data/com.termux/files/usr/bin/bash\n# pkg install nmap\n${build()} -oX scan.xml\n`, "text/x-shellscript");
