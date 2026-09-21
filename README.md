# Wheel of Names

A self-contained, single-page wheel-spinner. Add names, hit spin, get a winner.
Pure HTML/CSS/JS — no build step, no backend, no dependencies to install.

## Files

```
wheel-of-names/
├── index.html
├── style.css
├── script.js
├── README.md
└── .github/
    └── workflows/
        └── static.yml   ← auto-deploys the site to GitHub Pages on every push
```

## How the rig works

There's no visible "rig" control anywhere on the page. It lives in a hidden
**Advanced Options** panel that only opens if you:

- tap/click the page title **5 times within 2 seconds**, or
- press **Ctrl+Alt+A** (desktop keyboard shortcut)

Inside that panel, a couple of the toggles (spin duration, tick sound,
confetti) are genuinely just normal settings. One checkbox, labeled
**"Enable advanced randomization engine,"** is the actual rig switch, and the
**"Custom seed entries"** box below it is where you type the names you want
to control. Line them up, one name per line — spelling has to match a name
that's also in the main wheel.

What happens when you hit **Spin**:

| Seed list | Switch | Result |
|---|---|---|
| empty | doesn't matter | fully random draw, every name has an equal shot |
| has names | **off** | those names have a **0%** chance of winning — random among everyone else |
| has names | **on** | those names have the **only** chance of winning — random among just them (100% combined) |

If the switch is on but none of the seeded names are currently on the wheel
(e.g. you removed them), it falls back to a normal fair draw rather than
breaking.

Everything is stored in the browser's `localStorage`, so your name list and
your seed list both persist across page reloads on the same device.

**Worth knowing:** this is a static, client-side site. Anyone who opens
their browser's dev tools (or view-source) can read `script.js` and see
exactly how the rig logic works, and could in principle inspect
`localStorage` to see the seed list. Treat it as a fun/prank tool for
friends, streams, classroom demos, etc. — not as something to rely on for
draws where a technically curious participant could check under the hood.

## Hosting it on GitHub Pages (from your phone)

You don't need to unzip or upload a folder as one unit — browsers can't do
that anyway. Instead, create each file individually straight on github.com;
it takes about five minutes.

1. **Create a new repository.** On github.com, tap the **+** in the top
   right → **New repository**. Give it a name like `wheel-of-names`, set it
   to Public (required for free GitHub Pages), and create it *without* a
   README (so the first commit below doesn't conflict).

2. **Add `index.html`.** In the new repo, tap **Add file → Create new
   file**. In the "Name your file" box, type `index.html`, then paste in
   the contents of `index.html` below it. Commit directly to `main`.

3. **Repeat for `style.css` and `script.js`.** Same steps — create the
   file by name, paste its contents, commit.

4. **Add the workflow file.** Tap **Add file → Create new file** again,
   but this time type the *full path* in the name box:
   `.github/workflows/static.yml`. GitHub will automatically create the
   `.github` and `workflows` folders for you. Paste in the workflow
   contents, commit.

5. **Turn on GitHub Pages.** Go to the repo's **Settings → Pages**. Under
   "Build and deployment," set **Source** to **GitHub Actions**.

6. **Wait for the deploy.** Go to the **Actions** tab — you should see the
   "Deploy static site to GitHub Pages" workflow running (triggered by
   your last commit). Once it's green, go back to **Settings → Pages** and
   you'll see your live URL, something like:
   `https://your-username.github.io/wheel-of-names/`

From then on, any time you edit a file in the repo (even directly in the
GitHub mobile browser) and commit to `main`, the site redeploys
automatically.

## Local preview (optional, if you're on a computer later)

No build tools needed — any static file server works, e.g.:

```
npx serve .
```

or just open `index.html` directly in a browser.
