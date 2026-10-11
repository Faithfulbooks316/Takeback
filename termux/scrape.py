#!/usr/bin/env python3
"""Local Termux helper: scrape a page (stdlib only) and optionally nmap its host.
Usage: python scrape.py https://example.com [--nmap]   (pkg install python nmap)
Only scan hosts you are authorised to test."""
import re, subprocess, sys, urllib.request
from urllib.parse import urlparse, urljoin

url = sys.argv[1]
html = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Takeback"}), timeout=10).read().decode("utf8", "replace")
t = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
print("Title:", t.group(1).strip() if t else "")
for h in sorted(set(re.findall(r'<a\b[^>]*href=["\']([^"\']+)', html, re.I))):
    print(urljoin(url, h))
if "--nmap" in sys.argv:
    subprocess.run(["nmap", "-T4", "-F", urlparse(url).hostname])
