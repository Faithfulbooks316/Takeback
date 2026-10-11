# Takeback

Takeback is a small, offline-friendly marketing command cookbook for Termux. It includes 20 editable Bash recipes with implementation notes, plus copy and download actions. It is a static web app: it does not run shell commands, store credentials, or send data to an AI service.

## Run in Termux

```sh
pkg install python git
git clone <your-repository-url> takeback
cd takeback
python3 -m http.server 8000
```

Open `http://127.0.0.1:8000` in the phone's browser. Python's built-in HTTP server serves the static files. If Node.js/npm is already installed, `npm run dev` starts the same server. You can also open `index.html` directly, though some browsers restrict local-file features.

## Use a recipe

Choose a recipe, review and edit its script in the editor, then copy or download it. To run a downloaded script in Termux, inspect it first:

```sh
less ./recipe.sh
bash ./recipe.sh
```

Recipes may create files or make network requests as noted in their implementation notes. Nothing runs from the browser. Adapt paths, inputs, and safeguards for your own workflow before scheduling scripts.

## Automation and integrations

- **Scheduling:** Install `cronie` in Termux, start its service with `sv up crond` (after installing/configuring `termux-services`), and edit your crontab with `crontab -e`. Keep jobs in Termux's private home directory; Android may pause background work. Validate a recipe manually before scheduling it.
- **Kron CLI:** The upstream `kroniar/kron` project describes itself as early development, with a Cobra CLI foundation and an example YAML command. This cookbook does not invent Kron scheduling or arbitrary-shell subcommands. Check the installed Kron version's `kron --help` and upstream docs before integrating a recipe; use Termux `crond` for scheduling unless your Kron build documents a supported scheduler.
- **GitHub Copilot CLI and Ollama:** Use either as an optional drafting aid to adapt a recipe. Review generated commands line by line and run them manually; Takeback does not call either tool or execute generated output.
- **Netlify:** The app is plain static HTML/CSS/JavaScript and can be deployed as a static site. For example, install Netlify CLI separately and run `netlify deploy --dir .` for a preview or `netlify deploy --prod --dir .` for production after authenticating. Do not publish private scripts or secrets.

## Development

```sh
python3 -m http.server 8000
```

There are no runtime or build dependencies. `npm run dev` is an optional shortcut when Node.js/npm is installed. The recipe catalog lives in `app.js`; the app can be hosted by any static file server.
