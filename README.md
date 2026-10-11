# Takeback

Web scraper + nmap command builder with an acid-drip teal/blue UI.

- `public/` – static front end
- `netlify/functions/scrape.js` – serverless scraper (blocks private/internal IPs)
- `termux/scrape.py` – local scraper/nmap helper for Termux

## Deploy
Push to GitHub, then Netlify → *Add new site → Import* (settings come from `netlify.toml`). Or `npx netlify deploy --prod`.

## Termux / Zenmap
Netlify cannot run nmap. The **Nmap Builder** tab generates commands/scripts to run in Termux (`pkg install nmap`); save XML with `-oX scan.xml` to open in Zenmap. Only scan systems you are authorised to test.
