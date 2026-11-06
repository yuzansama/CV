# CV intro video

A 36-second, 1920×1080 intro for the CV site and LinkedIn, written as React code with
[Remotion](https://www.remotion.dev/). No After Effects: every frame comes from `src/CvIntro.jsx`.

Scenes: intro → legacy ETL graph turning into PySpark → parity check (demo numbers) →
numbers from real work → projects → contact. Same palette as the site.

```bash
cd video
npm ci
npm run studio            # live preview in the browser
npm run render            # out/cv-intro.mp4
npm run poster            # out/cv-intro-poster.jpg
npm run publish-to-site   # copy both into ../assets/ (the site plays assets/cv-intro.mp4)
```

GitHub Actions (`.github/workflows/render-video.yml`) renders the video on every change under `video/`
and on demand (Actions → render-video → Run workflow). The MP4 is attached to the run as an artifact.

Remotion is free for individuals and companies of up to 3 people; larger companies need a company license.
