const recipes = [
  {
    id: "workspace",
    title: "Set up a marketing workspace",
    category: "Get organized",
    description: "Create a tidy home for campaign assets, drafts, and reports.",
    notes: "Creates directories under your Termux home folder and leaves existing files untouched.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

WORKSPACE="\${HOME}/marketing"
mkdir -p "$WORKSPACE"/{campaigns,content,assets,reports}
printf 'Workspace ready: %s\\n' "$WORKSPACE"
`
  },
  {
    id: "campaign-brief",
    title: "Draft a campaign brief",
    category: "Plan & publish",
    description: "Turn a few campaign details into a reusable Markdown brief.",
    notes: "Edit the defaults before running. The output is written to a dated file in your marketing folder.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

NAME="\${CAMPAIGN_NAME:-New campaign}"
AUDIENCE="\${TARGET_AUDIENCE:-Describe your audience}"
GOAL="\${CAMPAIGN_GOAL:-Describe the desired outcome}"
OUT="\${HOME}/marketing/campaigns"
mkdir -p "$OUT"
FILE="$OUT/brief-$(date +%F).md"
cat > "$FILE" <<EOF
# $NAME

- Date: $(date +%F)
- Audience: $AUDIENCE
- Goal: $GOAL
- Offer:
- Message:
- Channels:
- Success measure:
- Owner:
- Review date:
EOF
printf 'Brief created: %s\\n' "$FILE"
`
  },
  {
    id: "utm-builder",
    title: "Build a tagged campaign URL",
    category: "Measure & learn",
    description: "Add UTM parameters to a destination URL with a tiny Python helper.",
    notes: "Requires Python 3. Set URL, SOURCE, MEDIUM, and CAMPAIGN before running. Review the output URL before sharing it.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

: "\${URL:?Set URL to the destination, e.g. https://example.com/page}"
: "\${SOURCE:?Set SOURCE, e.g. newsletter}"
: "\${MEDIUM:?Set MEDIUM, e.g. email}"
: "\${CAMPAIGN:?Set CAMPAIGN, e.g. spring_launch}"
python3 - "$URL" "$SOURCE" "$MEDIUM" "$CAMPAIGN" <<'PY'
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

url, source, medium, campaign = sys.argv[1:]
parts = urlsplit(url)
if parts.scheme not in ("http", "https") or not parts.netloc:
    raise SystemExit("URL must be an absolute http(s) URL")
query = dict(parse_qsl(parts.query, keep_blank_values=True))
query.update(utm_source=source, utm_medium=medium, utm_campaign=campaign)
print(urlunsplit(parts._replace(query=urlencode(query))))
PY
`
  },
  {
    id: "calendar",
    title: "Start a content calendar",
    category: "Plan & publish",
    description: "Create a spreadsheet-friendly content calendar starter.",
    notes: "Writes a sample CSV only when the destination file does not already exist.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

OUT="\${HOME}/marketing/content/calendar.csv"
mkdir -p "$(dirname "$OUT")"
if [ -e "$OUT" ]; then
  printf 'Keeping existing calendar: %s\\n' "$OUT"
  exit 0
fi
cat > "$OUT" <<'CSV'
publish_date,channel,topic,format,owner,status,link
YYYY-MM-DD,blog,Starter topic,article,me,draft,
YYYY-MM-DD,social,Share a useful tip,post,me,idea,
CSV
printf 'Calendar created: %s\\n' "$OUT"
`
  },
  {
    id: "social-queue",
    title: "Queue a social post draft",
    category: "Plan & publish",
    description: "Append a draft to a simple tab-separated publishing queue.",
    notes: "Pass a channel and post text as arguments. The script stores drafts locally; it does not publish them.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 CHANNEL 'Post text'" >&2
  exit 2
fi
OUT="\${HOME}/marketing/content/social-queue.tsv"
mkdir -p "$(dirname "$OUT")"
if [ ! -e "$OUT" ]; then
  printf 'created_at\\tchannel\\tstatus\\tpost\\n' > "$OUT"
fi
printf '%s\\t%s\\tdraft\\t%s\\n' "$(date -Is)" "$1" "$2" >> "$OUT"
printf 'Draft queued in %s\\n' "$OUT"
`
  },
  {
    id: "keyword-groups",
    title: "Group keyword ideas",
    category: "Make & optimize",
    description: "Normalize a keyword list and group terms by their first word.",
    notes: "Put one phrase per line in keywords.txt. This is a rough sorting aid, not search-volume research.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

INPUT="\${1:-keywords.txt}"
OUT="\${2:-keyword-groups.tsv}"
if [ ! -f "$INPUT" ]; then
  echo "Create $INPUT with one keyword per line first." >&2
  exit 1
fi
awk '
  NF {
    phrase = tolower($0)
    sub(/^[[:space:]]+/, "", phrase)
    sub(/[[:space:]]+$/, "", phrase)
    gsub(/[[:space:]]+/, " ", phrase)
    split(phrase, words, " ")
    print words[1] "\\t" phrase
  }
' "$INPUT" | sort -f -o "$OUT"
printf 'Keyword groups saved to %s\\n' "$OUT"
`
  },
  {
    id: "link-audit",
    title: "Check a list of campaign links",
    category: "Measure & learn",
    description: "Check HTTP response codes for URLs in a text file.",
    notes: "Requires curl and network access. Uses HEAD requests; some hosts reject them, so verify reported failures in a browser.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

INPUT="\${1:-urls.txt}"
if ! command -v curl >/dev/null 2>&1; then
  echo "Install curl first: pkg install curl" >&2
  exit 1
fi
if [ ! -f "$INPUT" ]; then
  echo "Create $INPUT with one http(s) URL per line." >&2
  exit 1
fi
while IFS= read -r url || [ -n "$url" ]; do
  [ -z "$url" ] && continue
  case "$url" in http://*|https://*) ;; *) printf 'SKIP\\t%s\\n' "$url"; continue ;; esac
  code="$(curl -L -sS -o /dev/null -w '%{http_code}' --max-time 15 -I "$url" || true)"
  printf '%s\\t%s\\n' "$code" "$url"
done < "$INPUT"
`
  },
  {
    id: "sitemap-check",
    title: "Inspect a sitemap",
    category: "Make & optimize",
    description: "Fetch a sitemap and count its listed page locations.",
    notes: "Requires curl. Downloads the sitemap into a temporary file and removes it when finished.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

: "\${SITEMAP_URL:?Set SITEMAP_URL to your sitemap URL}"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
curl -fsSL --max-time 30 "$SITEMAP_URL" -o "$tmp"
count="$(grep -c '<loc>' "$tmp" || true)"
printf 'Sitemap: %s\\nPage locations: %s\\n' "$SITEMAP_URL" "$count"
grep '<loc>' "$tmp" | head -n 10 || true
`
  },
  {
    id: "launch-checklist",
    title: "Make a launch checklist",
    category: "Plan & publish",
    description: "Generate a dated checklist for your next campaign launch.",
    notes: "Creates a Markdown checklist you can edit or share with your team.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

OUT="\${HOME}/marketing/campaigns"
mkdir -p "$OUT"
FILE="$OUT/launch-checklist-$(date +%F).md"
cat > "$FILE" <<'CHECKLIST'
# Campaign launch checklist

- [ ] Confirm audience, offer, and call to action
- [ ] Proofread copy and verify brand details
- [ ] Test every link and UTM tag
- [ ] Check mobile layout and accessibility
- [ ] Confirm approvals and publishing schedule
- [ ] Verify analytics events and reporting owner
- [ ] Save final assets and note the launch time
- [ ] Review results and record learnings
CHECKLIST
printf 'Checklist created: %s\\n' "$FILE"
`
  },
  {
    id: "metrics-summary",
    title: "Summarize campaign metrics",
    category: "Measure & learn",
    description: "Calculate totals and a click-through rate from a simple CSV export.",
    notes: "Input CSV must have a header and columns named impressions and clicks (lowercase, unquoted). This intentionally uses a small CSV format; use a spreadsheet for quoted or complex CSV files.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

INPUT="\${1:-metrics.csv}"
if [ ! -f "$INPUT" ]; then
  echo "Usage: $0 metrics.csv (header must include impressions,clicks)" >&2
  exit 1
fi
awk -F, '
  NR == 1 {
    for (i = 1; i <= NF; i++) {
      if ($i == "impressions") impressions = i
      if ($i == "clicks") clicks = i
    }
    if (!impressions || !clicks) {
      print "Missing impressions or clicks column" > "/dev/stderr"
      exit 2
    }
    next
  }
  NF >= impressions && NF >= clicks {
    total_i += $impressions
    total_c += $clicks
  }
  END {
    if (total_i > 0)
      printf "Impressions: %.0f\\nClicks: %.0f\\nCTR: %.2f%%\\n", total_i, total_c, total_c / total_i * 100
    else if (NR > 1)
      print "No positive impressions to summarize"
  }
' "$INPUT"
`
  },
  {
    id: "email-hygiene",
    title: "Tidy an email list",
    category: "Make & optimize",
    description: "Lowercase, validate, and deduplicate a one-address-per-line list.",
    notes: "Keeps syntactically simple addresses only; this does not verify consent, ownership, or deliverability. Protect personal data and comply with applicable marketing rules.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

INPUT="\${1:-emails.txt}"
OUT="\${2:-emails-clean.txt}"
if [ ! -f "$INPUT" ]; then
  echo "Create $INPUT with one email address per line." >&2
  exit 1
fi
awk '
  {
    email = tolower($0)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", email)
    if (email ~ /^[^ @]+@[^ @.]+([.][^ @.]+)+$/) print email
  }
' "$INPUT" | sort -u > "$OUT"
printf 'Simple, deduplicated addresses saved to %s\\n' "$OUT"
`
  },
  {
    id: "dedupe-leads",
    title: "Deduplicate exported leads",
    category: "Make & optimize",
    description: "Remove exact duplicate rows from a plain-text lead export.",
    notes: "Sorts the entire file, so original row order is not retained. For CSV data, export one unique identifier per line first; protect personal data.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

INPUT="\${1:-leads.txt}"
OUT="\${2:-leads-unique.txt}"
if [ ! -f "$INPUT" ]; then
  echo "Usage: $0 input.txt [output.txt]" >&2
  exit 1
fi
sort -u "$INPUT" > "$OUT"
printf 'Unique rows saved to %s\\n' "$OUT"
`
  },
  {
    id: "utm-report",
    title: "Find UTM-tagged links",
    category: "Measure & learn",
    description: "Extract unique URLs containing UTM parameters from a text export.",
    notes: "Works with plain text containing URLs (such as a campaign export); this is not a full CSV parser.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

INPUT="\${1:-campaign-export.txt}"
OUT="\${2:-tagged-links.txt}"
if [ ! -f "$INPUT" ]; then
  echo "Usage: $0 export.txt [tagged-links.txt]" >&2
  exit 1
fi
grep -Eo 'https?://[^[:space:]\"<>]+' "$INPUT" | grep -E '[?&]utm_' | sort -u > "$OUT" || true
printf 'Tagged links saved to %s\\n' "$OUT"
`
  },
  {
    id: "repurpose-prompt",
    title: "Create a content repurposing brief",
    category: "Plan & publish",
    description: "Prepare a reviewable brief for adapting one source into multiple formats.",
    notes: "Creates a prompt document only; it does not send content to Copilot CLI, Ollama, or another AI service.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

OUT="\${HOME}/marketing/content"
mkdir -p "$OUT"
FILE="$OUT/repurpose-brief-$(date +%F).md"
cat > "$FILE" <<'BRIEF'
# Content repurposing brief

Source URL or file:
Audience:
Core idea:
Required facts and links to preserve:
Tone and accessibility needs:

## Draft formats
- Short social post:
- Newsletter intro:
- Short video outline:
- FAQ:

Review every claim, link, and generated draft before publishing.
BRIEF
printf 'Brief created: %s\\n' "$FILE"
`
  },
  {
    id: "feedback-request",
    title: "Draft a customer feedback request",
    category: "Plan & publish",
    description: "Create a concise, editable feedback email draft.",
    notes: "Writes a template locally. Add a clear opt-out where required and send only to people who have an appropriate basis to receive it.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

OUT="\${HOME}/marketing/content"
mkdir -p "$OUT"
FILE="$OUT/feedback-request-$(date +%F).txt"
cat > "$FILE" <<'EMAIL'
Subject: Could you share a quick thought?

Hi [Name],

We're improving [product or experience] and would value your perspective.
If you have a moment, what worked well—and what could be better?
[Feedback link]

Thank you,
[Name / team]

Please adapt this draft to your audience and applicable consent requirements.
EMAIL
printf 'Draft created: %s\\n' "$FILE"
`
  },
  {
    id: "page-change-watch",
    title: "Compare a public page snapshot",
    category: "Measure & learn",
    description: "Save a text snapshot of a public page and compare it with the previous run.",
    notes: "Requires curl and sha256sum. Fetches only the URL you provide; check the site's terms and avoid pages containing private data.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

: "\${PAGE_URL:?Set PAGE_URL to a public page URL}"
command -v curl >/dev/null || { echo "Install curl: pkg install curl" >&2; exit 1; }
command -v sha256sum >/dev/null || { echo "Install coreutils: pkg install coreutils" >&2; exit 1; }
DIR="\${HOME}/marketing/watch"
mkdir -p "$DIR"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
curl -fsSL --max-time 30 "$PAGE_URL" -o "$tmp"
hash="$(sha256sum "$tmp" | cut -d ' ' -f 1)"
previous="$DIR/$(printf '%s' "$PAGE_URL" | sha256sum | cut -c1-16).sha256"
if [ -f "$previous" ] && [ "$(cat "$previous")" != "$hash" ]; then
  printf 'Page changed: %s\\n' "$PAGE_URL"
elif [ -f "$previous" ]; then
  printf 'No change detected.\\n'
else
  printf 'First snapshot recorded.\\n'
fi
printf '%s\\n' "$hash" > "$previous"
`
  },
  {
    id: "asset-archive",
    title: "Archive campaign files",
    category: "Get organized",
    description: "Create a dated compressed archive of a campaign folder.",
    notes: "Requires tar. Archives files without deleting the originals. Avoid including credentials or private customer data.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

SOURCE="\${1:-\${HOME}/marketing/campaigns}"
OUT="\${2:-\${HOME}/marketing/archives}"
if [ ! -d "$SOURCE" ]; then
  echo "Folder not found: $SOURCE" >&2
  exit 1
fi
mkdir -p "$OUT"
archive="$OUT/campaigns-$(date +%F-%H%M%S).tar.gz"
tar -czf "$archive" -C "$SOURCE" .
printf 'Archive created: %s\\n' "$archive"
`
  },
  {
    id: "html-link",
    title: "Create a campaign link snippet",
    category: "Make & optimize",
    description: "Generate a small HTML link snippet for a landing page or email.",
    notes: "Set LABEL and DESTINATION. Review the generated HTML and escape special characters before embedding untrusted text.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

: "\${LABEL:?Set LABEL to the link text}"
: "\${DESTINATION:?Set DESTINATION to an http(s) URL}"
case "$DESTINATION" in http://*|https://*) ;; *) echo "Destination must start with http:// or https://" >&2; exit 2 ;; esac
printf '<a href="%s">%s</a>\\n' "$DESTINATION" "$LABEL"
`
  },
  {
    id: "weekly-digest",
    title: "Write a weekly work log",
    category: "Measure & learn",
    description: "Append a dated reflection prompt to your marketing work log.",
    notes: "Appends a new section each time it runs. Set LOG_PATH to choose a different private file location.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

LOG_PATH="\${LOG_PATH:-\${HOME}/marketing/reports/weekly-log.md}"
mkdir -p "$(dirname "$LOG_PATH")"
cat >> "$LOG_PATH" <<EOF

## Week of $(date +%F)

- Shipped:
- Best-performing content:
- Audience questions:
- What to improve:
- Next week's focus:
EOF
printf 'Log updated: %s\\n' "$LOG_PATH"
`
  },
  {
    id: "netlify-preview",
    title: "Deploy a Netlify preview",
    category: "Plan & publish",
    description: "Preview a static site deployment after a confirmation prompt.",
    notes: "Requires Netlify CLI, a linked site, and authentication. This creates a preview deploy—not production. Inspect the directory and output before sharing the preview URL.",
    script: `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

SITE_DIR="\${1:-.}"
if ! command -v netlify >/dev/null 2>&1; then
  echo "Install and authenticate Netlify CLI before running this recipe." >&2
  exit 1
fi
if [ ! -d "$SITE_DIR" ]; then
  echo "Directory not found: $SITE_DIR" >&2
  exit 1
fi
printf 'Deploy preview for %s? [y/N] ' "$SITE_DIR"
read -r answer
case "$answer" in [yY]|[yY][eE][sS]) ;; *) echo "Cancelled."; exit 0 ;; esac
netlify deploy --dir "$SITE_DIR"
`
  }
];

const categories = ["All", ...new Set(recipes.map((recipe) => recipe.category))];
const recipeList = document.querySelector("#recipe-list");
const filters = document.querySelector("#filters");
const count = document.querySelector("#recipe-count");
const search = document.querySelector("#search");
const emptyState = document.querySelector("#empty-state");
const recipeView = document.querySelector("#recipe-view");
const editor = document.querySelector("#script-editor");
const toast = document.querySelector("#toast");
let activeCategory = "All";
let selectedRecipe = null;
let toastTimeout;

function visibleRecipes() {
  const query = search.value.trim().toLowerCase();
  return recipes.filter((recipe) => {
    const matchesCategory = activeCategory === "All" || recipe.category === activeCategory;
    const matchesQuery = !query || `${recipe.title} ${recipe.category} ${recipe.description}`.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
}

function renderFilters() {
  filters.replaceChildren();
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = `filter${category === activeCategory ? " active" : ""}`;
    button.type = "button";
    button.textContent = category;
    button.setAttribute("aria-pressed", String(category === activeCategory));
    button.addEventListener("click", () => {
      activeCategory = category;
      renderFilters();
      renderRecipes();
    });
    filters.append(button);
  });
}

function renderRecipes() {
  const matches = visibleRecipes();
  recipeList.replaceChildren();
  count.textContent = `${matches.length} ${matches.length === 1 ? "recipe" : "recipes"}`;
  matches.forEach((recipe, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `recipe-card${selectedRecipe === recipe ? " selected" : ""}`;
    button.setAttribute("aria-pressed", String(selectedRecipe === recipe));
    const number = document.createElement("span");
    number.className = "recipe-number";
    number.textContent = String(recipes.indexOf(recipe) + 1).padStart(2, "0");
    const details = document.createElement("span");
    details.className = "recipe-card-copy";
    const title = document.createElement("span");
    title.className = "recipe-card-title";
    title.textContent = recipe.title;
    const category = document.createElement("span");
    category.className = "recipe-card-category";
    category.textContent = recipe.category;
    details.append(title, category);
    const arrow = document.createElement("span");
    arrow.className = "recipe-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    button.append(number, details, arrow);
    button.addEventListener("click", () => selectRecipe(recipe));
    recipeList.append(button);
    if (index === 0 && matches.length === 0) button.hidden = true;
  });
  if (!matches.length) {
    const message = document.createElement("p");
    message.className = "no-results";
    message.textContent = "No recipes match. Try another search.";
    recipeList.append(message);
  }
}

function selectRecipe(recipe) {
  selectedRecipe = recipe;
  document.querySelector("#recipe-category").textContent = recipe.category.toUpperCase();
  document.querySelector("#recipe-title").textContent = recipe.title;
  document.querySelector("#recipe-description").textContent = recipe.description;
  document.querySelector("#recipe-notes").textContent = recipe.notes;
  editor.value = recipe.script;
  emptyState.hidden = true;
  recipeView.hidden = false;
  renderRecipes();
  if (window.matchMedia("(max-width: 760px)").matches) {
    recipeView.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

async function copyScript() {
  try {
    await navigator.clipboard.writeText(editor.value);
  } catch {
    editor.focus();
    editor.select();
    if (!document.execCommand("copy")) {
      showToast("Copy not available here — select the script to copy.");
      return;
    }
  }
  showToast("Script copied to clipboard.");
}

document.querySelector("#copy-button").addEventListener("click", copyScript);
document.querySelector("#reset-button").addEventListener("click", () => {
  if (!selectedRecipe) return;
  editor.value = selectedRecipe.script;
  showToast("Recipe restored.");
});
document.querySelector("#download-button").addEventListener("click", () => {
  if (!selectedRecipe) return;
  const blob = new Blob([editor.value], { type: "text/x-shellscript;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `takeback-${selectedRecipe.id}.sh`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Script downloaded.");
});
search.addEventListener("input", renderRecipes);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== search && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    search.focus();
  }
  if (event.key === "Escape" && document.activeElement === search) search.blur();
});

renderFilters();
renderRecipes();
