# Bagus Budi Laksono — Interactive CV

Interactive CV website plus an updated printable CV.

| File | What it is |
|---|---|
| `index.html`, `assets/` | Interactive CV site (static, no build step) |
| `cv.html` | Print-first, ATS-friendly CV (source of the PDF) |
| `cv_bagus_budi_laksono_2026.pdf` | Updated CV, generated from `cv.html` |
| `cv_bagus_budi_laksono_etl.pdf` | Previous CV (kept for reference) |

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publish with GitHub Pages

Repository **Settings → Pages → Build and deployment → Deploy from a branch**, pick the branch and `/ (root)`.
The site will be served at `https://yuzansama.github.io/CV/`.

## Regenerate the PDF

Open `cv.html` in Chrome → Print → *Save as PDF* (A4, margins: default), or with Playwright:

```js
await page.goto('http://localhost:8000/cv.html', { waitUntil: 'networkidle' });
await page.pdf({ path: 'cv_bagus_budi_laksono_2026.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
```

## Editing content

- Text for experience, projects and skills lives directly in `index.html` (and `cv.html` for the PDF).
- The legacy-graph → PySpark walkthrough (code, legacy snippets, notes) and the migration playbook live in `assets/main.js` (`CODE`, `STEPS`, `PLAYBOOK`).
- The walkthrough uses a generic, illustrative schema only. Keep client names, feed names and internal paths out of it (NDA).
